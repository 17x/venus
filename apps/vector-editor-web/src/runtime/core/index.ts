export {
  createCanvasRuntimeController,
  type CanvasRuntimeController,
  type CanvasRuntimeControllerOptions,
  type CanvasRuntimeSnapshot,
} from './createCanvasRuntimeController.ts'
export {
  createCanvasRuntimeKit,
  type CanvasRuntimeKit,
  type CanvasRuntimeKitEngineBridge,
  type CanvasRuntimeKitEventMap,
  type CanvasRuntimeKitRenderRequest,
  type CanvasRuntimeLayerRegistration,
  type CreateCanvasRuntimeKitOptions,
} from './createCanvasRuntimeKit.ts'
export {
  createCanvasEditorInstance,
  type CanvasEditorInstance,
  type CanvasEditorInstanceOptions,
} from './createCanvasEditorInstance.ts'
// Expose presentation/runtime API contracts through the facade core barrel.
export {
  createCanvasRuntimeApi,
  DEFAULT_CANVAS_PRESENTATION_CONFIG,
  type CanvasMarqueePresentationConfig,
  type CanvasOverlayPresentationConfig,
  type CanvasPresentationConfig,
  type CanvasPresentationConfigPatch,
  type CanvasRuntimeApi,
  type CanvasRuntimeApiOptions,
} from './createCanvasRuntimeApi.ts'
export {
  createDefaultCanvasRuntimeApi,
  type DefaultCanvasRuntimeApiOptions,
} from './defaultRuntimeApi.ts'
// Keep default runtime options and transform-preview commit contracts available at core entry.
export {
  createDefaultCanvasRuntimeInstanceOptions,
  resolveDefaultCanvasRuntimeModules,
  type DefaultCanvasRuntimeOptions,
} from './defaultRuntime.ts'
export {
  createTransformPreviewCommitController,
  isTransformPreviewSynced,
  type DocumentShapeGeometry,
  type TransformPreviewCommitController,
  type TransformPreviewState,
} from './transformPreviewCommitController.ts'
// All runtime core modules now live directly under runtime/core after the
// runtime-local fusion hard-cut.
export {
  createCanvasSnapshotStore,
  selectCanvasSnapshot,
  type CanvasSnapshotStore,
} from './snapshotStore.ts'
