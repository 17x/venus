export { collectResizeTransformTargets } from './transformTargets.ts'
// Snapping
export {
  type SnapGuide,
  resolveSnapGuideLines,
} from './snapping.ts'
// Viewport gestures
export {
  bindViewportGestures,
  type ViewportGestureBindingOptions,
} from './viewportGestures.ts'
export {
  createDefaultCanvasInteractions,
  type DefaultCanvasInteractions,
} from './defaultInteractions.ts'
// Transform preview
export {
  resolveTransformPreviewRuntimeState,
} from './transformPreview.ts'
// Drag session
export {
  createSelectionDragController,
  type SelectionDragController,
} from './selectionDragController.ts'
// Selection policies
export {
  shouldClearSelectionOnPointerDown,
  shouldPreserveGroupDragSelection,
} from './selectionPointerPolicy.ts'
// Transform resolve helpers
export {
  resolveDragStartTransformPayload,
  resolveSnappedTransformPreview,
} from './transformPreviewResolve.ts'
// Pointer-up commits
export {
  resolvePointerUpTransformCommit,
} from './pointerUpResolve.ts'
// Transform session core
export {
  createTransformBatchCommand,
  createTransformPreviewShape,
  createTransformSessionShape,
  createTransformSessionManager,
  type TransformPreview,
  type TransformPreviewShape,
} from './transformSessionManager.ts'
// Runtime zoom presets re-export — runtime fusion now owns the canonical interaction barrel.
export {
  RUNTIME_ZOOM_PRESETS,
  resolveRuntimeZoomPresetScale,
} from './zoomPresets.ts'

// Pure interaction types (selection state, draft primitives, path sub-selection)
// migrated from former product/interaction; runtime owns these definitions now.
export type {
  DraftPrimitive,
  DraftPrimitiveType,
  HandleKind,
  InteractionBounds,
  PathSubSelection,
} from './productInteractionTypes.ts'
// Selection helpers used by product hooks for derived state.
export {buildSelectionState} from './selection/selectionManager.ts'
