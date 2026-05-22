import type { Mat3, Point2D } from '../math/index.ts'

/**
 * Fully resolved viewport state used by runtime, interaction, and renderer.
 */
export interface CanvasViewportState {
  /** Stores matrix that maps world to screen coordinates. */
  matrix: Mat3
  /** Stores matrix that maps screen to world coordinates. */
  inverseMatrix: Mat3
  /** Stores horizontal screen-space translation offset. */
  offsetX: number
  /** Stores vertical screen-space translation offset. */
  offsetY: number
  /** Stores world-to-screen scale factor. */
  scale: number
  /** Stores current viewport width in CSS pixels. */
  viewportWidth: number
  /** Stores current viewport height in CSS pixels. */
  viewportHeight: number
}

/**
 * Declares width/height payload accepted by fit-to-document operations.
 */
export interface ViewportFitDocumentLike {
  /** Stores document width in world units. */
  width: number
  /** Stores document height in world units. */
  height: number
}

/**
 * Configures min/max clamp values used by viewport zoom helpers.
 */
export interface ViewportScaleRange {
  /** Stores the smallest allowed viewport scale. */
  min: number
  /** Stores the largest allowed viewport scale. */
  max: number
}

/**
 * Stores pointer pan offset in screen-space units.
 */
export interface ViewportPanOffset {
  /** Stores horizontal pan offset. */
  x: number
  /** Stores vertical pan offset. */
  y: number
}

/**
 * Stores pointer pan origin tracked during drag-pan sessions.
 */
export interface ViewportPanOrigin {
  /** Stores origin x coordinate in screen space. */
  x: number
  /** Stores origin y coordinate in screen space. */
  y: number
  /** Stores pointer id currently owning the pan session. */
  pointerId: number
}

/**
 * Declares wheel input payload used by zoom normalizers.
 */
export interface ZoomWheelInput {
  /** Stores pointer client x coordinate. */
  clientX: number
  /** Stores pointer client y coordinate. */
  clientY: number
  /** Stores ctrl key state. */
  ctrlKey: boolean
  /** Stores meta key state. */
  metaKey: boolean
  /** Stores wheel delta mode from browser input. */
  deltaMode: number
  /** Stores wheel horizontal delta. */
  deltaX: number
  /** Stores wheel vertical delta. */
  deltaY: number
  /** Stores optional event timestamp. */
  timeStamp?: number
}

/**
 * Enumerates normalized zoom input source categories.
 */
export type ZoomInputSource = 'mouse' | 'trackpad'

/**
 * Declares normalized zoom delta payload returned by wheel normalization.
 */
export interface NormalizedZoomDelta {
  /** Stores zoom anchor in screen-space coordinates. */
  anchor: Point2D
  /** Stores multiplicative zoom factor delta. */
  delta: number
  /** Stores detected input source category. */
  source: ZoomInputSource
  /** Stores optional source event timestamp. */
  timeStamp?: number
}

/**
 * Declares mutable zoom session state carried across wheel events.
 */
export interface ZoomSessionState {
  /** Stores whether the session is currently active. */
  active: boolean
  /** Stores latest accumulated zoom factor. */
  factor: number
  /** Stores latest zoom anchor or null when inactive. */
  anchor: Point2D | null
  /** Stores latest event timestamp. */
  lastEventAt: number
  /** Stores latest detected input source or null when inactive. */
  source: ZoomInputSource | null
}

/**
 * Declares high-level zoom wheel handling result payload.
 */
export interface ZoomWheelResult {
  /** Stores updated zoom session state. */
  session: ZoomSessionState
  /** Stores zoom factor for the current wheel event. */
  factor: number
  /** Stores zoom anchor for the current wheel event. */
  anchor: Point2D
  /** Stores settle delay in milliseconds used by runtime policies. */
  settleDelay: number
  /** Stores detected input source category. */
  source: ZoomInputSource
}

/**
 * Stores initial viewport before concrete canvas size measurement.
 */
