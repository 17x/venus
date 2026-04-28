import {applyMatrixToPoint, type Mat3, type Point2D} from '../math/matrix.ts'

const DEFAULT_VIEWPORT_OFFSET = 48
const MIN_VIEWPORT_SCALE = 0.02
const MAX_VIEWPORT_SCALE = 32

/**
 * Fully resolved viewport state used by runtime, interaction, and renderer.
 *
 * `matrix` maps world -> screen, while `inverseMatrix` maps screen -> world.
 */
export interface CanvasViewportState {
  /** Stores screen-to-world matrix used by hit-test projection. */
  inverseMatrix: Mat3
  /** Stores world-to-screen matrix used by renderer projection. */
  matrix: Mat3
  /** Stores x-axis viewport translation in screen space. */
  offsetX: number
  /** Stores y-axis viewport translation in screen space. */
  offsetY: number
  /** Stores viewport zoom scale. */
  scale: number
  /** Stores measured viewport width in pixels. */
  viewportWidth: number
  /** Stores measured viewport height in pixels. */
  viewportHeight: number
}

/**
 * Describes a document-like rectangle surface for fit-to-view operations.
 */
export interface ViewportFitDocumentLike {
  /** Stores source document width. */
  width: number
  /** Stores source document height. */
  height: number
}

/**
 * Initial viewport before the canvas element reports measured size.
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
 * Clamps viewport zoom to a shared safe interaction envelope.
 */
export function clampViewportScale(scale: number): number {
  return Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, scale))
}

/**
 * Rebuilds derived matrices after any viewport scalar/offset change.
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
 * Fits a document-like rect into the available viewport area with shared padding rules.
 */
export function fitViewportToDocument(
  document: ViewportFitDocumentLike,
  viewport: CanvasViewportState,
): CanvasViewportState {
  const {viewportWidth, viewportHeight} = viewport

  // Skip fit before measurement so cold-start offsets remain stable.
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
 * Translates viewport by a screen-space delta.
 */
export function panViewportState(
  viewport: CanvasViewportState,
  deltaX: number,
  deltaY: number,
): CanvasViewportState {
  // Ignore pan updates before viewport dimensions are measured.
  if (viewport.viewportWidth <= 1 || viewport.viewportHeight <= 1) {
    return viewport
  }

  return resolveViewportState({
    offsetX: viewport.offsetX + deltaX,
    offsetY: viewport.offsetY + deltaY,
    scale: viewport.scale,
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
  })
}

/**
 * Updates viewport dimensions while preserving current zoom and offsets.
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
 * Zooms around an optional screen-space anchor while preserving anchor world position.
 */
export function zoomViewportState(
  viewport: CanvasViewportState,
  nextScale: number,
  anchor?: Point2D,
): CanvasViewportState {
  // Ignore zoom updates before viewport dimensions are measured.
  if (viewport.viewportWidth <= 1 || viewport.viewportHeight <= 1) {
    return viewport
  }

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

/**
 * Creates an affine viewport matrix from scale and offset values.
 */
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

/**
 * Inverts an affine viewport matrix and falls back to identity for singular matrices.
 */
function invertViewportMatrix(matrix: Mat3): Mat3 {
  const [a, c, tx, b, d, ty] = matrix
  const determinant = a * d - b * c

  // Guard singular matrix inversion to avoid NaN propagation.
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

