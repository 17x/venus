import type {
  EngineCameraCommand,
  EngineCameraFrameBounds,
  EngineCameraPreset,
  EngineCameraProjectionMode,
  EngineCameraState,
} from "./cameraCommandProtocol";

const DEFAULT_PROJECTION_MODE: EngineCameraProjectionMode = "perspective";
const DEFAULT_PERSPECTIVE_FOV_Y = 50;
const DEFAULT_PROJECTION_NEAR = 0.1;
const DEFAULT_PROJECTION_FAR = 5000;
const DEFAULT_ORTHOGRAPHIC_HALF_SIZE = 600;

/** Declares configuration for the engine camera controller. */
export type EngineCameraControllerOptions = {
  /** Initial camera state used to seed current and target values. */
  initialState: EngineCameraState;
  /** Scheduler used to drive camera smoothing without binding to browser globals. */
  scheduler: EngineCameraControllerScheduler;
  /** Called whenever camera state changes after smoothing integration. */
  onCameraStateChanged: (state: EngineCameraState) => void;
  /** Called when camera state changed and a render should be queued. */
  onRenderRequested: () => Promise<void>;
};

/** Declares scheduler contract required by camera controller animation loop. */
export type EngineCameraControllerScheduler = {
  /** Requests one frame callback and returns a scheduler handle. */
  requestFrame: (callback: () => void) => number;
  /** Cancels one previously requested frame callback by handle. */
  cancelFrame: (handle: number) => void;
};

/** Declares the public surface of the engine camera controller. */
export type EngineCameraController = {
  /** Returns the latest committed camera state. */
  getState: () => EngineCameraState;
  /** Applies one semantic camera command and schedules smoothing/render. */
  applyCommand: (command: EngineCameraCommand) => void;
  /** Replaces camera state explicitly and schedules render synchronization. */
  setState: (state: EngineCameraState) => void;
  /** Cancels pending animation frames and releases controller resources. */
  dispose: () => void;
};

/**
 * Creates a semantic camera controller that accepts command protocol input and owns smoothing/clamping.
 * @param options Controller options carrying state and render callbacks.
 */
export const createEngineCameraController = (
  options: EngineCameraControllerOptions,
): EngineCameraController => {
  let currentState: EngineCameraState = clampCameraState(options.initialState);
  let targetState: EngineCameraState = { ...currentState };
  let rafId: number | null = null;
  let renderQueued = false;

  /**
   * Queues one render request while collapsing concurrent updates into a single async call.
   */
  const queueRender = (): void => {
    if (renderQueued) {
      return;
    }
    renderQueued = true;
    void options.onRenderRequested().finally(() => {
      renderQueued = false;
    });
  };

  /**
   * Schedules one smoothing frame when target and current states are not yet converged.
   */
  const requestSmoothingFrame = (): void => {
    if (rafId !== null) {
      return;
    }
    rafId = options.scheduler.requestFrame(() => {
      rafId = null;
      const nextState = interpolateCameraState(currentState, targetState);
      const clampedNext = clampCameraState(nextState);
      if (!hasCameraDelta(currentState, clampedNext)) {
        currentState = { ...targetState };
        options.onCameraStateChanged(currentState);
        queueRender();
        return;
      }
      currentState = clampedNext;
      options.onCameraStateChanged(currentState);
      queueRender();
      requestSmoothingFrame();
    });
  };

  /**
   * Applies one semantic command to the target camera state and starts smoothing.
   * @param command Semantic camera command produced by the input adapter.
   */
  const applyCommand = (command: EngineCameraCommand): void => {
    targetState = clampCameraState(reduceCameraCommand(targetState, command));
    requestSmoothingFrame();
  };

  /**
   * Replaces camera state directly and schedules a synchronized render.
   * @param state Next full camera state.
   */
  const setState = (state: EngineCameraState): void => {
    targetState = clampCameraState(state);
    requestSmoothingFrame();
  };

  /**
   * Releases pending animation work and resets transient controller resources.
   */
  const dispose = (): void => {
    if (rafId !== null) {
      options.scheduler.cancelFrame(rafId);
      rafId = null;
    }
  };

  options.onCameraStateChanged(currentState);

  return {
    getState: () => ({ ...currentState }),
    applyCommand,
    setState,
    dispose,
  };
};

