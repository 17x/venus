import {applyMatrixToPoint, type Mat3, type Point2D} from '../math/matrix.ts'

const DEFAULT_VIEWPORT_OFFSET = 48
const MIN_VIEWPORT_SCALE = 0.02
const MAX_VIEWPORT_SCALE = 32

/**
 * Fully resolved viewport state used by runtime, interaction, and renderer.
 *
 * `matrix` maps world -> screen, while `inverseMatrix` maps screen -> world.
 */
export interface EngineCanvasViewportState {
  inverseMatrix: Mat3
  matrix: Mat3
  offsetX: number
  offsetY: number
  scale: number
  viewportWidth: number
  viewportHeight: number
}

export interface EngineViewportFitDocumentLike {
  width: number
  height: number
}

/**
 * Initial viewport before the canvas element reports measured size.
 */
export const DEFAULT_ENGINE_VIEWPORT: EngineCanvasViewportState = {
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
 * Clamp viewport zoom to a shared safe interaction envelope.
 */
export function clampEngineViewportScale(scale: number) {
  return Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, scale))
}

/**
 * Rebuild derived matrices after any viewport scalar/offset change.
 */
export function resolveEngineViewportState(
  viewport: Pick<EngineCanvasViewportState, 'offsetX' | 'offsetY' | 'scale' | 'viewportWidth' | 'viewportHeight'>,
): EngineCanvasViewportState {
  const matrix = createViewportMatrix(viewport.scale, viewport.offsetX, viewport.offsetY)

  return {
    ...viewport,
    matrix,
    inverseMatrix: invertViewportMatrix(matrix),
  }
}

/**
 * Fit a document-like rect into the available viewport area with shared
 * padding rules.
 */
export function fitEngineViewportToDocument(
  document: EngineViewportFitDocumentLike,
  viewport: EngineCanvasViewportState,
): EngineCanvasViewportState {
  const {viewportWidth, viewportHeight} = viewport

  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return viewport
  }

  const horizontalPadding = Math.max(32, viewportWidth * 0.08)
  const verticalPadding = Math.max(32, viewportHeight * 0.08)
  const availableWidth = Math.max(1, viewportWidth - horizontalPadding * 2)
  const availableHeight = Math.max(1, viewportHeight - verticalPadding * 2)
  const scale = clampEngineViewportScale(
    Math.min(availableWidth / document.width, availableHeight / document.height),
  )

  return resolveEngineViewportState({
    viewportWidth,
    viewportHeight,
    scale,
    offsetX: (viewportWidth - document.width * scale) / 2,
    offsetY: (viewportHeight - document.height * scale) / 2,
  })
}

/**
 * Translate viewport by a screen-space delta.
 */
export function panEngineViewportState(
  viewport: EngineCanvasViewportState,
  deltaX: number,
  deltaY: number,
): EngineCanvasViewportState {
  // Ignore pan updates before viewport dimensions are measured. Applying
  // deltas on a 0x0 viewport can shift the first measured candidate window.
  if (viewport.viewportWidth <= 1 || viewport.viewportHeight <= 1) {
    return viewport
  }

  return resolveEngineViewportState({
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
export function resizeEngineViewportState(
  viewport: EngineCanvasViewportState,
  width: number,
  height: number,
): EngineCanvasViewportState {
  return resolveEngineViewportState({
    offsetX: viewport.offsetX,
    offsetY: viewport.offsetY,
    scale: viewport.scale,
    viewportWidth: width,
    viewportHeight: height,
  })
}

/**
 * Zoom around an optional screen-space anchor.
 *
 * Keeping the anchor's world point visually stable avoids zoom drift.
 */
export function zoomEngineViewportState(
  viewport: EngineCanvasViewportState,
  nextScale: number,
  anchor?: Point2D,
): EngineCanvasViewportState {
  // Ignore zoom updates before viewport dimensions are measured. Applying
  // anchored zoom on a 0x0 viewport can lock in a bad offset baseline.
  if (viewport.viewportWidth <= 1 || viewport.viewportHeight <= 1) {
    return viewport
  }

  const scale = clampEngineViewportScale(nextScale)

  if (!anchor || viewport.scale === scale) {
    return resolveEngineViewportState({
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
      scale,
      viewportWidth: viewport.viewportWidth,
      viewportHeight: viewport.viewportHeight,
    })
  }

  const world = applyMatrixToPoint(viewport.inverseMatrix, anchor)

  return resolveEngineViewportState({
    scale,
    offsetX: anchor.x - world.x * scale,
    offsetY: anchor.y - world.y * scale,
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
  })
}

function createViewportMatrix(
  scale: number,
  offsetX: number,
  offsetY: number,
): Mat3 {
  return [
    scale, 0, offsetX,
    0, scale, offsetY,
    0, 0, 1,
  ]
}

function invertViewportMatrix(matrix: Mat3): Mat3 {
  const [a, c, tx, b, d, ty] = matrix
  const determinant = a * d - b * c

  if (determinant === 0) {
    return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]
  }

  const inverseDeterminant = 1 / determinant
  const nextA = d * inverseDeterminant
  const nextB = -b * inverseDeterminant
  const nextC = -c * inverseDeterminant
  const nextD = a * inverseDeterminant
  const nextTx = -(nextA * tx + nextC * ty)
  const nextTy = -(nextB * tx + nextD * ty)

  return [
    nextA, nextC, nextTx,
    nextB, nextD, nextTy,
    0, 0, 1,
  ]
}