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

const PAN_INTERACTIVE_INTERVAL_MS = 8
const ZOOM_INTERACTIVE_INTERVAL_MS = 8
const ZOOM_INTERACTIVE_TARGET_DPR = 1.5
const SHAPE_COUNT_HEAVY_THRESHOLD = 80_000
const IMAGE_COUNT_HEAVY_THRESHOLD = 2_000
const SHAPE_COUNT_MEDIUM_THRESHOLD = 20_000
const IMAGE_COUNT_MEDIUM_THRESHOLD = 500
const LOW_SCALE_PROMOTION_THRESHOLD = 0.12
const LOD_MAX_LEVEL = 3
const VELOCITY_PROMOTION_L1 = 4_200
const VELOCITY_PROMOTION_L2 = 7_200
const LOD_LEVEL_ONE = 1
const LOD_LEVEL_TWO = 2
const LOD_ONE_INTERVAL_MS = 10
const LOD_TWO_INTERVAL_MS = 12
const LOD_THREE_INTERVAL_MS = 16
const LOD_TWO_TARGET_DPR = 1.25
const LOD_THREE_TARGET_DPR = 1
type EngineLodLevel = EngineLodProfile['lodLevel']

/**
 * Resolve a coarse LOD profile from scene pressure, zoom scale, and
 * interaction velocity.
  * @param options Options object for this operation.
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
      interactiveIntervalMs: PAN_INTERACTIVE_INTERVAL_MS,
    }
  }

  // Zoom interaction is the highest cache/text/path rebuild pressure mode.
  // Prefer responsive interactive quality during wheel/pinch and restore full
  // quality in settle frames.
  if (interactionType === 'zoom') {
    return {
      lodLevel: 1,
      renderQuality: 'interactive',
      targetDpr: ZOOM_INTERACTIVE_TARGET_DPR,
      imageSmoothingQuality: 'medium',
      interactiveIntervalMs: ZOOM_INTERACTIVE_INTERVAL_MS,
    }
  }

  const interactionVelocity = Math.max(0, options.interactionVelocity ?? 0)
  const isInteracting = options.isInteracting ?? interactionVelocity > 0

  let lodLevel: EngineLodLevel =
    options.shapeCount >= SHAPE_COUNT_HEAVY_THRESHOLD || options.imageCount >= IMAGE_COUNT_HEAVY_THRESHOLD
      ? LOD_LEVEL_TWO
      : options.shapeCount >= SHAPE_COUNT_MEDIUM_THRESHOLD || options.imageCount >= IMAGE_COUNT_MEDIUM_THRESHOLD
        ? LOD_LEVEL_ONE
        : 0

  if (
    options.scale < LOW_SCALE_PROMOTION_THRESHOLD &&
    lodLevel < LOD_MAX_LEVEL &&
    (options.shapeCount >= SHAPE_COUNT_MEDIUM_THRESHOLD || options.imageCount >= IMAGE_COUNT_MEDIUM_THRESHOLD)
  ) {
    lodLevel = (lodLevel + LOD_LEVEL_ONE) as EngineLodLevel
  }

  if (interactionVelocity >= VELOCITY_PROMOTION_L1 && lodLevel < LOD_MAX_LEVEL) {
    lodLevel = (lodLevel + LOD_LEVEL_ONE) as EngineLodLevel
  }

  if (interactionVelocity >= VELOCITY_PROMOTION_L2 && lodLevel < LOD_MAX_LEVEL) {
    lodLevel = (lodLevel + LOD_LEVEL_ONE) as EngineLodLevel
  }

  // Apply one-step cooldown hysteresis so LOD does not oscillate rapidly
  // around threshold boundaries during settle frames.
  if (
    typeof options.previousLodLevel === 'number' &&
    options.previousLodLevel - lodLevel > LOD_LEVEL_ONE
  ) {
    lodLevel = (options.previousLodLevel - LOD_LEVEL_ONE) as EngineLodLevel
  }

  const renderQuality = lodLevel >= LOD_LEVEL_TWO || isInteracting ? 'interactive' : 'full'

  if (lodLevel <= 0) {
    return {
      lodLevel,
      renderQuality,
      targetDpr: 'auto',
      imageSmoothingQuality: 'high',
      interactiveIntervalMs: PAN_INTERACTIVE_INTERVAL_MS,
    }
  }

  if (lodLevel === LOD_LEVEL_ONE) {
    return {
      lodLevel,
      renderQuality,
      targetDpr: isInteracting ? ZOOM_INTERACTIVE_TARGET_DPR : 'auto',
      imageSmoothingQuality: 'medium',
      interactiveIntervalMs: LOD_ONE_INTERVAL_MS,
    }
  }

  if (lodLevel === LOD_LEVEL_TWO) {
    return {
      lodLevel,
      renderQuality,
      targetDpr: LOD_TWO_TARGET_DPR,
      imageSmoothingQuality: 'low',
      interactiveIntervalMs: LOD_TWO_INTERVAL_MS,
    }
  }

  return {
    lodLevel,
    renderQuality,
    targetDpr: LOD_THREE_TARGET_DPR,
    imageSmoothingQuality: 'low',
    interactiveIntervalMs: LOD_THREE_INTERVAL_MS,
  }
}

// Keep a generic resolver name available for newer planner-facing code while
// preserving the existing canvas-specific entrypoint for compatibility.
export const resolveEngineLodProfile = (
  options: EngineLodProfileInput,
): EngineLodProfile => resolveEngineCanvasLodProfile(options)