/**
 * Reduces one semantic command into a next camera target state.
 * @param previousState Previous target camera state.
 * @param command Semantic command emitted by the raw input adapter.
 */
const reduceCameraCommand = (
  previousState: EngineCameraState,
  command: EngineCameraCommand,
): EngineCameraState => {
  if (command.type === "setState") {
    return { ...command.state };
  }
  if (command.type === "setPreset") {
    return resolvePresetCameraState(
      previousState,
      command.preset,
      command.preserveDistance === true,
    );
  }
  if (command.type === "frameBounds") {
    return resolveFramedCameraState(previousState, command.bounds, command.paddingScale);
  }
  if (command.type === "setProjection") {
    return {
      ...previousState,
      projectionMode: command.projectionMode,
      perspectiveFovY: command.perspectiveFovY ?? previousState.perspectiveFovY,
      near: command.near ?? previousState.near,
      far: command.far ?? previousState.far,
      orthographicHalfSize: command.orthographicHalfSize ?? previousState.orthographicHalfSize,
    };
  }
  if (command.type === "setViewport") {
    const aspect = command.width > 0 && command.height > 0
      ? command.width / command.height
      : previousState.aspect ?? 16 / 9;
    // Adjust orthographic half-size to maintain vertical FOV consistency across aspect changes.
    const orthographicHalfSize = previousState.orthographicHalfSize ?? 600;
    const adjustedHalfSize = orthographicHalfSize * (aspect / (previousState.aspect ?? aspect));
    return {
      ...previousState,
      aspect,
      orthographicHalfSize: adjustedHalfSize,
    };
  }
  if (command.type === "orbit") {
    return {
      ...previousState,
      yaw: previousState.yaw + command.deltaYaw,
      pitch: previousState.pitch + command.deltaPitch,
    };
  }
  if (command.type === "pan") {
    return {
      ...previousState,
      targetX: previousState.targetX - command.deltaRight,
      targetY: previousState.targetY + command.deltaUp,
    };
  }
  return {
    ...previousState,
    distance:
      command.zoomFactor > 0
        ? previousState.distance / command.zoomFactor
        : previousState.distance,
  };
};

/**
 * Resolves one canonical camera orientation preset while preserving target continuity.
 * @param previousState Previous camera state used as fallback for distance and target values.
 * @param preset Preset view identifier to apply.
 * @param preserveDistance Whether preset should preserve previous distance value.
 */
const resolvePresetCameraState = (
  previousState: EngineCameraState,
  preset: EngineCameraPreset,
  preserveDistance: boolean,
): EngineCameraState => {
  if (preset === "front") {
    return {
      ...previousState,
      yaw: 0,
      pitch: 0,
      distance: preserveDistance ? previousState.distance : 720,
    };
  }
  if (preset === "top") {
    return {
      ...previousState,
      yaw: 0,
      pitch: -74,
      distance: preserveDistance ? previousState.distance : 720,
    };
  }
  if (preset === "right") {
    return {
      ...previousState,
      yaw: 90,
      pitch: 0,
      distance: preserveDistance ? previousState.distance : 720,
    };
  }
  return {
    ...previousState,
    yaw: 35,
    pitch: -30,
    distance: preserveDistance ? previousState.distance : 760,
  };
};

/**
 * Resolves a framed camera state by centering target and computing one distance from world bounds.
 * @param previousState Previous camera state used to preserve orientation continuity.
 * @param bounds Axis-aligned world bounds packet to fit in the camera frame.
 * @param paddingScale Optional distance expansion factor for frame margin.
 */
