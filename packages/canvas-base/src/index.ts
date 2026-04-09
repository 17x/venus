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
  buildSelectionHandlesFromBounds,
  pickSelectionHandleAtPoint,
  type SelectionHandle,
  type SelectionHandleBounds,
  type SelectionHandleKind,
  type SelectionHandlePoint,
} from './interaction/selectionHandles.ts'
export { collectResizeTransformTargets } from './interaction/transformTargets.ts'
export {
  resolveMoveSnapPreview,
  type MoveSnapOptions,
  type SnapAxis,
  type SnapGuide,
  resolveSnapGuideLines,
  type SnapGuideLine,
} from './interaction/snapping.ts'
export {
  applyTransformPreviewGeometryToShape,
  buildGroupAwareTransformPreviewMap,
  type BuildTransformPreviewMapOptions,
  type TransformPreviewGeometry,
  type TransformPreviewRuntimeShape,
  type TransformPreviewRuntimeSnapshot,
  resolveTransformPreviewRuntimeState,
} from './interaction/transformPreview.ts'
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
  buildTransformBatch,
  createTransformBatchCommand,
  createTransformPreviewShape,
  createTransformSessionShape,
  createTransformSessionManager,
  type TransformBounds,
  type TransformBatchItem,
  type TransformHandleKind,
  type TransformPoint,
  type TransformPreview,
  type TransformPreviewShape,
  type TransformSession,
  type TransformSessionShape,
} from './interaction/transformSessionManager.ts'
export {
  useTransformPreviewCommitState,
  isTransformPreviewSynced,
} from './react/useTransformPreviewCommitState.ts'
export {
  createMarqueeState,
  updateMarqueeState,
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  getNormalizedBounds as getMarqueeNormalizedBounds,
  intersectsBounds as intersectsMarqueeBounds,
  containsBounds as containsMarqueeBounds,
  type MarqueeBounds,
  type MarqueeApplyMode,
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
export {
  applyMatrixToPoint,
  type Mat3,
  type Point2D,
} from './viewport/matrix.ts'
export {
  createSnapModule,
  SNAP_PRESET_BOUNDS,
  SNAP_PRESET_OFF,
  SNAP_PRESET_PRECISION,
  type CanvasSnapConfig,
  type CanvasSnapModule,
  type SnapComputationResult,
  type SnapHintDescriptor,
  type SnapMatch,
  type SnapTargetKind,
} from './presets/snapping.ts'
export {
  createSelectionModule,
  DEFAULT_SELECTION_CONFIG,
  type CanvasSelectionConfig,
  type CanvasSelectionModule,
  type SelectionAltClickBehavior,
  type SelectionInputPolicy,
  type SelectionMarqueeMatchMode,
  type SelectionMarqueePolicy,
  type SelectionSetMode,
} from './presets/selection.ts'
export { createDefaultEditorModules } from './presets/defaultEditorModules.ts'
