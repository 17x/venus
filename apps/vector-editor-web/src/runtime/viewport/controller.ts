import {applyMatrixToPoint, type Mat3, type Point2D} from '@venus/lib'

const DEFAULT_VIEWPORT_OFFSET = 48
const MIN_VIEWPORT_SCALE = 0.02
const MAX_VIEWPORT_SCALE = 32

/**
 * Configures min/max clamp values used by viewport zoom helpers.
 */
export interface CanvasViewportScaleRange {
  /** Stores the smallest allowed viewport scale. */
  min: number
  /** Stores the largest allowed viewport scale. */
  max: number
}

/**
 * Fully resolved viewport state used by runtime, interaction, and renderer.
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
export interface CanvasViewportFitDocumentLike {
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

// Vector runtime keeps a wider zoom envelope than the shared engine defaults.
export const DEFAULT_VIEWPORT_SCALE_RANGE: CanvasViewportScaleRange = {
  min: 0.01,
  max: 640,
}

/**
 * Clamps viewport zoom to a shared safe interaction envelope.
 * @param scale Proposed viewport scale.
 * @param scaleRange Optional caller-provided clamp range.
 */
export function clampViewportScale(
  scale: number,
  scaleRange: CanvasViewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
) {
  const resolvedScaleRange = resolveViewportScaleRange(scaleRange)
  return Math.min(resolvedScaleRange.max, Math.max(resolvedScaleRange.min, scale))
}

/**
 * Rebuilds derived matrices after any viewport scalar/offset change.
 * @param viewport Partial viewport scalar and offset fields.
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
 * @param document Source document bounds.
 * @param viewport Current viewport state.
 * @param scaleRange Optional caller-provided clamp range.
 */
export function fitViewportToDocument(
  document: CanvasViewportFitDocumentLike,
  viewport: CanvasViewportState,
  scaleRange: CanvasViewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
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
    scaleRange,
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
 * @param viewport Current viewport state.
 * @param deltaX Horizontal pan delta in screen space.
 * @param deltaY Vertical pan delta in screen space.
 */
export function panViewportState(
  viewport: CanvasViewportState,
  deltaX: number,
  deltaY: number,
): CanvasViewportState {
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
 * @param viewport Current viewport state.
 * @param width Next viewport width.
 * @param height Next viewport height.
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
 * @param viewport Current viewport state.
 * @param nextScale Target viewport scale.
 * @param anchor Optional screen-space anchor.
 * @param scaleRange Optional caller-provided clamp range.
 */
export function zoomViewportState(
  viewport: CanvasViewportState,
  nextScale: number,
  anchor?: Point2D,
  scaleRange: CanvasViewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
): CanvasViewportState {
  if (viewport.viewportWidth <= 1 || viewport.viewportHeight <= 1) {
    return viewport
  }

  const scale = clampViewportScale(nextScale, scaleRange)

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
 * Defines accumulated viewport pan offsets in screen space.
 */
export interface ViewportPanOffset {
  /** Stores x-axis pan offset. */
  x: number
  /** Stores y-axis pan offset. */
  y: number
}

/**
 * Defines pointer origin state for viewport pan sessions.
 */
export interface ViewportPanOrigin {
  /** Stores latest pointer x coordinate. */
  x: number
  /** Stores latest pointer y coordinate. */
  y: number
  /** Stores active pointer id tied to this pan session. */
  pointerId: number
}

/**
 * Seeds a pointer-pan session from the pointerdown location.
 * @param input Pointerdown coordinates and pointer id.
 */
export function createViewportPanOrigin(input: {
  /** Stores initial pointer x coordinate. */
  x: number
  /** Stores initial pointer y coordinate. */
  y: number
  /** Stores initial pointer id. */
  pointerId: number
}): ViewportPanOrigin {
  return {
    x: input.x,
    y: input.y,
    pointerId: input.pointerId,
  }
}

/**
 * Converts wheel deltas into viewport pan offsets.
 * @param offset Current viewport pan offset.
 * @param input Incoming wheel delta payload.
 */
export function accumulateWheelPanOffset(
  offset: ViewportPanOffset,
  input: {
    /** Stores wheel delta on x-axis. */
    deltaX: number
    /** Stores wheel delta on y-axis. */
    deltaY: number
  },
): ViewportPanOffset {
  return {
    x: offset.x - input.deltaX,
    y: offset.y - input.deltaY,
  }
}

/**
 * Updates pointer-pan session and returns the accumulated viewport delta.
 * @param offset Current viewport pan offset.
 * @param origin Active pointer origin state.
 * @param pointer Incoming pointer payload.
 */
export function accumulatePointerPanOffset(
  offset: ViewportPanOffset,
  origin: ViewportPanOrigin,
  pointer: {
    /** Stores current pointer x coordinate. */
    x: number
    /** Stores current pointer y coordinate. */
    y: number
    /** Stores current pointer id. */
    pointerId: number
  },
): {offset: ViewportPanOffset; origin: ViewportPanOrigin} {
  if (origin.pointerId !== pointer.pointerId) {
    return {offset, origin}
  }

  const deltaX = pointer.x - origin.x
  const deltaY = pointer.y - origin.y

  return {
    offset: {
      x: offset.x + deltaX,
      y: offset.y + deltaY,
    },
    origin: {
      x: pointer.x,
      y: pointer.y,
      pointerId: pointer.pointerId,
    },
  }
}

/**
 * Creates an affine viewport matrix from scale and offset values.
 * @param scale Viewport zoom scale.
 * @param offsetX Horizontal offset.
 * @param offsetY Vertical offset.
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
 * @param matrix Forward viewport matrix.
 */
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

/**
 * Resolves caller-provided zoom bounds and falls back to shared defaults when invalid.
 * @param input Optional caller-provided range.
 */
function resolveViewportScaleRange(
  input?: CanvasViewportScaleRange,
): CanvasViewportScaleRange {
  const min = input?.min
  const max = input?.max

  if (
    !(Number.isFinite(min) && Number.isFinite(max))
    || (min as number) <= 0
    || (max as number) <= (min as number)
  ) {
    return {
      min: MIN_VIEWPORT_SCALE,
      max: MAX_VIEWPORT_SCALE,
    }
  }

  return {
    min: min as number,
    max: max as number,
  }
}

