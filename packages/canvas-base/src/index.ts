/**
 * Public entry for the shared canvas runtime layer.
 *
 * This package sits between app UI and concrete renderer/worker packages:
 * - apps consume the React hook and viewport component
 * - worker/renderers consume the shared runtime contracts
 * - viewport helpers stay reusable for tests and future editor apps
 */
export {
  createCanvasRuntimeController,
  type CanvasRuntimeController,
  type CanvasRuntimeControllerOptions,
  type CanvasRuntimeSnapshot,
} from './runtime/createCanvasRuntimeController.ts'
export {
  createCanvasViewerController,
  type CanvasViewerController,
  type CanvasViewerControllerOptions,
  type CanvasViewerSnapshot,
} from './runtime/createCanvasViewerController.ts'
export { CanvasViewport } from './react/CanvasViewport.tsx'
export { CanvasSelectionOverlay } from './react/CanvasSelectionOverlay.tsx'
export {
  useCanvasRuntime,
  useCanvasRuntimeSelector,
  useCanvasRuntimeStore,
  type CanvasRuntimeStore,
} from './react/useCanvasRuntime.ts'
export {
  useCanvasViewer,
  useCanvasViewerSelector,
  useCanvasViewerStore,
  type CanvasViewerStore,
} from './react/useCanvasViewer.ts'
export type {
  CanvasOverlayProps,
  CanvasOverlayRenderer,
  CanvasRenderer,
  CanvasRendererProps,
} from './renderer/types.ts'
export type { CanvasRenderLodLevel, CanvasRenderLodState } from './renderer/lod.ts'
export { resolveCanvasRenderLodState } from './renderer/lod.ts'
export type { CanvasViewportState } from './viewport/types.ts'
export type { ViewportGestureBindingOptions } from './gesture/index.ts'
export { bindViewportGestures } from './gesture/index.ts'
export {
  createSelectionDragController,
  type SelectionDragController,
  type SelectionDragModifiers,
  type SelectionDragMoveResult,
  type SelectionDragSession,
  type SelectionDragShapeState,
  type SelectionDragSnapshot,
} from './interaction/selectionDragController.ts'
export {
  createMarqueeState,
  updateMarqueeState,
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  getNormalizedBounds as getMarqueeNormalizedBounds,
  intersectsBounds as intersectsMarqueeBounds,
  containsBounds as containsMarqueeBounds,
  type MarqueeBounds,
  type MarqueePoint,
  type MarqueeSelectableShape,
  type MarqueeSelectionMatchMode,
  type MarqueeSelectionMode,
  type MarqueeState,
} from './interaction/marqueeSelection.ts'
export type {
  ZoomInputSource,
  ZoomWheelResult,
  ZoomSessionState,
  ZoomWheelInput,
} from './zoom/index.ts'
export {
  DEFAULT_ZOOM_SESSION,
  handleZoomWheel,
  resetZoomSession,
} from './zoom/index.ts'
export {
  DEFAULT_VIEWPORT,
  clampViewportScale,
  fitViewportToDocument,
  panViewportState,
  resizeViewportState,
  resolveViewportState,
  zoomViewportState,
} from './viewport/controller.ts'
