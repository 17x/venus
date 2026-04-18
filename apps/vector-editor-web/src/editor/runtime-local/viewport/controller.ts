import {
  DEFAULT_ENGINE_VIEWPORT,
  clampEngineViewportScale,
  fitEngineViewportToDocument,
  panEngineViewportState,
  resolveEngineViewportState,
  resizeEngineViewportState,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
  type EngineViewportFitDocumentLike,
} from '@venus/engine'

// Compatibility bridge: viewport mechanism ownership moved to @venus/engine.
// Runtime keeps historical names so existing app/runtime imports remain stable.
export type CanvasViewportState = EngineCanvasViewportState

export const DEFAULT_VIEWPORT = DEFAULT_ENGINE_VIEWPORT

export function clampViewportScale(scale: number) {
  return clampEngineViewportScale(scale)
}

export function resolveViewportState(
  viewport: Pick<CanvasViewportState, 'offsetX' | 'offsetY' | 'scale' | 'viewportWidth' | 'viewportHeight'>,
): CanvasViewportState {
  return resolveEngineViewportState(viewport)
}

export function fitViewportToDocument(
  document: EngineViewportFitDocumentLike,
  viewport: CanvasViewportState,
): CanvasViewportState {
  return fitEngineViewportToDocument(document, viewport)
}

export function panViewportState(
  viewport: CanvasViewportState,
  deltaX: number,
  deltaY: number,
): CanvasViewportState {
  return panEngineViewportState(viewport, deltaX, deltaY)
}

export function resizeViewportState(
  viewport: CanvasViewportState,
  width: number,
  height: number,
): CanvasViewportState {
  return resizeEngineViewportState(viewport, width, height)
}

export function zoomViewportState(
  viewport: CanvasViewportState,
  nextScale: number,
  anchor?: {x: number; y: number},
): CanvasViewportState {
  return zoomEngineViewportState(viewport, nextScale, anchor)
}