export const DEFAULT_VIEWPORT: CanvasViewportState = {
  matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  viewportWidth: 1,
  viewportHeight: 1,
}

/**
 * Stores shared viewport clamp defaults used by zoom helpers.
 */
export const DEFAULT_VIEWPORT_SCALE_RANGE: ViewportScaleRange = {
  min: 0.02,
  max: 32,
}

/**
 * Stores initial zoom session state before wheel interaction begins.
 */
export const DEFAULT_ZOOM_SESSION: ZoomSessionState = {
  active: false,
  factor: 1,
  anchor: null,
  lastEventAt: 0,
  source: null,
}

/**
 * Clamps one viewport zoom to a shared safe interaction envelope.
 * @param scale Candidate scale value.
 * @param scaleRange Optional custom scale range.
 */
export function clampViewportScale(
  scale: number,
  scaleRange: ViewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
): number {
  const clampedMin = Math.max(0.0001, scaleRange.min)
  const clampedMax = Math.max(clampedMin, scaleRange.max)
  if (!Number.isFinite(scale)) {
    return clampedMin
  }
  return Math.min(clampedMax, Math.max(clampedMin, scale))
}

/**
 * Rebuilds one viewport matrix from scale and screen-space offsets.
 * @param scale World-to-screen scale.
 * @param offsetX Horizontal screen-space translation.
 * @param offsetY Vertical screen-space translation.
 */
function createViewportMatrix(scale: number, offsetX: number, offsetY: number): Mat3 {
  return [scale, 0, offsetX, 0, scale, offsetY, 0, 0, 1]
}

/**
 * Rebuilds one viewport inverse matrix from scale and screen-space offsets.
 * @param scale World-to-screen scale.
 * @param offsetX Horizontal screen-space translation.
 * @param offsetY Vertical screen-space translation.
 */
function createViewportInverseMatrix(scale: number, offsetX: number, offsetY: number): Mat3 {
  const safeScale = Math.max(0.0001, scale)
  const inverseScale = 1 / safeScale
  return [
    inverseScale,
    0,
    -offsetX * inverseScale,
    0,
    inverseScale,
    -offsetY * inverseScale,
    0,
    0,
    1,
  ]
}

/**
 * Resolves one normalized viewport state with rebuilt derived matrices.
 * @param viewport Raw viewport scalar and dimension fields.
 */
export function resolveViewportState(viewport: Pick<CanvasViewportState, 'offsetX' | 'offsetY' | 'scale' | 'viewportWidth' | 'viewportHeight'>): CanvasViewportState {
  const scale = clampViewportScale(viewport.scale)
  const viewportWidth = Math.max(1, viewport.viewportWidth)
  const viewportHeight = Math.max(1, viewport.viewportHeight)
  const offsetX = Number.isFinite(viewport.offsetX) ? viewport.offsetX : 0
  const offsetY = Number.isFinite(viewport.offsetY) ? viewport.offsetY : 0

  return {
    matrix: createViewportMatrix(scale, offsetX, offsetY),
    inverseMatrix: createViewportInverseMatrix(scale, offsetX, offsetY),
    offsetX,
    offsetY,
    scale,
    viewportWidth,
    viewportHeight,
  }
}

/**
 * Fits one document-like rect into viewport area with shared padding behavior.
 * @param document Document-like width/height payload.
 * @param viewport Current viewport state.
 * @param scaleRange Optional custom scale range.
 */
export function fitViewportToDocument(
  document: ViewportFitDocumentLike,
  viewport: CanvasViewportState,
  scaleRange: ViewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
): CanvasViewportState {
  const docWidth = Math.max(1, document.width)
  const docHeight = Math.max(1, document.height)
  const edgePadding = Math.max(0, Math.min(viewport.viewportWidth, viewport.viewportHeight) * 0.1)
  const availableWidth = Math.max(1, viewport.viewportWidth - edgePadding * 2)
  const availableHeight = Math.max(1, viewport.viewportHeight - edgePadding * 2)
  const fittedScale = clampViewportScale(
    Math.min(availableWidth / docWidth, availableHeight / docHeight),
    scaleRange,
  )

  const offsetX = (viewport.viewportWidth - docWidth * fittedScale) / 2
  const offsetY = (viewport.viewportHeight - docHeight * fittedScale) / 2

  return resolveViewportState({
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
    offsetX,
    offsetY,
    scale: fittedScale,
  })
}

