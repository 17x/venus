export {
  createCanvasRuntimeController,
  type CanvasRuntimeController,
  type CanvasRuntimeControllerOptions,
  type CanvasRuntimeSnapshot,
} from './runtime/createCanvasRuntimeController.ts'
export {
  createCanvasEditorInstance,
  type CanvasEditorInstance,
  type CanvasEditorInstanceOptions,
} from './runtime/createCanvasEditorInstance.ts'
export {
  createCanvasViewerController,
  type CanvasViewerController,
  type CanvasViewerControllerOptions,
  type CanvasViewerSnapshot,
} from './runtime/createCanvasViewerController.ts'
export {
  createCanvasViewerInstance,
  type CanvasViewerInstance,
  type CanvasViewerInstanceOptions,
} from './runtime/createCanvasViewerInstance.ts'
export {
  createCanvasModuleRunner,
  type CanvasEditorModulePointerEvent,
  type CanvasModuleContext,
  type CanvasModuleRunner,
  type CanvasRuntimeModule,
  type CanvasViewerModulePointerEvent,
} from './runtime/modules.ts'
export {
  createCanvasElementRegistry,
  type CanvasElementBehavior,
  type CanvasElementBounds,
  type CanvasElementHitTestContext,
  type CanvasElementNodeBase,
  type CanvasElementRegistry,
  type CanvasElementRenderContext,
  type CanvasSnapSource,
} from './extensibility/elements.ts'
export type { CanvasViewportState } from './viewport/types.ts'
// Compatibility bridge: runtime keeps the historical time/animation export
// names while mechanism ownership now lives in `@venus/engine`.
export type {
  EngineAnimationController as AnimationController,
  EngineAnimationId as AnimationId,
  EngineAnimationSpec as AnimationSpec,
  EngineClock as RuntimeClock,
  EngineEasingDefinition as EasingDefinition,
  EngineEasingFunction as EasingFunction,
  EngineEasingName as EasingName,
  EngineFrameHandle as FrameHandle,
  EngineFrameInfo as FrameInfo,
} from '@venus/engine'
export {
  createEngineAnimationController as createAnimationController,
  createSystemEngineClock as createSystemRuntimeClock,
} from '@venus/engine'
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
export {
  applyMatrixToPoint,
  type Mat3,
  type Point2D,
} from './viewport/matrix.ts'
export {
  applyViewportPreviewTransform,
  resolveViewportPreviewOverscan,
} from './viewport/preview.ts'
