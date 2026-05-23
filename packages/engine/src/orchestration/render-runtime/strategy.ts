/**
 * Interaction mutation kind consumed by runtime strategy state machine.
 */
export type EngineInteractionMutationKind = "none" | "set" | "pan" | "zoom";

/**
 * Runtime render strategy phase used for diagnostics and planning.
 */
export type EngineRenderStrategyPhase =
  | "static"
  | "pan"
  | "zoom"
  | "camera"
  | "settling";

/**
 * Strategy input payload for resolving one frame strategy decision.
 */
export interface EngineRenderStrategyInput {
  /** Current frame timestamp in milliseconds. */
  nowMs: number;
  /** Whether LOD and interaction degradation lanes are enabled. */
  lodEnabled: boolean;
  /** Whether camera animation is currently active. */
  cameraAnimationActive: boolean;
  /** Whether camera animation should prefer cache-preview mode. */
  cameraCachePreviewOnly: boolean;
  /** Last interaction mutation timestamp in milliseconds. */
  lastInteractionAtMs: number;
  /** Last interaction mutation kind. */
  lastInteractionKind: EngineInteractionMutationKind;
  /** Settling delay in milliseconds after interaction ends. */
  settleDelayMs: number;
  /** Interaction hold duration in milliseconds. */
  interactionHoldMs?: number;
  /** Forces one sharp settling frame when contracts miss deadline. */
  forceSharpFrame?: boolean;
}

/**
 * Strategy decision consumed by planning and runtime orchestration.
 */
export interface EngineRenderStrategyDecision {
  /** Selected phase for this frame. */
  phase: EngineRenderStrategyPhase;
  /** Whether runtime treats this frame as interaction-active. */
  interactionActive: boolean;
  /** Quality lane for this frame. */
  quality: "full" | "interactive";
  /** Whether cache preview mode is enabled for this frame. */
  cachePreviewOnly: boolean;
}

const DEFAULT_INTERACTION_HOLD_MS = 56;

/**
 * Resolves one render strategy decision from interaction and camera state.
 * @param input Strategy input snapshot for this frame.
 */
export function resolveEngineRenderStrategy(
  input: EngineRenderStrategyInput,
): EngineRenderStrategyDecision {
  if (input.forceSharpFrame) {
    return {
      phase: "settling",
      interactionActive: false,
      quality: "full",
      cachePreviewOnly: false,
    };
  }

  if (input.cameraAnimationActive) {
    return {
      phase: "camera",
      interactionActive: true,
      quality: "interactive",
      cachePreviewOnly: input.cameraCachePreviewOnly,
    };
  }

  if (!input.lodEnabled) {
    return {
      phase: "static",
      interactionActive: false,
      quality: "full",
      cachePreviewOnly: false,
    };
  }

  const elapsedSinceInteractionMs = Math.max(0, input.nowMs - input.lastInteractionAtMs);
  const holdMs = Math.max(
    0,
    Math.min(input.settleDelayMs, input.interactionHoldMs ?? DEFAULT_INTERACTION_HOLD_MS),
  );

  if (elapsedSinceInteractionMs <= holdMs) {
    if (input.lastInteractionKind === "pan") {
      return {
        phase: "pan",
        interactionActive: true,
        quality: "interactive",
        cachePreviewOnly: true,
      };
    }
    if (input.lastInteractionKind === "zoom") {
      return {
        phase: "zoom",
        interactionActive: true,
        quality: "interactive",
        cachePreviewOnly: false,
      };
    }
    return {
      phase: "pan",
      interactionActive: true,
      quality: "interactive",
      cachePreviewOnly: true,
    };
  }

  if (elapsedSinceInteractionMs <= input.settleDelayMs) {
    return {
      phase: "settling",
      interactionActive: false,
      quality: "full",
      cachePreviewOnly: false,
    };
  }

  return {
    phase: "static",
    interactionActive: false,
    quality: "full",
    cachePreviewOnly: false,
  };
}