/**
 * Applies one screen-space pan delta to viewport offsets.
 * @param viewport Current viewport state.
 * @param deltaX Horizontal screen-space pan delta.
 * @param deltaY Vertical screen-space pan delta.
 */
export function panViewportState(
  viewport: CanvasViewportState,
  deltaX: number,
  deltaY: number,
): CanvasViewportState {
  // Keep pre-measure cold-start stable by ignoring pan before viewport dimensions are known.
  if (viewport.viewportWidth <= 1 || viewport.viewportHeight <= 1) {
    return resolveViewportState(viewport)
  }

  return resolveViewportState({
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
    offsetX: viewport.offsetX + deltaX,
    offsetY: viewport.offsetY + deltaY,
    scale: viewport.scale,
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
    viewportWidth: width,
    viewportHeight: height,
    offsetX: viewport.offsetX,
    offsetY: viewport.offsetY,
    scale: viewport.scale,
  })
}

/**
 * Clamps one zoom anchor into the measured viewport rectangle.
 * @param viewport Current viewport state.
 * @param anchor Candidate screen-space anchor.
 */
function clampZoomAnchor(viewport: CanvasViewportState, anchor: Point2D): Point2D {
  return {
    x: Math.min(viewport.viewportWidth, Math.max(0, anchor.x)),
    y: Math.min(viewport.viewportHeight, Math.max(0, anchor.y)),
  }
}

/**
 * Zooms around one optional screen-space anchor and keeps anchor world-point stable.
 * @param viewport Current viewport state.
 * @param nextScale Candidate next scale.
 * @param anchor Optional screen-space zoom anchor.
 * @param scaleRange Optional custom scale range.
 */
export function zoomViewportState(
  viewport: CanvasViewportState,
  nextScale: number,
  anchor: Point2D = { x: viewport.viewportWidth / 2, y: viewport.viewportHeight / 2 },
  scaleRange: ViewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
): CanvasViewportState {
  const clampedScale = clampViewportScale(nextScale, scaleRange)
  const clampedAnchor = clampZoomAnchor(viewport, anchor)

  const worldAnchorX = (clampedAnchor.x - viewport.offsetX) / viewport.scale
  const worldAnchorY = (clampedAnchor.y - viewport.offsetY) / viewport.scale

  const offsetX = clampedAnchor.x - worldAnchorX * clampedScale
  const offsetY = clampedAnchor.y - worldAnchorY * clampedScale

  return resolveViewportState({
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
    offsetX,
    offsetY,
    scale: clampedScale,
  })
}

/**
 * Seeds one pointer-pan session from pointerdown coordinates.
 * @param input Pointerdown payload.
 */
export function createViewportPanOrigin(input: {
  /** Stores pointer x coordinate in screen space. */
  x: number
  /** Stores pointer y coordinate in screen space. */
  y: number
  /** Stores pointer id for ownership checks. */
  pointerId: number
}): ViewportPanOrigin {
  return {
    x: input.x,
    y: input.y,
    pointerId: input.pointerId,
  }
}

/**
 * Converts one wheel input delta into accumulated viewport pan offset.
 * @param offset Existing pan offset accumulator.
 * @param input Wheel delta payload.
 */
export function accumulateWheelPanOffset(
  offset: ViewportPanOffset,
  input: {
    /** Stores wheel horizontal delta. */
    deltaX: number
    /** Stores wheel vertical delta. */
    deltaY: number
  },
): ViewportPanOffset {
  return {
    x: offset.x - input.deltaX,
    y: offset.y - input.deltaY,
  }
}

