import {
  DEFAULT_ENGINE_VIEWPORT,
  clampEngineViewportScale,
  fitEngineViewportToDocument,
  panEngineViewportState,
  resolveEngineViewportState,
  resizeEngineViewportState,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
  type EngineViewportScaleRange,
  type EngineViewportFitDocumentLike,
} from '@venus/engine'

// Runtime viewport API keeps historical naming while delegating mechanism ownership to engine.
export type CanvasViewportState = EngineCanvasViewportState

// Runtime viewport zoom bounds stay app-owned so vector can widen range safely.
export type CanvasViewportScaleRange = EngineViewportScaleRange

export const DEFAULT_VIEWPORT = DEFAULT_ENGINE_VIEWPORT

// Vector runtime keeps a wider zoom envelope than the shared engine defaults.
export const DEFAULT_VIEWPORT_SCALE_RANGE: CanvasViewportScaleRange = {
  min: 0.01,
  max: 640,
}

// Clamp viewport scale through engine defaults so product/runtime behavior stays consistent.
export function clampViewportScale(
  scale: number,
  scaleRange: CanvasViewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
) {
  return clampEngineViewportScale(scale, scaleRange)
}

// Normalize partial viewport input into a full runtime viewport state.
export function resolveViewportState(
  viewport: Pick<CanvasViewportState, 'offsetX' | 'offsetY' | 'scale' | 'viewportWidth' | 'viewportHeight'>,
): CanvasViewportState {
  return resolveEngineViewportState(viewport)
}

// Fit document bounds into the current viewport using engine-owned fit policy.
export function fitViewportToDocument(
  document: EngineViewportFitDocumentLike,
  viewport: CanvasViewportState,
  scaleRange: CanvasViewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
): CanvasViewportState {
  return fitEngineViewportToDocument(document, viewport, scaleRange)
}

// Apply pan deltas to the viewport while preserving runtime viewport invariants.
export function panViewportState(
  viewport: CanvasViewportState,
  deltaX: number,
  deltaY: number,
): CanvasViewportState {
  return panEngineViewportState(viewport, deltaX, deltaY)
}

// Apply viewport resize dimensions without mutating the previous viewport object.
export function resizeViewportState(
  viewport: CanvasViewportState,
  width: number,
  height: number,
): CanvasViewportState {
  return resizeEngineViewportState(viewport, width, height)
}

// Apply zoom around an optional anchor point to preserve pointer-centric zoom behavior.
export function zoomViewportState(
  viewport: CanvasViewportState,
  nextScale: number,
  anchor?: {x: number; y: number},
  scaleRange: CanvasViewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
): CanvasViewportState {
  return zoomEngineViewportState(viewport, nextScale, anchor, scaleRange)
}

