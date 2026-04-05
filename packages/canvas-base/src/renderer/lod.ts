import type {CanvasRendererProps} from './types.ts'

export type CanvasRenderLodLevel = 0 | 1 | 2 | 3

export interface CanvasRenderLodState {
  level: CanvasRenderLodLevel
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>
  shapeCount: number
  imageCount: number
  scale: number
}

export function resolveCanvasRenderLodState(input: {
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>
  shapeCount: number
  imageCount: number
  scale: number
}): CanvasRenderLodState {
  const {imageCount, renderQuality, scale, shapeCount} = input
  let level: CanvasRenderLodLevel = renderQuality === 'interactive' ? 2 : 0

  if (shapeCount >= 10_000 || imageCount >= 250) {
    level = Math.max(level, 1) as CanvasRenderLodLevel
  }

  if (shapeCount >= 50_000 || imageCount >= 1_000) {
    level = Math.max(level, 2) as CanvasRenderLodLevel
  }

  if (
    renderQuality === 'interactive' &&
    (shapeCount >= 50_000 || imageCount >= 1_000 || scale < 0.45)
  ) {
    level = 3
  }

  return {
    imageCount,
    level,
    renderQuality,
    scale,
    shapeCount,
  }
}
