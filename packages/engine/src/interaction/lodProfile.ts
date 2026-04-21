export interface EngineCanvasLodProfileInput {
  shapeCount: number
  imageCount: number
  scale: number
  isInteracting?: boolean
  interactionVelocity?: number
  previousLodLevel?: 0 | 1 | 2 | 3
}

export interface EngineCanvasLodProfile {
  lodLevel: 0 | 1 | 2 | 3
  renderQuality: 'full' | 'interactive'
  targetDpr: number | 'auto'
  imageSmoothingQuality: ImageSmoothingQuality
  interactiveIntervalMs: number
}

/**
 * Resolve a coarse LOD profile from scene pressure, zoom scale, and
 * interaction velocity.
 */
export function resolveEngineCanvasLodProfile(
  options: EngineCanvasLodProfileInput,
): EngineCanvasLodProfile {
  const interactionVelocity = Math.max(0, options.interactionVelocity ?? 0)
  const isInteracting = options.isInteracting ?? interactionVelocity > 0

  let lodLevel: 0 | 1 | 2 | 3 =
    options.shapeCount >= 50_000 || options.imageCount >= 1_000
      ? 2
      : options.shapeCount >= 10_000 || options.imageCount >= 250
        ? 1
        : 0

  if (options.scale < 0.35 && lodLevel < 3) {
    lodLevel = (lodLevel + 1) as 0 | 1 | 2 | 3
  }

  if (interactionVelocity >= 2_400 && lodLevel < 3) {
    lodLevel = (lodLevel + 1) as 0 | 1 | 2 | 3
  }

  if (interactionVelocity >= 4_200 && lodLevel < 3) {
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
      targetDpr: isInteracting ? 1.25 : 'auto',
      imageSmoothingQuality: 'medium',
      interactiveIntervalMs: 10,
    }
  }

  if (lodLevel === 2) {
    return {
      lodLevel,
      renderQuality,
      targetDpr: 1,
      imageSmoothingQuality: 'low',
      interactiveIntervalMs: 12,
    }
  }

  return {
    lodLevel,
    renderQuality,
    targetDpr: 0.75,
    imageSmoothingQuality: 'low',
    interactiveIntervalMs: 16,
  }
}
