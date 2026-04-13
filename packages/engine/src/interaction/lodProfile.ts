export interface EngineCanvasLodProfileInput {
  shapeCount: number
  imageCount: number
  scale: number
}

export interface EngineCanvasLodProfile {
  lodLevel: 0 | 1 | 2 | 3
  renderQuality: 'full' | 'interactive'
}

/**
 * Resolve a coarse LOD profile from scene pressure + zoom scale.
 */
export function resolveEngineCanvasLodProfile(
  options: EngineCanvasLodProfileInput,
): EngineCanvasLodProfile {
  let lodLevel: 0 | 1 | 2 | 3 =
    options.shapeCount >= 50_000 || options.imageCount >= 1_000
      ? 2
      : options.shapeCount >= 10_000 || options.imageCount >= 250
        ? 1
        : 0

  if (options.scale < 0.35 && lodLevel < 3) {
    lodLevel = (lodLevel + 1) as 0 | 1 | 2 | 3
  }

  return {
    lodLevel,
    renderQuality: lodLevel >= 2 ? 'interactive' : 'full',
  }
}