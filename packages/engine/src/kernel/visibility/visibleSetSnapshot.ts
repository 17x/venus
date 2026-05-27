const CAMERA_ANGLE_PRECISION = 3;

/**
 * Declares one deterministic visible-set snapshot for replay and diagnostics.
 * Captures which nodes were visible in one frame so replay tooling can
 * validate deterministic rendering without re-running the full pipeline.
 */
export interface EngineVisibleSetSnapshot {
  /** Frame sequence number for ordering. */
  frameId: number;
  /** Timestamp when the snapshot was captured. */
  timestamp: number;
  /** Deterministically sorted visible node ids. */
  visibleNodeIds: readonly string[];
  /** Camera state hash at the time of capture. */
  cameraStateHash: string;
  /** Render path used for this frame. */
  renderPath: "model-complete" | "packet" | "none";
  /** Total draw call count for this frame. */
  drawCallCount: number;
}

/**
 * Computes a stable hash string from camera state for snapshot correlation.
 * @param yaw Camera yaw.
 * @param pitch Camera pitch.
 * @param distance Camera distance.
 * @param targetX Camera target x.
 * @param targetY Camera target y.
 * @param targetZ Camera target z.
 */
export function computeCameraStateHash(
  yaw: number, pitch: number, distance: number,
  targetX: number, targetY: number, targetZ: number,
): string {
  return [
    yaw.toFixed(CAMERA_ANGLE_PRECISION),
    pitch.toFixed(CAMERA_ANGLE_PRECISION),
    distance.toFixed(1),
    targetX.toFixed(1),
    targetY.toFixed(1),
    targetZ.toFixed(1),
  ].join(":");
}

/**
 * Creates an empty visible-set snapshot with zero values.
 * @param frameId Frame sequence number to attach to the empty snapshot.
 */
export function createEmptyVisibleSetSnapshot(frameId: number): EngineVisibleSetSnapshot {
  return {
    frameId,
    timestamp: Date.now(),
    visibleNodeIds: [],
    cameraStateHash: "",
    renderPath: "none",
    drawCallCount: 0,
  };
}
