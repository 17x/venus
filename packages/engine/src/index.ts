export type {
  EngineAnimationController,
  EngineAnimationId,
  EngineAnimationSpec,
  EngineEasingDefinition,
  EngineEasingFunction,
  EngineEasingName,
} from './animation/index.ts'
export { createEngineAnimationController } from './animation/index.ts'
export type {
  EngineBackend,
  EngineRenderFrame,
  EngineRenderStats,
  EngineRenderer,
  EngineRendererCapabilities,
  EngineRendererContext,
  EngineRenderQuality,
  EngineResourceLoader,
  EngineTextLayout,
  EngineTextLayoutContext,
  EngineTextShaper,
  EngineViewportState,
} from './renderer/types.ts'
export type {
  EngineRenderBatch,
  EngineRenderPlan,
  EnginePreparedNode,
  EngineWorldMatrix,
} from './renderer/plan.ts'
export { prepareEngineRenderPlan } from './renderer/plan.ts'
export { createCanvas2DEngineRenderer } from './renderer/canvas2d.ts'
export type { Mat3, Point2D } from './math/matrix.ts'
export { applyMatrixToPoint } from './math/matrix.ts'
export type {
  EngineClipShape,
  EngineGroupNode,
  EngineImageNode,
  EngineNodeBase,
  EngineNodeId,
  EnginePoint,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineTextNode,
  EngineTextRun,
  EngineTextStyle,
  EngineTransform2D,
} from './scene/types.ts'
export type {
  EngineScenePatch,
  MutableEngineSceneState,
} from './scene/patch.ts'
export type { EngineHitTestResult } from './scene/hitTest.ts'
export {
  applyEngineScenePatch,
  createMutableEngineSceneState,
  flattenEngineSceneNodes,
  resolveNodeByFlattenedIndex,
} from './scene/patch.ts'
export { hitTestEngineSceneState } from './scene/hitTest.ts'
export type {
  EngineClock,
  EngineFrameHandle,
  EngineFrameInfo,
} from './time/index.ts'
export { createSystemEngineClock } from './time/index.ts'
export type { EngineRuntime } from './runtime/types.ts'
export type { EngineLoopController } from './runtime/createEngineLoop.ts'
export { createEngineLoop } from './runtime/createEngineLoop.ts'
export type {
  EngineWorkerCapabilities,
  EngineWorkerEnvironment,
  EngineWorkerMode,
  EngineWorkerModeResolution,
  ResolveEngineWorkerModeOptions,
} from './worker/capabilities.ts'
export {
  detectEngineWorkerCapabilities,
  resolveEngineWorkerMode,
} from './worker/capabilities.ts'
export type {
  EngineSpatialBounds,
  EngineSpatialIndex,
  EngineSpatialItem,
} from './spatial/index.ts'
export { createEngineSpatialIndex } from './spatial/index.ts'
export type {
  EngineMarqueeApplyMode,
  EngineMarqueeBounds,
  EngineMarqueePoint,
  EngineMarqueeSelectableShape,
  EngineMarqueeSelectionMatchMode,
  EngineMarqueeSelectionMode,
  EngineMarqueeState,
} from './interaction/marquee.ts'
export {
  containsEngineBounds,
  createEngineMarqueeState,
  createEngineMarqueeState as createMarqueeState,
  getEngineNormalizedBounds,
  getEngineNormalizedBounds as getNormalizedBounds,
  intersectsEngineBounds,
  intersectsEngineBounds as intersectsBounds,
  resolveEngineMarqueeBounds,
  resolveEngineMarqueeBounds as resolveMarqueeBounds,
  resolveEngineMarqueeSelection,
  resolveEngineMarqueeSelection as resolveMarqueeSelection,
  updateEngineMarqueeState,
  updateEngineMarqueeState as updateMarqueeState,
} from './interaction/marquee.ts'
export type {
  EngineSelectionHandle,
  EngineSelectionHandleBounds,
  EngineSelectionHandleKind,
  EngineSelectionHandlePoint,
} from './interaction/selectionHandles.ts'
export {
  buildEngineSelectionHandlesFromBounds,
  buildEngineSelectionHandlesFromBounds as buildSelectionHandlesFromBounds,
  pickEngineSelectionHandleAtPoint,
  pickEngineSelectionHandleAtPoint as pickSelectionHandleAtPoint,
} from './interaction/selectionHandles.ts'
export type {
  EngineMoveSnapOptions,
  EngineMoveSnapPreview,
  EngineMoveSnapShape,
  EngineSnapAxis,
  EngineSnapGuide,
  EngineSnapGuideLine,
  EngineSnapScene,
  EngineSnapSceneShape,
} from './interaction/snapping.ts'
export {
  resolveEngineSnapGuideLines,
  resolveEngineMoveSnapPreview,
  resolveEngineMoveSnapPreview as resolveMoveSnapPreview,
} from './interaction/snapping.ts'
export type {
  EngineCanvasViewportState,
  EngineViewportFitDocumentLike,
} from './interaction/viewport.ts'
export {
  DEFAULT_ENGINE_VIEWPORT,
  DEFAULT_ENGINE_VIEWPORT as DEFAULT_VIEWPORT,
  clampEngineViewportScale,
  clampEngineViewportScale as clampViewportScale,
  fitEngineViewportToDocument,
  fitEngineViewportToDocument as fitViewportToDocument,
  panEngineViewportState,
  panEngineViewportState as panViewportState,
  resolveEngineViewportState,
  resolveEngineViewportState as resolveViewportState,
  resizeEngineViewportState,
  resizeEngineViewportState as resizeViewportState,
  zoomEngineViewportState,
  zoomEngineViewportState as zoomViewportState,
} from './interaction/viewport.ts'
export type {
  EngineViewportPanOffset,
  EngineViewportPanOrigin,
} from './interaction/viewportPan.ts'
export {
  accumulateEnginePointerPanOffset,
  accumulateEngineWheelPanOffset,
  createEngineViewportPanOrigin,
} from './interaction/viewportPan.ts'
export type {
  EngineNormalizedZoomDelta,
  EngineZoomInputSource,
  EngineZoomSessionState,
  EngineZoomWheelInput,
  EngineZoomWheelResult,
} from './interaction/zoom.ts'
export {
  DEFAULT_ENGINE_ZOOM_SESSION,
  DEFAULT_ENGINE_ZOOM_SESSION as DEFAULT_ZOOM_SESSION,
  accumulateEngineZoomSession,
  detectEngineZoomInputSource,
  detectEngineZoomInputSource as detectZoomInputSource,
  getEngineZoomSettleDelay,
  getEngineZoomSettleDelay as getZoomSettleDelay,
  handleEngineZoomWheel,
  handleEngineZoomWheel as handleZoomWheel,
  normalizeEngineZoomDelta,
  normalizeEngineZoomDelta as normalizeZoomDelta,
  resetEngineZoomSession,
  resetEngineZoomSession as resetZoomSession,
} from './interaction/zoom.ts'
