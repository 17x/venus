// These types are the shared LOD vocabulary for engine-side render and
// interaction decisions. Canvas-specific aliases remain available so existing
// adapters can migrate incrementally.
export type EngineLodInteractionType = 'pan' | 'zoom' | 'other'

const LOD_LEVEL_ONE = 1
const LOD_LEVEL_TWO = 2
const LOD_LEVEL_THREE = 3
type EngineLodLevel = 0 | typeof LOD_LEVEL_ONE | typeof LOD_LEVEL_TWO | typeof LOD_LEVEL_THREE

export interface EngineLodProfileInput {
  shapeCount: number
  imageCount: number
  scale: number
  isInteracting?: boolean
  interactionVelocity?: number
  interactionType?: EngineLodInteractionType
  previousLodLevel?: EngineLodLevel
}

export interface EngineLodProfile {
  lodLevel: EngineLodLevel
  renderQuality: 'full' | 'interactive'
  targetDpr: number | 'auto'
  imageSmoothingQuality: ImageSmoothingQuality
  interactiveIntervalMs: number
}

export type EngineCanvasLodProfileInput = EngineLodProfileInput
export type EngineCanvasLodProfile = EngineLodProfile