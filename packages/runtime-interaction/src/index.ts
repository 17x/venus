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
