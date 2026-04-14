export {
  createCanvasRuntimeController,
  type CanvasRuntimeController,
  type CanvasRuntimeControllerOptions,
  type CanvasRuntimeSnapshot,
} from './core/createCanvasRuntimeController.ts'
export {
  createCanvasRuntimeKit,
  type CanvasRuntimeKit,
  type CanvasRuntimeKitEngineBridge,
  type CanvasRuntimeKitEventMap,
  type CanvasRuntimeKitRenderRequest,
  type CanvasRuntimeLayerRegistration,
  type CreateCanvasRuntimeKitOptions,
} from './core/createCanvasRuntimeKit.ts'
export {
  createDefaultCanvasRuntimeInstanceOptions,
  resolveDefaultCanvasRuntimeModules,
  type DefaultCanvasRuntimeOptions,
} from './core/defaultRuntime.ts'
export {
  createTransformPreviewCommitController,
  isTransformPreviewSynced,
  type DocumentShapeGeometry,
  type TransformPreviewCommitController,
  type TransformPreviewState,
} from './core/transformPreviewCommitController.ts'
export {
  createSharedCanvasRuntimeConfig,
  type SharedCanvasRuntimeOptions,
} from './core/sharedRuntime.ts'
export {
  createCanvasSnapshotStore,
  selectCanvasSnapshot,
  type CanvasSnapshotStore,
} from './core/snapshotStore.ts'
export {
  createCanvasRuntimeApi,
  DEFAULT_CANVAS_PRESENTATION_CONFIG,
  type CanvasMarqueePresentationConfig,
  type CanvasOverlayPresentationConfig,
  type CanvasPresentationConfig,
  type CanvasPresentationConfigPatch,
  type CanvasRuntimeApi,
  type CanvasRuntimeApiOptions,
} from './core/createCanvasRuntimeApi.ts'
export {
  createDefaultCanvasRuntimeApi,
  type DefaultCanvasRuntimeApiOptions,
} from './core/defaultRuntimeApi.ts'
export {
  createCanvasTsRuntime,
  createCanvasTsRuntime as createTsRuntime,
  type CanvasTsRuntime,
  type CanvasTsRuntime as TsRuntime,
  type CanvasTsRuntimeEventMap,
  type CanvasTsRuntimeEventMap as TsRuntimeEventMap,
  type CanvasTsRuntimeInboundMessage,
  type CanvasTsRuntimeInboundMessage as TsRuntimeInboundMessage,
  type CanvasTsRuntimeNetworkBridge,
  type CanvasTsRuntimeNetworkBridge as TsRuntimeNetworkBridge,
  type CanvasTsRuntimeOutboundMessage,
  type CanvasTsRuntimeOutboundMessage as TsRuntimeOutboundMessage,
  type CreateCanvasTsRuntimeOptions,
  type CreateCanvasTsRuntimeOptions as CreateTsRuntimeOptions,
} from './core/createCanvasTsRuntime.ts'
export {
  createRuntimeGestureInterpreter,
  createRuntimeGestureInterpreter as createGestureInterpreter,
  type RuntimeGestureInterpreter,
  type RuntimeGestureInterpreter as GestureInterpreter,
  type RuntimeGestureInterpreterOptions,
  type RuntimeGestureInterpreterOptions as GestureInterpreterOptions,
  type RuntimeGesturePointerInput,
  type RuntimeGesturePointerInput as GesturePointerInput,
  type RuntimeGestureWheelInput,
  type RuntimeGestureWheelInput as GestureWheelInput,
} from './gesture/createRuntimeGestureInterpreter.ts'
export {
  createRuntimeToolRegistry,
  type RuntimeToolHandler,
  type RuntimeToolHandlerContext,
  type RuntimeToolKeyboardEvent,
  type RuntimeToolOverlayData,
  type RuntimeToolPointerEvent,
  type RuntimeToolRegistry,
  type RuntimeToolStatusHint,
} from './tools/index.ts'
export {
  createRuntimeEditingModeController,
  type RuntimeEditingMode,
  type RuntimeEditingModeController,
  type RuntimeEditingModeListener,
  type RuntimeEditingModeTransition,
} from './editing-modes/index.ts'
export {
  createCanvasEditorInstance,
  type CanvasEditorInstance,
  type CanvasEditorInstanceOptions,
} from './core/createCanvasEditorInstance.ts'
export {
  createCanvasViewerController,
  type CanvasViewerController,
  type CanvasViewerControllerOptions,
  type CanvasViewerSnapshot,
} from './core/createCanvasViewerController.ts'
export {
  createCanvasViewerInstance,
  type CanvasViewerInstance,
  type CanvasViewerInstanceOptions,
} from './core/createCanvasViewerInstance.ts'
export {
  createCanvasModuleRunner,
  type CanvasEditorModulePointerEvent,
  type CanvasModuleContext,
  type CanvasModuleRunner,
  type CanvasRuntimeModule,
  type CanvasViewerModulePointerEvent,
} from './core/modules.ts'
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
export * from './shared-memory/index.ts'
