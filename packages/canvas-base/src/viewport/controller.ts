import type {EditorDocument} from '@venus/document-core'
import {
  applyMatrixToPoint,
  createViewportMatrix,
  invertViewportMatrix,
  type Point2D,
} from './matrix.ts'
import type {CanvasViewportState} from './types.ts'

const DEFAULT_VIEWPORT_OFFSET = 48
const MIN_VIEWPORT_SCALE = 0.02
const MAX_VIEWPORT_SCALE = 32

/**
 * Initial viewport used before the canvas element reports its measured size.
 */
export const DEFAULT_VIEWPORT: CanvasViewportState = {
  inverseMatrix: [
    1, 0, -DEFAULT_VIEWPORT_OFFSET,
    0, 1, -DEFAULT_VIEWPORT_OFFSET,
    0, 0, 1,
  ],
  matrix: [
    1, 0, DEFAULT_VIEWPORT_OFFSET,
    0, 1, DEFAULT_VIEWPORT_OFFSET,
    0, 0, 1,
  ],
  offsetX: DEFAULT_VIEWPORT_OFFSET,
  offsetY: DEFAULT_VIEWPORT_OFFSET,
  scale: 1,
  viewportWidth: 0,
  viewportHeight: 0,
}

/**
 * Clamp viewport zoom so every app shares the same safe interaction envelope.
 */
export function clampViewportScale(scale: number) {
  return Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, scale))
}

/**
 * Rebuild derived matrices after any viewport scalar/offset change.
 */
export function resolveViewportState(
  viewport: Pick<CanvasViewportState, 'offsetX' | 'offsetY' | 'scale' | 'viewportWidth' | 'viewportHeight'>,
): CanvasViewportState {
  const matrix = createViewportMatrix(viewport.scale, viewport.offsetX, viewport.offsetY)

  return {
    ...viewport,
    matrix,
    inverseMatrix: invertViewportMatrix(matrix),
  }
}

/**
 * Fit a document into the available viewport area with shared padding rules.
 */
export function fitViewportToDocument(
  document: EditorDocument,
  viewport: CanvasViewportState,
): CanvasViewportState {
  const {viewportWidth, viewportHeight} = viewport

  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return viewport
  }

  const horizontalPadding = Math.max(32, viewportWidth * 0.08)
  const verticalPadding = Math.max(32, viewportHeight * 0.08)
  const availableWidth = Math.max(1, viewportWidth - horizontalPadding * 2)
  const availableHeight = Math.max(1, viewportHeight - verticalPadding * 2)
  const scale = clampViewportScale(
    Math.min(availableWidth / document.width, availableHeight / document.height),
  )

  return resolveViewportState({
    viewportWidth,
    viewportHeight,
    scale,
    offsetX: (viewportWidth - document.width * scale) / 2,
    offsetY: (viewportHeight - document.height * scale) / 2,
  })
}

/**
 * Translate the viewport by a screen-space delta.
 */
export function panViewportState(
  viewport: CanvasViewportState,
  deltaX: number,
  deltaY: number,
): CanvasViewportState {
  return resolveViewportState({
    offsetX: viewport.offsetX + deltaX,
    offsetY: viewport.offsetY + deltaY,
    scale: viewport.scale,
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
  })
}

/**
 * Update viewport dimensions while preserving current zoom and offsets.
 */
export function resizeViewportState(
  viewport: CanvasViewportState,
  width: number,
  height: number,
): CanvasViewportState {
  return resolveViewportState({
    offsetX: viewport.offsetX,
    offsetY: viewport.offsetY,
    scale: viewport.scale,
    viewportWidth: width,
    viewportHeight: height,
  })
}

/**
 * Zoom the viewport around an optional screen-space anchor point.
 *
 * When `anchor` is provided, the world point under that screen coordinate is
 * kept visually stable during the zoom operation.
 */
export function zoomViewportState(
  viewport: CanvasViewportState,
  nextScale: number,
  anchor?: Point2D,
): CanvasViewportState {
  const scale = clampViewportScale(nextScale)

  if (!anchor || viewport.scale === scale) {
    return resolveViewportState({
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
      scale,
      viewportWidth: viewport.viewportWidth,
      viewportHeight: viewport.viewportHeight,
    })
  }

  const world = applyMatrixToPoint(viewport.inverseMatrix, anchor)

  return resolveViewportState({
    scale,
    offsetX: anchor.x - world.x * scale,
    offsetY: anchor.y - world.y * scale,
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
  })
}
