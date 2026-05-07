import type { EngineInteractionPreviewConfig, EngineRenderQuality } from '../../../renderer/types/index.ts'

const DEFAULT_INTERACTION_HOLD_MS = 56

export type EngineInteractionMutationKind = 'none' | 'set' | 'pan' | 'zoom'

// Defines internal render strategy phases used by engine-owned policy decisions.
export type EngineRenderStrategyPhase =
  | 'static'
  | 'pan'
  | 'zoom'
  | 'camera'
  | 'settling'

// Describes one strategy decision input snapshot for the current frame.
export interface EngineRenderStrategyInput {
  // High-resolution frame timestamp.
  nowMs: number
  // Whether engine-level LOD behavior is enabled.
  lodEnabled: boolean
  // Whether camera animation is active.
  cameraAnimationActive: boolean
  // Whether camera animation is preview-cache only.
  cameraCachePreviewOnly: boolean
  // Last interaction mutation timestamp.
  lastInteractionAtMs: number
  // Last viewport mutation kind used by the state machine.
  lastInteractionKind: EngineInteractionMutationKind
  // Settling window duration in milliseconds.
  settleDelayMs: number
  // Maximum duration of interaction-quality hold before entering settling phase.
  interactionHoldMs?: number
  // Forces a full-quality settling frame when sharpness contract misses deadline.
  forceSharpFrame?: boolean
}

// Describes one internal policy decision consumed by the renderer context.
export interface EngineRenderStrategyDecision {
  // Selected internal strategy phase for diagnostics and cache policy wiring.
  phase: EngineRenderStrategyPhase
  // Whether the strategy treats this frame as active interaction.
  interactionActive: boolean
  // Selected render quality lane.
  quality: EngineRenderQuality
  // Preview policy for the current frame, or undefined to keep renderer defaults.
  interactionPreview: EngineInteractionPreviewConfig | undefined
}

/**
 * Resolve engine-owned quality and preview policy from interaction/camera state.
  * @param input Input payload for this operation.
*/
export function resolveEngineRenderStrategy(
  input: EngineRenderStrategyInput,
): EngineRenderStrategyDecision {
  // Force one explicit full-quality settling lane once the sharpness contract
  // misses deadline so next frame can recover fidelity deterministically.
  if (input.forceSharpFrame) {
    return {
      phase: 'settling',
      interactionActive: false,
      quality: 'full',
      interactionPreview: undefined,
    }
  }

  // Keep camera animations on an explicit strategy lane so quality/preview
  // behavior is deterministic even when viewport mutation data is stale.
  if (input.cameraAnimationActive) {
    return {
      phase: 'camera',
      interactionActive: true,
      quality: 'interactive',
      interactionPreview: {
        enabled: true,
        mode: 'interaction',
        // Camera preview-only mode should prefer cached snapshots when requested.
        cacheOnly: input.cameraCachePreviewOnly,
        maxScaleStep: 8,
        maxTranslatePx: 100_000,
      },
    }
  }

  // Disable interaction degradation lanes when LOD is off.
  if (!input.lodEnabled) {
    return {
      phase: 'static',
      interactionActive: false,
      quality: 'full',
      interactionPreview: undefined,
    }
  }

  const elapsedSinceInteractionMs = Math.max(0, input.nowMs - input.lastInteractionAtMs)
  const interactionHoldMs = Math.max(
    0,
    Math.min(input.settleDelayMs, input.interactionHoldMs ?? DEFAULT_INTERACTION_HOLD_MS),
  )
  const interactionActive = elapsedSinceInteractionMs <= interactionHoldMs
  const settlingActive =
    elapsedSinceInteractionMs > interactionHoldMs &&
    elapsedSinceInteractionMs <= input.settleDelayMs

  if (interactionActive && input.lastInteractionKind === 'pan') {
    return {
      phase: 'pan',
      interactionActive: true,
      quality: 'interactive',
      interactionPreview: {
        enabled: true,
        mode: 'interaction',
        cacheOnly: true,
        maxScaleStep: 8,
        maxTranslatePx: 100_000,
      },
    }
  }

  if (interactionActive && input.lastInteractionKind === 'zoom') {
    return {
      phase: 'zoom',
      interactionActive: true,
      quality: 'interactive',
      interactionPreview: {
        enabled: true,
        mode: 'interaction',
        // Zoom should allow packet fallback when snapshot reuse misses.
        cacheOnly: false,
        maxScaleStep: 8,
        maxTranslatePx: 100_000,
      },
    }
  }

  if (settlingActive) {
    return {
      phase: 'settling',
      interactionActive: false,
      quality: 'full',
      interactionPreview: undefined,
    }
  }

  return {
    phase: 'static',
    interactionActive: false,
    quality: 'full',
    interactionPreview: undefined,
  }
}
