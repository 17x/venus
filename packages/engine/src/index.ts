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
  EngineInteractionPreviewConfig,
  EngineRenderFrame,
  BaseSceneRenderMode,
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
export type {
  BuildEngineReplayTilesOptions,
  EngineReplayTile,
} from './renderer/replay.ts'
export type {
  CreateEngineReplayCoordinatorOptions,
  EngineReplayCancelRequest,
  EngineReplayDoneEvent,
  EngineReplayErrorEvent,
  EngineReplayRenderRequest,
  EngineReplayStartEvent,
  EngineReplayTileEvent,
  EngineReplayViewportState,
  EngineReplayWorkerEvent,
  EngineReplayWorkerMessage,
} from './renderer/replayWorker.ts'
export type {
  EngineRenderInstanceBatch,
  EngineRenderInstanceView,
} from './renderer/instances.ts'
export { prepareEngineRenderPlan } from './renderer/plan.ts'
export { prepareEngineRenderInstanceView } from './renderer/instances.ts'
export { buildEngineReplayTiles } from './renderer/replay.ts'
export { createEngineReplayCoordinator } from './renderer/replayWorker.ts'
export { createCanvas2DEngineRenderer } from './renderer/canvas2d.ts'
export { createWebGLEngineRenderer } from './renderer/webgl.ts'
export type {
  CreateTileKeyInput,
  EngineTileConfig,
  EngineTileCacheEntry,
  TilePriority,
  TileCoord,
  TileKey,
  TileTextureResolveLevel,
  TileTextureResolveResult,
  TileTextureResolver,
  TileRenderReason,
  TileRenderRequest,
  TileRenderer,
  TileTextureEntry,
  TileViewportCamera,
  TileZoomLevel,
  VisibleTileProjection,
} from './renderer/tileManager.ts'
export {
  EngineTileCache,
  createTileKey,
  getActiveZoomBuckets,
  getVisibleTilesForCamera,
  getViewportWorldBounds,
  getWorldTileSize,
  getZoomBucket,
  unionEngineRectBounds,
  resolveTileTextureWithFallback,
  getTileSizeForZoom,
  getZoomLevelForScale,
  getTileBounds,
  getTilesIntersectingBounds,
  ZOOM_BUCKETS,
} from './renderer/tileManager.ts'
export type {
  TileSchedulerCancelOptions,
  TileSchedulerTickOptions,
} from './renderer/tileScheduler.ts'
export {
  TileScheduler,
} from './renderer/tileScheduler.ts'
export type {
  DirtyRegionUpdate,
  DirtyUpdateMode,
} from './renderer/dirtyRegionTracker.ts'
export {
  EngineDirtyRegionTracker,
} from './renderer/dirtyRegionTracker.ts'
export type { EngineInitialRenderConfig } from './renderer/initialRender.ts'
export {
  EngineInitialRenderController,
  InitialRenderPhase,
} from './renderer/initialRender.ts'
export type {
  EngineLodConfig,
  EngineLodInteractionCapability,
  EngineLodInteractionPhase,
  EngineLodOptions,
  LodDegradationMode,
} from './interaction/lodConfig.ts'
export {
  getLodPreset,
  mergeWithPreset,
  resolveEngineLodInteractionCapability,
} from './interaction/lodConfig.ts'
export type { Mat3, Point2D } from './math/matrix.ts'
export { applyMatrixToPoint } from './math/matrix.ts'
export type {
  EngineClipShape,
  EngineGroupNode,
  EngineImageNode,
  EngineBezierPoint,
  EngineNodeBase,
  EngineNodeId,
  EnginePoint,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineShapeNode,
  EngineTextNode,
  EngineTextRun,
  EngineTextStyle,
  EngineTransform2D,
} from './scene/types.ts'
export type { EngineSceneBufferLayout } from './scene/buffer.ts'
export type {
  EngineFramePlan,
  PrepareEngineFramePlanOptions,
} from './scene/framePlan.ts'
export type {
  EngineHitPlan,
  PrepareEngineHitPlanOptions,
} from './scene/hitPlan.ts'
export type {
  CreateEngineSceneStoreOptions,
  EngineSceneStore,
  EngineSceneStoreDiagnostics,
  EngineSceneStoreTransaction,
} from './scene/store.ts'
export type {
  EngineSceneDirtyKind,
  EngineScenePatch,
  EngineScenePatchApplyResult,
  EngineScenePatchBatch,
  MutableEngineSceneState,
} from './scene/patch.ts'
export type { EngineHitTestResult } from './scene/hitTest.ts'
export {
  applyEngineScenePatch,
  applyEngineScenePatchBatch,
  createMutableEngineSceneState,
  flattenEngineSceneNodes,
  resolveNodeByFlattenedIndex,
} from './scene/patch.ts'
export { createEngineSceneStore } from './scene/store.ts'
export { prepareEngineFramePlan } from './scene/framePlan.ts'
export { prepareEngineHitPlan } from './scene/hitPlan.ts'
export { hitTestEngineSceneState, hitTestEngineSceneStateAll } from './scene/hitTest.ts'
export type {
  EngineClock,
  EngineFrameHandle,
  EngineFrameInfo,
} from './time/index.ts'
export { createSystemEngineClock } from './time/index.ts'
export type { EngineRuntime } from './runtime/types.ts'
export type { EngineLoopController } from './runtime/createEngineLoop.ts'
export type {
  CreateEngineRenderSchedulerOptions,
  EngineRenderScheduler,
} from './runtime/renderScheduler.ts'
export type {
  CreateEngineOptions,
  Engine,
  EngineRuntimeDiagnostics,
} from './runtime/createEngine.ts'
export { createEngine } from './runtime/createEngine.ts'
export { createEngineLoop } from './runtime/createEngineLoop.ts'
export { createEngineRenderScheduler } from './runtime/renderScheduler.ts'
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
  getEngineNormalizedBounds,
  intersectsEngineBounds,
  resolveEngineMarqueeBounds,
  resolveEngineMarqueeSelection,
  updateEngineMarqueeState,
} from './interaction/marquee.ts'
export type {
  EngineSelectionHandle,
  EngineSelectionHandleBounds,
  EngineSelectionHandleKind,
  EngineSelectionHandlePoint,
} from './interaction/selectionHandles.ts'
export {
  buildEngineSelectionHandlesFromBounds,
  pickEngineSelectionHandleAtPoint,
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
} from './interaction/snapping.ts'
export type {
  EngineLodInteractionType,
  EngineLodProfile,
  EngineLodProfileInput,
  EngineCanvasLodProfile,
  EngineCanvasLodProfileInput,
} from './interaction/lodProfile.ts'
export {
  resolveEngineCanvasLodProfile,
  resolveEngineLodProfile,
} from './interaction/lodProfile.ts'
export type {
  EngineVisibilityHitTestBudget,
  EngineVisibilityHitTestBudgetInput,
  EngineVisibilityMetricInput,
  EngineVisibilityProfile,
  EngineVisibilityTier,
} from './interaction/visibilityLod.ts'
export {
  resolveEngineVisibilityHitTestBudget,
  resolveEngineVisibilityProfile,
} from './interaction/visibilityLod.ts'
export type {
  EngineEditorBezierPoint,
  EngineEditorHitTestNode,
  EngineEditorNodeType,
  EngineEditorPoint,
  EngineClipHitTestOptions,
  EngineShapeHitTestOptions,
} from './interaction/hitTest.ts'
export {
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
} from './interaction/hitTest.ts'
export type {
  AffineMatrix,
  BoxTransformSource,
  MatrixFirstNodeTransform,
  NormalizedBounds,
  NormalizedBoundsLike,
  Point,
  ResolvedNodeTransform,
  ResolvedShapeTransformRecord,
  ShapeTransformBatchCommand,
  ShapeTransformBatchItem,
  ShapeTransformRecord,
} from './interaction/shapeTransform.ts'
export {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  createMatrixFirstNodeTransform,
  createShapeTransformRecord,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  hasResolvedNodeTransformEffect,
  intersectNormalizedBounds,
  invertAffineMatrix,
  isPointInsideRotatedBounds,
  resolveNodeTransform,
  resolveShapeTransformRecord,
  toLegacyShapeTransformRecord,
  toResolvedNodeCssTransform,
  toResolvedNodeSvgTransform,
} from './interaction/shapeTransform.ts'
export type {
  EngineCanvasViewportState,
  EngineViewportFitDocumentLike,
} from './interaction/viewport.ts'
export {
  DEFAULT_ENGINE_VIEWPORT,
  clampEngineViewportScale,
  fitEngineViewportToDocument,
  panEngineViewportState,
  resolveEngineViewportState,
  resizeEngineViewportState,
  zoomEngineViewportState,
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
  accumulateEngineZoomSession,
  detectEngineZoomInputSource,
  getEngineZoomSettleDelay,
  handleEngineZoomWheel,
  normalizeEngineZoomDelta,
  resetEngineZoomSession,
} from './interaction/zoom.ts'
