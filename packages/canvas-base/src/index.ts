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
export { CanvasViewport } from './react/CanvasViewport.tsx'
export { useCanvasRuntime } from './react/useCanvasRuntime.ts'
export type { CanvasRenderer, CanvasRendererProps } from './renderer/types.ts'
export type { CanvasViewportState } from './viewport/types.ts'
export type { ViewportGestureBindingOptions } from './gesture/index.ts'
export { bindViewportGestures } from './gesture/index.ts'
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
