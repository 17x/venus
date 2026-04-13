// Zoom policy
export {
  RUNTIME_ZOOM_PRESETS,
  resolveRuntimeZoomGestureScale,
  resolveRuntimeZoomPresetScale,
  type RuntimeZoomDirection,
  type RuntimeZoomInputSource,
  type RuntimeZoomPreset,
} from './zoomPresets.ts'
export {
  resolveEngineCanvasLodProfile as resolveCanvasLodProfile,
} from '@venus/engine'
export type {
  EngineCanvasLodProfile as CanvasLodProfile,
  EngineCanvasLodProfileInput as CanvasLodProfileInput,
} from '@venus/engine'
// Marquee selection
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
} from './marqueeSelection.ts'
export {
  createMarqueeSelectionApplyController,
  type MarqueeSelectionApplyController,
} from './marqueeApplyController.ts'
// Selection handles
export {
  buildSelectionHandlesFromBounds,
  pickSelectionHandleAtPoint,
  type SelectionHandle,
  type SelectionHandleBounds,
  type SelectionHandleKind,
  type SelectionHandlePoint,
} from './selectionHandles.ts'
export { collectResizeTransformTargets } from './transformTargets.ts'
// Snapping
export {
  resolveMoveSnapPreview,
  type MoveSnapOptions,
  type SnapAxis,
  type SnapGuide,
  resolveSnapGuideLines,
  type SnapGuideLine,
} from './snapping.ts'
// Viewport gestures
export {
  bindViewportGestures,
  type ViewportGestureBindingOptions,
} from './viewportGestures.ts'
export {
  createDefaultCanvasInteractions,
  type CreateDefaultCanvasInteractionsOptions,
  type DefaultCanvasInteractionRuntime,
  type DefaultCanvasInteractions,
} from './defaultInteractions.ts'
// Transform preview
export {
  applyTransformPreviewGeometryToShape,
  buildGroupAwareTransformPreviewMap,
  type BuildTransformPreviewMapOptions,
  type TransformPreviewGeometry,
  type TransformPreviewRuntimeShape,
  type TransformPreviewRuntimeSnapshot,
  resolveTransformPreviewRuntimeState,
} from './transformPreview.ts'
// Drag session
export {
  createSelectionDragController,
  type SelectionDragController,
  type SelectionDragModifiers,
  type SelectionDragMoveResult,
  type SelectionDragSession,
  type SelectionDragShapeState,
  type SelectionDragSnapshot,
} from './selectionDragController.ts'
export { hasSelectedAncestorInDocument } from './selectionHierarchy.ts'
// Hit test
export {
  resolveTopHitShapeId,
  type ResolveTopHitShapeIdOptions,
} from './shapeHitTest.ts'
// Overlay hover
export {
  resolveHoverShape,
  resolveHoverShape as resolveOverlayHoverShapeId,
  resolveHoverShape as resolveOverlayHoverShapeIdCompat,
} from './overlay/hover.ts'
export type {
  ResolveHoverShapeOptions,
  ResolveHoverShapeOptions as ResolveOverlayHoverShapeIdOptions,
  ResolveHoverShapeOptions as ResolveOverlayHoverShapeIdCompatOptions,
} from './overlay/hover.ts'
// Selection policies
export {
  shouldClearSelectionOnPointerDown,
  shouldPreserveGroupDragSelection,
  type ShouldClearSelectionOnPointerDownOptions,
  type ShouldPreserveGroupDragSelectionOptions,
} from './selectionPointerPolicy.ts'
export {
  resolveSelectedNodesByIds,
  resolveSingleSelectedRotation,
} from './selectionResolve.ts'
// Handle resolve
export {
  resolveSelectionHandleHitAtPoint,
  type ResolveSelectionHandleHitOptions,
  type ResolveSelectionHandleHitResult,
} from './selectionHandleResolve.ts'
// Transform resolve helpers
export {
  resolveDragStartTransformPayload,
  resolveSnappedTransformPreview,
  type DragStartTransformPayload,
} from './transformPreviewResolve.ts'
// Pointer-up commits
export {
  resolvePointerUpTransformCommit,
  resolvePointerUpMarqueeSelection,
  type PointerUpTransformCommitResult,
  type PointerUpMarqueeSelectionResult,
} from './pointerUpResolve.ts'
// Transform session core
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
} from './transformSessionManager.ts'
