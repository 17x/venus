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
  EngineAabb3,
  EngineDimensionMode,
  EngineFrustum,
  EngineFrustumPlane,
  EngineMat3,
  EngineMat3Affine2D,
  EngineMat4,
  EngineRay3,
  EngineRect2,
  EngineVec2,
  EngineVec3,
  EngineVec4,
} from '../math/dimension/types.ts'

export type {
  EngineCameraClipRange,
  EngineCameraPose,
  EngineCameraProjection,
  EngineCameraProjectionKind,
  EngineOrthographicCameraProjection,
  EnginePerspectiveCameraProjection,
} from '../camera/contracts.ts'

export type {
  EngineMaterialBinding,
  EngineMaterialDefinition,
  EngineMaterialRegistrySnapshot,
  EngineMaterialShadingModel,
  EngineMaterialSurface,
} from '../material/contracts.ts'

export type {
  EngineAmbientLight,
  EngineDirectionalLight,
  EngineLightBase,
  EngineLightDefinition,
  EngineLightingBinding,
  EngineLightingRigSnapshot,
  EngineLightType,
} from '../lighting/contracts.ts'

export type {
  EngineRenderableNode,
  EngineSceneSnapshot,
} from '../scene/types/types.ts'
export type {
  EngineHitTestResult,
} from '../scene/hitTest/hitTest.ts'

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

export type {
  EngineDrawCommand,
  EngineLayeredRenderInput,
  EngineLayeredRenderOutput,
  EngineRenderCamera,
  EngineRenderInteractionInput,
  EngineRenderOptions,
} from '../core/types.ts'
export type {
  EngineRenderGraph,
  EngineRenderGraphExecutionContext,
  EngineRenderGraphExecutionResult,
  EngineRenderGraphPassNode,
  EngineRenderPassId,
} from '../core/renderGraph/contracts.ts'
export {
  composeLayeredDrawCommands,
} from '../core/compose.ts'
export {
  renderLayeredScene,
} from '../core/render.ts'
export type {
  EngineDrawCommandShadingBinding,
} from '../core/materialLighting/materialLighting.ts'
export {
  resolveEngineDrawCommandShadingBinding,
} from '../core/materialLighting/materialLighting.ts'
export {
  createLayeredRenderGraph,
  executeEngineRenderGraph,
} from '../core/renderGraph/renderGraph.ts'

export type {
  EnginePerformanceGateStatus,
  EnginePerformanceGateThresholds,
} from '../runtime/createEngine/performanceGate.ts'
export {
  resolveEnginePerformanceGateStatus,
} from '../runtime/createEngine/performanceGate.ts'

export {
  renderBaseLayer,
  renderActiveLayer,
  renderOverlayLayer,
} from '../renderer/layers/index.ts'

export {
  createWebGPUEngineRenderer,
} from '../renderer/webgpu/index.ts'

export {
  createRenderCameraProjector,
  projectWorldPoint,
  unprojectScreenPoint,
} from '../renderer/camera/index.ts'

export {
  hitTestLayeredCommands,
  hitTestBaseLayer,
  hitTestActiveLayer,
} from '../renderer/hit/index.ts'

export type {
  GeometryCacheEntry,
  GeometryCache,
  LayeredTileCacheKey,
  LayeredTileCache,
  toLayeredTileCacheSignature,
} from '../renderer/cache/index.ts'

export {
  querySpatialIndex,
} from '../scene/spatial/index.ts'
export {
  assertEngineCondition,
} from '../utils/assert.ts'
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
  EngineGeometryBounds,
  EngineGeometryHint,
  EngineGeometryMarqueeBounds,
  EngineGeometryNodePayload,
  EngineGeometryOutline,
  EngineGeometryPayload,
  ResolveEngineGeometryPayloadOptions,
} from '../interaction/geometryPayload/geometryPayload.ts'
export {
  resolveEngineGeometryPayload,
} from '../interaction/geometryPayload/geometryPayload.ts'

export type {
  EngineVisibleSet,
  EngineVisibilityBounds2DQuery,
  EngineVisibilityBounds2DResolver,
  EngineVisibilityFrustum3DQuery,
  EngineVisibilityFrustum3DResolver,
  EngineVisibilityQuery,
  EngineVisibilityQueryMode,
  EngineVisibilityViewport2D,
} from '../scene/visibility/contracts.ts'
export type {
  CreateEngineVisibilityResolverOptions,
  EngineVisibilityResolver,
} from '../scene/visibility/visibility.ts'
export {
  createEngineVisibilityResolver,
  resolveEngineBounds2DVisibilityQuery,
} from '../scene/visibility/visibility.ts'

export type {
  EngineHitQuery,
  EngineHitQueryMode,
  EngineHitResolverOptions,
  EnginePointHitQuery,
  EngineRayHitQuery,
  EngineResolvedHitSet,
} from '../scene/hit/contracts.ts'
export type {
  EngineHitResolver,
} from '../scene/hit/resolver.ts'
export {
  createEngineHitResolver,
  createEnginePointHitQuery,
} from '../scene/hit/resolver.ts'

export type {
  AffineMatrix,
  BoxTransformSource,
  MatrixFirstNodeTransform,
  NormalizedBounds,
  ShapeTransformBatchCommand,
  ShapeTransformBatchItem,
  ShapeTransformRecord,
} from '../interaction/shapeTransform/shapeTransform.ts'
export {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  createMatrixFirstNodeTransform,
  createShapeTransformRecord,
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
  intersectNormalizedBounds,
  isPointInsideRotatedBounds,
  resolveNodeTransform,
  resolveShapeTransformRecord,
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