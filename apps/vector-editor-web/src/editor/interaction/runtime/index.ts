export {
  RUNTIME_ZOOM_PRESETS,
  resolveRuntimeZoomGestureScale,
  resolveRuntimeZoomPresetScale,
  type RuntimeZoomDirection,
  type RuntimeZoomInputSource,
  type RuntimeZoomPreset,
} from './zoomPresets.ts'

export {
  resolveCanvasLodProfile,
  type CanvasLodProfile,
  type CanvasLodProfileInput,
} from '@vector/runtime/interaction'

export {
  buildSelectionHandlesFromBounds,
  pickSelectionHandleAtPoint,
  type SelectionHandle,
  type SelectionHandleBounds,
  type SelectionHandleKind,
  type SelectionHandlePoint,
} from './selectionHandles.ts'

export {
  resolveMoveSnapPreview,
  resolveSnapGuideLines,
  type MoveSnapOptions,
  type SnapAxis,
  type SnapGuide,
  type SnapGuideLine,
  type TransformPreview,
} from './snapping.ts'

export {
  bindViewportGestures,
  type ViewportGestureBindingOptions,
} from './viewportGestures.ts'

export {
  createDefaultCanvasInteractions,
  createTransformBatchCommand,
  createTransformPreviewShape,
  createTransformSessionManager,
  createTransformSessionShape,
  resolveTransformPreviewRuntimeState,
} from '@vector/runtime/interaction'

export {
  createMarqueeSelectionApplyController,
  type MarqueeSelectionApplyController,
} from './marqueeApplyController.ts'

export {
  containsBounds,
  createMarqueeState,
  getNormalizedBounds,
  intersectsBounds,
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  updateMarqueeState,
  type MarqueeApplyMode,
  type MarqueeBounds,
  type MarqueePoint,
  type MarqueeSelectableShape,
  type MarqueeSelectionMatchMode,
  type MarqueeSelectionMode,
  type MarqueeState,
} from './marqueeSelection.ts'

export {
  createSelectionDragController,
  type SelectionDragController,
  type SelectionDragModifiers,
  type SelectionDragMoveResult,
  type SelectionDragSession,
  type SelectionDragShapeState,
  type SelectionDragSnapshot,
} from './selectionDragController.ts'

export {
  resolveTopHitShapeId,
  type ResolveTopHitShapeIdOptions,
} from './shapeHitTest.ts'

export {
  shouldClearSelectionOnPointerDown,
  shouldPreserveGroupDragSelection,
  type ShouldClearSelectionOnPointerDownOptions,
  type ShouldPreserveGroupDragSelectionOptions,
} from './selectionPointerPolicy.ts'

export {collectResizeTransformTargets} from './transformTargets.ts'

export {
  resolveSelectedNodesByIds,
  resolveSingleSelectedRotation,
} from './selectionResolve.ts'

export {
  resolveSelectionHandleHitAtPoint,
  type ResolveSelectionHandleHitOptions,
  type ResolveSelectionHandleHitResult,
} from './selectionHandleResolve.ts'

export {
  resolveDragStartTransformPayload,
  resolveSnappedTransformPreview,
  type DragStartTransformPayload,
} from './transformPreviewResolve.ts'

export {
  resolvePointerUpMarqueeSelection,
  resolvePointerUpTransformCommit,
  type PointerUpMarqueeSelectionResult,
  type PointerUpTransformCommitResult,
} from './pointerUpResolve.ts'

export type {
  CreateDefaultCanvasInteractionsOptions,
  DefaultCanvasInteractionRuntime,
  DefaultCanvasInteractions,
  TransformBatchItem,
  TransformBounds,
  TransformHandleKind,
  TransformPoint,
  TransformPreviewShape,
  TransformSession,
  TransformSessionShape,
} from '@vector/runtime/interaction'
