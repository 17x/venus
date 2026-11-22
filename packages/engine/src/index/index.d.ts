export type {
  EngineAnimationController,
  EngineEasingDefinition,
  EngineEasingFunction,
} from '../animation/index.ts'
export {
  createEngineAnimationController,
} from '../animation/index.ts'

export type {
  Mat3,
  Point2D,
} from '../math/matrix/matrix.ts'
export {
  applyMatrixToPoint,
} from '../math/matrix/matrix.ts'
export type {
  EngineViewportBoundsState,
  EngineViewportOverscanCssPx,
  EngineViewportOverscanInput,
  EngineViewportWorldBounds,
  ResolveEngineViewportWorldBoundsOptions,
} from '../core/camera/index.ts'
export {
  resolveEngineViewportWorldBounds,
  resolveEngineViewportWorldRect,
} from '../core/camera/index.ts'

export type {
  EngineRenderableNode,
  EngineSceneSnapshot,
} from '../scene/types/types.ts'
export type {
  EngineCanonicalGeometryOutline,
  EngineCanonicalGeometryPayload,
  EngineGeometryBounds as EngineRenderableGeometryBounds,
} from '../scene/geometry/index.ts'
export {
  resolveEngineClipGeometry,
  resolveEngineShapeGeometry,
  resolveEngineShapeGeometryBounds,
  resolveEngineShapeStrokeBounds,
  resolveEngineShapeStrokeWidth,
} from '../scene/geometry/index.ts'
export type {
  EngineBoundsMatrix,
} from '../scene/worldBounds/worldBounds.ts'
export {
  resolveLeafNodeWorldBounds,
  resolveRenderableNodeWorldBounds,
  resolveRenderableNodesWorldBounds,
  resolveShapeBounds,
  toWorldAxisAlignedBounds,
} from '../scene/worldBounds/worldBounds.ts'
export type {
  EngineHitTestResult,
} from '../scene/hitTest/hitTest.ts'
export type {
  EngineScenePatch,
  EngineScenePatchApplyResult,
  EngineScenePatchBatch,
  EngineSceneDirtyKind,
} from '../scene/patch/patch.ts'

export type {
  EngineRenderScheduler,
} from '../runtime/renderScheduler/renderScheduler.ts'
export type {
  CreateEngineOptions,
  Engine,
} from '../runtime/createEngine/createEngine.ts'
export {
  createEngine,
} from '../runtime/createEngine/createEngine.ts'
export {
  createEngineRenderScheduler,
} from '../runtime/renderScheduler/renderScheduler.ts'

export {
  resolveEngineWorkerMode,
} from '../worker/capabilities/capabilities.ts'

export type {
  EngineSpatialIndex,
  EngineSpatialItem,
} from '../scene/spatial/index.ts'
export {
  createEngineSpatialIndex,
} from '../scene/spatial/index.ts'

export type {
  ResolveEngineAdaptiveHitToleranceOptions,
} from '../interaction/hitTolerance.ts'
export {
  resolveEngineAdaptiveHitTolerance,
} from '../interaction/hitTolerance.ts'

export type {
  EngineMoveSnapOptions,
  EngineMoveSnapPreview,
  EngineSnapAxis,
  EngineSnapGuide,
  EngineSnapGuideLine,
} from '../interaction/snapping/snapping.ts'
export {
  resolveEngineMoveSnapPreview,
} from '../interaction/snapping/snapping.ts'

export type {
  EngineOverlayDrawNode,
} from '../interaction/overlayCanvas.ts'

export type {
} from '../interaction/lodProfile.ts'
export {
  resolveEngineCanvasLodProfile,
} from '../interaction/lodProfile.ts'

export {
  resolveEngineVisibilityHitTestBudget,
} from '../interaction/visibilityLod.ts'

export type {
  EngineEditorHitTestNode,
} from '../interaction/hitTest/hitTest.ts'
export {
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
} from '../interaction/hitTest/hitTest.ts'

export type {
  AffineMatrix,
  BoxTransformSource,
  EngineGeometryRotationResult,
  EngineGeometryRotationSource,
  MatrixFirstNodeTransform,
  NormalizedBounds,
  ShapeTransformBatchCommand,
  ShapeTransformBatchItem,
  ShapeTransformRecord,
} from '../interaction/shapeTransform/shapeTransform.ts'
export {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  createEngineRotateAroundPointMatrix,
  createMatrixFirstNodeTransform,
  createShapeTransformRecord,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  intersectNormalizedBounds,
  isPointInsideRotatedBounds,
  resolveEngineGeometryRotationAroundPoint,
  resolveEngineTransformedBoundsFromBox,
  resolveNodeTransform,
  resolveShapeTransformRecord,
  rotateEnginePointAroundPoint,
  toLegacyShapeTransformRecord,
  toResolvedNodeSvgTransform,
} from '../interaction/shapeTransform/shapeTransform.ts'

export type {
  EngineCanvasViewportState,
  EngineViewportScaleRange,
  EngineViewportFitDocumentLike,
} from '../interaction/viewport/viewport.ts'
export {
  DEFAULT_ENGINE_VIEWPORT,
  clampEngineViewportScale,
  fitEngineViewportToDocument,
  panEngineViewportState,
  resolveEngineViewportState,
  resizeEngineViewportState,
  zoomEngineViewportState,
} from '../interaction/viewport/viewport.ts'

export {
  accumulateEnginePointerPanOffset,
  accumulateEngineWheelPanOffset,
  createEngineViewportPanOrigin,
} from '../interaction/viewportPan/viewportPan.ts'

export type {
  EngineNormalizedZoomDelta,
  EngineZoomInputSource,
  EngineZoomSessionState,
  EngineZoomWheelInput,
  EngineZoomWheelResult,
} from '../interaction/zoom/zoom.ts'
export {
  DEFAULT_ENGINE_ZOOM_SESSION,
  accumulateEngineZoomSession,
  detectEngineZoomInputSource,
  getEngineZoomSettleDelay,
  handleEngineZoomWheel,
  normalizeEngineZoomDelta,
  resetEngineZoomSession,
} from '../interaction/zoom/zoom.ts'
