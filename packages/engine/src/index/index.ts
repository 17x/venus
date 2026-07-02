// Engine public barrel owns stable package exports; implementation details and
// product/editor semantics must remain in their owning modules.
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
  EngineRenderableNodeType,
  EngineRenderableNode,
  EngineShapeKind,
  EngineSceneSnapshot,
} from '../scene/types/types.ts'
export {
  ENGINE_RENDERABLE_NODE_TYPES,
  ENGINE_SHAPE_TYPES,
} from '../scene/types/types.ts'
export type {
  EngineHitTestResult,
} from '../scene/hitTest/hitTest.ts'

export type {
  EngineRenderScheduler,
} from '../runtime/renderScheduler/renderScheduler.ts'
export type {
  EngineBackend,
  EngineRenderQuality,
} from '../renderer/types/index.ts'
export type {
  CreateEngineOptions,
  Engine,
} from '../runtime/createEngine/createEngine.ts'
export {
  createEngine,
} from '../runtime/createEngine/createEngine.ts'
export type {
  VenusEventHandler,
  VenusEventMap,
  VenusEventName,
  VenusBackendFallback,
  VenusAnimationController,
  VenusAnimationKeyframe,
  VenusAnimationOptions,
  VenusAnimatableProperty,
  VenusAppearance,
  VenusBackend,
  VenusBlendMode,
  VenusCacheDiagnostics,
  VenusConstraints,
  VenusDebugFlags,
  VenusDocumentModelType,
  VenusEffect,
  VenusExportSetting,
  VenusFrameMeasurement,
  VenusGradient,
  VenusGradientPaint,
  VenusGradientStop,
  VenusGroupNode,
  VenusGroupOptions,
  VenusHitTestOptions,
  VenusInvalidationKind,
  VenusDocumentService,
  VenusInternalServiceName,
  VenusInvalidationService,
  VenusModule,
  VenusModuleCatalogEntry,
  VenusModuleCategory,
  VenusModuleContext,
  VenusModuleDiagnostics,
  VenusModuleName,
  VenusModuleStatus,
  VenusLinearGradient,
  VenusNode,
  VenusPaint,
  VenusParameters,
  VenusRegisteredServiceMap,
  VenusRegisteredServiceName,
  VenusPublicMethodName,
  VenusRadialGradient,
  VenusRuntimeInspection,
  VenusServiceRegistry,
  VenusSolidPaint,
  VenusStroke,
  VenusStrokeAlign,
  VenusTransform2D,
  VenusViewportService,
} from '../runtime/venus/Venus.ts'
export {
  classifyVenusNodeMutation,
  defineVenusModule,
  isVenusModuleName,
  Venus,
  VENUS_INTERNAL_SERVICE_NAMES,
  VENUS_MODULE_CATALOG,
  VENUS_DOCUMENT_MODEL_TYPES,
  VENUS_MODULE_NAMES,
  VENUS_PUBLIC_METHOD_NAMES,
} from '../runtime/venus/Venus.ts'

export {
  VenusNodeProxy,
  VenusRectProxy,
  VenusEllipseProxy,
  VenusLineProxy,
  VenusTextProxy,
  VenusGroupProxy,
  VenusClipProxy,
  VenusMaskProxy,
  VenusPolygonProxy,
  VenusPathProxy,
  VenusImageProxy,
  createVenusNodeProxy,
} from '../runtime/venus/VenusNodeProxy.ts'
export type {
  VenusShapeModelFamily,
  VenusShapeModelSpec,
} from '../runtime/venus/shapeModel.ts'
export {
  VENUS_COMMON_RENDER_PROPERTIES,
  VENUS_SHAPE_MODEL_SPECS,
} from '../runtime/venus/shapeModel.ts'

export {
  createVenusAnimateModule,
  createVenusCameraModule,
  createVenusDebugModule,
  createVenusEffectsModule,
  createVenusExportModule,
  createVenusHistoryModule,
  createVenusHitTestModule,
  createVenusInteractionModule,
} from '../runtime/venus/modules/index.ts'

export type {
  EngineDrawCommand,
  EngineLayeredRenderInput,
  EngineLayeredRenderOutput,
  EngineRenderCamera,
  EngineRenderInteractionInput,
  EngineRenderOptions,
} from '../core/types.ts'
export {
  composeLayeredDrawCommands,
} from '../core/compose.ts'
export {
  renderLayeredScene,
} from '../core/render.ts'

export {
  renderBaseLayer,
  renderActiveLayer,
  renderOverlayLayer,
} from '../renderer/layers/index.ts'

export {
  createRenderCameraProjector,
  projectWorldPoint,
  unprojectScreenPoint,
} from '../core/camera/index.ts'

export {
  hitTestLayeredCommands,
  hitTestBaseLayer,
  hitTestActiveLayer,
} from '../core/hit/index.ts'

export type {
  GeometryCacheEntry,
  LayeredTileCacheKey,
} from '../core/cache/index.ts'
export {
  GeometryCache,
  LayeredTileCache,
  toLayeredTileCacheSignature,
} from '../core/cache/index.ts'

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
