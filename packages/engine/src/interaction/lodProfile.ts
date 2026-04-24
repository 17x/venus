import type {
  EngineCanvasLodProfile,
  EngineCanvasLodProfileInput,
  EngineLodProfile,
  EngineLodProfileInput,
} from './lodTypes.ts'

export type {
  EngineCanvasLodProfile,
  EngineCanvasLodProfileInput,
  EngineLodInteractionType,
  EngineLodProfile,
  EngineLodProfileInput,
} from './lodTypes.ts'

/**
 * Resolve a coarse LOD profile from scene pressure, zoom scale, and
 * interaction velocity.
 */
export function resolveEngineCanvasLodProfile(
  options: EngineCanvasLodProfileInput,
): EngineCanvasLodProfile {
  const interactionType = options.interactionType ?? 'other'

  // Pan should request interactive quality so render policy can engage
  // affine preview reuse instead of replaying the full packet path.
  if (interactionType === 'pan') {
    return {
      lodLevel: 0,
      renderQuality: 'interactive',
      targetDpr: 'auto',
      imageSmoothingQuality: 'high',
      interactiveIntervalMs: 8,
    }
  }

  // Zoom interaction is the highest cache/text/path rebuild pressure mode.
  // Prefer responsive interactive quality during wheel/pinch and restore full
  // quality in settle frames.
  if (interactionType === 'zoom') {
    return {
      lodLevel: 2,
      renderQuality: 'interactive',
      targetDpr: 1.25,
      imageSmoothingQuality: 'low',
      interactiveIntervalMs: 10,
    }
  }

  const interactionVelocity = Math.max(0, options.interactionVelocity ?? 0)
  const isInteracting = options.isInteracting ?? interactionVelocity > 0

  let lodLevel: 0 | 1 | 2 | 3 =
    options.shapeCount >= 80_000 || options.imageCount >= 2_000
      ? 2
      : options.shapeCount >= 20_000 || options.imageCount >= 500
        ? 1
        : 0

  if (options.scale < 0.22 && lodLevel < 3) {
    lodLevel = (lodLevel + 1) as 0 | 1 | 2 | 3
  }

  if (interactionVelocity >= 3_200 && lodLevel < 3) {
    lodLevel = (lodLevel + 1) as 0 | 1 | 2 | 3
  }

  if (interactionVelocity >= 5_600 && lodLevel < 3) {
    lodLevel = (lodLevel + 1) as 0 | 1 | 2 | 3
  }

  // Apply one-step cooldown hysteresis so LOD does not oscillate rapidly
  // around threshold boundaries during settle frames.
  if (
    typeof options.previousLodLevel === 'number' &&
    options.previousLodLevel - lodLevel > 1
  ) {
    lodLevel = (options.previousLodLevel - 1) as 0 | 1 | 2 | 3
  }

  const renderQuality = lodLevel >= 2 || isInteracting ? 'interactive' : 'full'

  if (lodLevel <= 0) {
    return {
      lodLevel,
      renderQuality,
      targetDpr: 'auto',
      imageSmoothingQuality: 'high',
      interactiveIntervalMs: 8,
    }
  }

  if (lodLevel === 1) {
    return {
      lodLevel,
      renderQuality,
      targetDpr: isInteracting ? 1.5 : 'auto',
      imageSmoothingQuality: 'medium',
      interactiveIntervalMs: 10,
    }
  }

  if (lodLevel === 2) {
    return {
      lodLevel,
      renderQuality,
      targetDpr: 1.25,
      imageSmoothingQuality: 'low',
      interactiveIntervalMs: 12,
    }
  }

  return {
    lodLevel,
    renderQuality,
    targetDpr: 1,
    imageSmoothingQuality: 'low',
    interactiveIntervalMs: 16,
  }
}

// Keep a generic resolver name available for newer planner-facing code while
// preserving the existing canvas-specific entrypoint for compatibility.
export const resolveEngineLodProfile = (
  options: EngineLodProfileInput,
): EngineLodProfile => resolveEngineCanvasLodProfile(options)
