// These types are the shared LOD vocabulary for engine-side render and
// interaction decisions. Canvas-specific aliases remain available so existing
// adapters can migrate incrementally.
export type EngineLodInteractionType = 'pan' | 'zoom' | 'other'

export interface EngineLodProfileInput {
  shapeCount: number
  imageCount: number
  scale: number
  isInteracting?: boolean
  interactionVelocity?: number
  interactionType?: EngineLodInteractionType
  previousLodLevel?: 0 | 1 | 2 | 3
}

export interface EngineLodProfile {
  lodLevel: 0 | 1 | 2 | 3
  renderQuality: 'full' | 'interactive'
  targetDpr: number | 'auto'
  imageSmoothingQuality: ImageSmoothingQuality
  interactiveIntervalMs: number
}

export type EngineCanvasLodProfileInput = EngineLodProfileInput
export type EngineCanvasLodProfile = EngineLodProfile