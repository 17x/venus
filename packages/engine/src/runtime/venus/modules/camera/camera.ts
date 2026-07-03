import {applyMatrixToPoint} from '../../../../math/matrix/matrix.ts'
import {
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
} from '../../../../interaction/viewport/viewport.ts'

export type VenusCameraPadding = number | {top: number; right: number; bottom: number; left: number}
export type VenusCameraResult = {scale: number; offsetX: number; offsetY: number}

export function resolveVenusCameraFitBounds(
  viewport: EngineCanvasViewportState,
  bounds: {x: number; y: number; width: number; height: number},
  padding: VenusCameraPadding = 0,
): EngineCanvasViewportState {
  const resolvedPadding = typeof padding === 'number'
    ? {top: padding, right: padding, bottom: padding, left: padding}
    : padding
  const availableWidth = Math.max(1, viewport.viewportWidth - resolvedPadding.left - resolvedPadding.right)
  const availableHeight = Math.max(1, viewport.viewportHeight - resolvedPadding.top - resolvedPadding.bottom)
  const targetWidth = Math.max(1, Math.abs(bounds.width))
  const targetHeight = Math.max(1, Math.abs(bounds.height))
  const scale = Math.min(availableWidth / targetWidth, availableHeight / targetHeight)
  const offsetX = resolvedPadding.left + (availableWidth - targetWidth * scale) / 2 - bounds.x * scale
  const offsetY = resolvedPadding.top + (availableHeight - targetHeight * scale) / 2 - bounds.y * scale

  return resolveEngineViewportState({
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
    scale,
    offsetX,
    offsetY,
  })
}

export function resolveVenusCameraZoom(
  viewport: EngineCanvasViewportState,
  scale: number,
  anchor?: {x: number; y: number},
): EngineCanvasViewportState {
  return zoomEngineViewportState(viewport, scale, anchor)
}

export function resolveVenusCameraPan(
  viewport: EngineCanvasViewportState,
  delta: {x: number; y: number},
): EngineCanvasViewportState {
  return panEngineViewportState(viewport, delta.x, delta.y)
}

export function projectVenusCameraPoint(
  viewport: EngineCanvasViewportState,
  point: {x: number; y: number},
): {x: number; y: number} {
  return applyMatrixToPoint(viewport.matrix, point)
}

export function unprojectVenusCameraPoint(
  viewport: EngineCanvasViewportState,
  point: {x: number; y: number},
): {x: number; y: number} {
  return applyMatrixToPoint(viewport.inverseMatrix, point)
}