const resolveFramedCameraState = (
  previousState: EngineCameraState,
  bounds: EngineCameraFrameBounds,
  paddingScale?: number,
): EngineCameraState => {
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = Math.max(1, bounds.maxY - bounds.minY);
  const spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
  const baseSpan = Math.max(spanX, spanY, spanZ);
  const resolvedPaddingScale =
    typeof paddingScale === "number" && Number.isFinite(paddingScale) && paddingScale > 0
      ? paddingScale
      : 1.18;
  return {
    ...previousState,
    targetX: (bounds.minX + bounds.maxX) * 0.5,
    targetY: (bounds.minY + bounds.maxY) * 0.5,
    targetZ: (bounds.minZ + bounds.maxZ) * 0.5,
    distance: Math.max(360, baseSpan * 2.25 * resolvedPaddingScale),
  };
};

/**
 * Interpolates one camera step from current to target state using fixed smoothing gains.
 * @param current Current committed camera state.
 * @param target Target camera state waiting to be reached.
 */
const interpolateCameraState = (
  current: EngineCameraState,
  target: EngineCameraState,
): EngineCameraState => {
  const smoothing = 0.24;
  return {
    yaw: current.yaw + (target.yaw - current.yaw) * smoothing,
    pitch: current.pitch + (target.pitch - current.pitch) * smoothing,
    distance: current.distance + (target.distance - current.distance) * smoothing,
    targetX: current.targetX + (target.targetX - current.targetX) * smoothing,
    targetY: current.targetY + (target.targetY - current.targetY) * smoothing,
    targetZ: current.targetZ + (target.targetZ - current.targetZ) * smoothing,
    aspect: target.aspect,
    orthographicHalfSize: target.orthographicHalfSize,
  };
};

/**
 * Clamps camera state into deterministic runtime-safe ranges.
 * @param state Candidate camera state before clamping.
 */
const clampCameraState = (state: EngineCameraState): EngineCameraState => {
  const projectionMode =
    state.projectionMode === "perspective" || state.projectionMode === "orthographic"
      ? state.projectionMode
      : DEFAULT_PROJECTION_MODE;
  const perspectiveFovY =
    typeof state.perspectiveFovY === "number" && Number.isFinite(state.perspectiveFovY)
      ? Math.max(10, Math.min(120, state.perspectiveFovY))
      : DEFAULT_PERSPECTIVE_FOV_Y;
  const near =
    typeof state.near === "number" && Number.isFinite(state.near)
      ? Math.max(0.01, state.near)
      : DEFAULT_PROJECTION_NEAR;
  const far =
    typeof state.far === "number" && Number.isFinite(state.far)
      ? Math.max(near + 1, state.far)
      : DEFAULT_PROJECTION_FAR;
  const orthographicHalfSize =
    typeof state.orthographicHalfSize === "number" && Number.isFinite(state.orthographicHalfSize)
      ? Math.max(1, state.orthographicHalfSize)
      : DEFAULT_ORTHOGRAPHIC_HALF_SIZE;
  const aspect =
    typeof state.aspect === "number" && Number.isFinite(state.aspect) && state.aspect > 0
      ? state.aspect
      : undefined;
  return {
    ...state,
    pitch: Math.max(-75, Math.min(75, state.pitch)),
    distance: Math.max(360, Math.min(1800, state.distance)),
    projectionMode,
    perspectiveFovY,
    near,
    far,
    orthographicHalfSize,
    aspect,
  };
};

/**
 * Computes whether two camera states differ above render-relevant thresholds.
 * @param previous Previously committed camera state.
 * @param next Next candidate camera state.
 */
const hasCameraDelta = (previous: EngineCameraState, next: EngineCameraState): boolean => {
  return (
    Math.abs(previous.yaw - next.yaw) > 0.01 ||
    Math.abs(previous.pitch - next.pitch) > 0.01 ||
    Math.abs(previous.distance - next.distance) > 0.1 ||
    Math.abs(previous.targetX - next.targetX) > 0.1 ||
    Math.abs(previous.targetY - next.targetY) > 0.1 ||
    Math.abs(previous.targetZ - next.targetZ) > 0.1
  );
};