/**
 * Updates one pointer-pan accumulator and origin from pointermove input.
 * @param offset Existing pan offset accumulator.
 * @param origin Existing pointer-pan origin.
 * @param pointer Pointer move payload.
 */
export function accumulatePointerPanOffset(
  offset: ViewportPanOffset,
  origin: ViewportPanOrigin,
  pointer: {
    /** Stores pointer x coordinate in screen space. */
    x: number
    /** Stores pointer y coordinate in screen space. */
    y: number
    /** Stores pointer id used for ownership checks. */
    pointerId: number
  },
): { offset: ViewportPanOffset; origin: ViewportPanOrigin } {
  if (pointer.pointerId !== origin.pointerId) {
    return {
      offset,
      origin,
    }
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
      pointerId: origin.pointerId,
    },
  }
}

/**
 * Detects one zoom input source from wheel delta profile.
 * @param input Wheel delta profile.
 */
export function detectZoomInputSource(
  input: Pick<ZoomWheelInput, 'deltaMode' | 'deltaX' | 'deltaY'>,
): ZoomInputSource {
  const absoluteY = Math.abs(input.deltaY)
  const absoluteX = Math.abs(input.deltaX)
  if (input.deltaMode === 0 && absoluteY < 16 && absoluteX < 16) {
    return 'trackpad'
  }
  return 'mouse'
}

/**
 * Normalizes one wheel input into a stable multiplicative zoom delta.
 * @param input Raw wheel payload.
 */
export function normalizeZoomDelta(input: ZoomWheelInput): NormalizedZoomDelta {
  const source = detectZoomInputSource(input)
  const dominantAxisDelta = Math.abs(input.deltaY) >= Math.abs(input.deltaX)
    ? input.deltaY
    : input.deltaX

  const normalizedDelta = input.deltaMode === 1
    ? dominantAxisDelta * 16
    : input.deltaMode === 2
      ? dominantAxisDelta * 100
      : dominantAxisDelta

  const delta = Math.exp(-normalizedDelta / 300)

  return {
    anchor: { x: input.clientX, y: input.clientY },
    delta,
    source,
    timeStamp: input.timeStamp,
  }
}

/**
 * Accumulates one zoom session update into stable session state.
 * @param session Existing zoom session state.
 * @param update Normalized zoom update payload.
 */
export function accumulateZoomSession(
  session: ZoomSessionState,
  update: {
    /** Stores current zoom anchor. */
    anchor: { x: number; y: number }
    /** Stores current zoom factor. */
    factor: number
    /** Stores current zoom source category. */
    source: ZoomInputSource
    /** Stores optional event timestamp. */
    timeStamp?: number
  },
): ZoomSessionState {
  return {
    active: true,
    factor: update.factor,
    anchor: { x: update.anchor.x, y: update.anchor.y },
    lastEventAt: update.timeStamp ?? session.lastEventAt,
    source: update.source,
  }
}

/**
 * Resolves one zoom settle delay from detected zoom source category.
 * @param source Optional zoom source category.
 */
export function getZoomSettleDelay(source: ZoomInputSource | null): 120 | 72 {
  return source === 'trackpad' ? 72 : 120
}

/**
 * Resets zoom session state to shared defaults.
 */
export function resetZoomSession(): ZoomSessionState {
  return {
    ...DEFAULT_ZOOM_SESSION,
  }
}

/**
 * Handles one zoom wheel event and returns normalized factor plus next session state.
 * @param session Existing zoom session state.
 * @param input Raw wheel input payload.
 */
export function handleZoomWheel(
  session: ZoomSessionState,
  input: ZoomWheelInput,
): ZoomWheelResult {
  const normalized = normalizeZoomDelta(input)
  const nextSession = accumulateZoomSession(session, {
    anchor: normalized.anchor,
    factor: normalized.delta,
    source: normalized.source,
    timeStamp: normalized.timeStamp,
  })

  return {
    session: nextSession,
    factor: normalized.delta,
    anchor: normalized.anchor,
    settleDelay: getZoomSettleDelay(normalized.source),
    source: normalized.source,
  }
}
