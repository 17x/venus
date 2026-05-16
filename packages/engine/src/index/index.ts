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
} from '../material/index.ts'

export type {
  EngineAmbientLight,
  EngineDirectionalLight,
  EngineLightBase,
  EngineLightDefinition,
  EngineLightingBinding,
  EngineLightingRigSnapshot,
  EngineLightType,
} from '../lighting/index.ts'

export type {
  EngineRenderableNode,
  EngineSceneSnapshot,
} from '../scene/types/types.ts'
export type {
  EngineHitTestResult,
} from '../scene/hitTest/hitTest.ts'

export type {
  EngineRenderScheduler,
} from '../scheduler/index.ts'
export type {
  CreateEngineOptions,
  Engine,
} from '../runtime/createEngine/createEngine.ts'
export {
  createEngine,
} from '../runtime/createEngine/createEngine.ts'

export type {
  EngineAntiAliasingMode,
  EngineCanonicalSettingsBundle,
  EngineDebugSettings,
  EngineDeviceCapabilityProfile,
  EngineDiagnosticsSettings,
  EngineGraphicsSettings,
  EngineLegacySettingsPayload,
  EngineLegacyRuntimeSettings,
  EnginePerformanceBudgetInput,
  EnginePerformanceSettings,
  EnginePresetRegistry,
  EngineProfileName,
  EngineQualityPresetName,
  EngineRuntimeBudgetSettings,
  EngineSettingsMigrationResult,
  EngineRuntimeSettings,
  EngineScalingSettings,
} from '../settings/index.ts'
export {
  DEFAULT_ENGINE_DEBUG_SETTINGS,
  DEFAULT_ENGINE_DEVICE_CAPABILITY_PROFILE,
  DEFAULT_ENGINE_DIAGNOSTICS_SETTINGS,
  DEFAULT_ENGINE_GRAPHICS_SETTINGS,
  DEFAULT_ENGINE_PERFORMANCE_SETTINGS,
  DEFAULT_ENGINE_PRESET_REGISTRY,
  DEFAULT_ENGINE_RUNTIME_BUDGET_SETTINGS,
  DEFAULT_ENGINE_RUNTIME_SETTINGS,
  DEFAULT_ENGINE_SCALING_SETTINGS,
  mapEnginePerformanceSettingsToBudgetInput,
  resolveEngineDefaultPreset,
  resolveEngineDeviceCapabilityProfile,
  resolveEngineGraphicsSettings,
  resolveEnginePerformanceSettings,
  resolveEngineRuntimeSettings,
  migrateEngineSettings,
  validateEngineGraphicsSettings,
} from '../settings/index.ts'

export type {
  EngineCriticalLayerPolicy,
  EnginePolicyPhase,
  EngineRuntimePolicy,
  EngineRuntimePolicyPhaseOverride,
} from '../runtime/policy/runtimePolicy.ts'
export {
  createEngineRuntimePolicy,
  resolveCapabilityAwareEngineRuntimePolicy,
} from '../runtime/policy/runtimePolicy.ts'

export type {
  EngineAutoQualityScalerConfig,
  EngineAutoQualityScalerDecision,
  EngineAutoQualityScalerState,
} from '../runtime/policy/autoQualityScaler.ts'
export {
  DEFAULT_ENGINE_AUTO_QUALITY_SCALER_CONFIG,
  resolveEngineAutoQualityScalerDecision,
} from '../runtime/policy/autoQualityScaler.ts'

export type {
  EngineRuntimeBudgetSnapshot,
  EngineRuntimeBudgetTrace,
} from '../runtime/budget/runtimeBudget.ts'
export {
  createEngineRuntimeBudgetSnapshot,
} from '../runtime/budget/runtimeBudget.ts'

export type {
  EnginePressureSample,
  EnginePressureSignals,
  EnginePressureThresholds,
  EnginePressureTier,
} from '../runtime/budget/pressureMonitor.ts'
export {
  DEFAULT_ENGINE_PRESSURE_THRESHOLDS,
  resolveEnginePressureSample,
} from '../runtime/budget/pressureMonitor.ts'

export type {
  EngineDrawCommand,
  EngineLayeredRenderInput,
  EngineLayeredRenderOutput,
  EngineRenderCamera,
  EngineRenderInteractionInput,
  EngineRenderOptions,
} from '../render/index.ts'
export type {
  EngineRenderGraph,
  EngineRenderGraphExecutionContext,
  EngineRenderGraphExecutionResult,
  EngineRenderGraphPassNode,
  EngineRenderPassId,
} from '../render/index.ts'
export {
  composeLayeredDrawCommands,
} from '../render/index.ts'
export {
  renderLayeredScene,
} from '../render/index.ts'
export type {
  EngineDrawCommandShadingBinding,
} from '../material/index.ts'
export {
  resolveEngineDrawCommandShadingBinding,
} from '../material/index.ts'
export {
  createLayeredRenderGraph,
  executeEngineRenderGraph,
} from '../render/index.ts'

export type {
  EnginePerformanceGateStatus,
  EnginePerformanceGateThresholds,
} from '../debug/index.ts'
export {
  resolveEnginePerformanceGateStatus,
} from '../debug/index.ts'

export {
  renderBaseLayer,
  renderActiveLayer,
  renderOverlayLayer,
} from '../renderer/layers/index.ts'

export {
  createWebGPUEngineRenderer,
} from '../gpu/webgpu/index.ts'

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
} from '../resource/index.ts'

export {
  querySpatialIndex,
} from '../spatial/index.ts'
export {
  assertEngineCondition,
} from '../utils/assert.ts'
export {
  createEngineRenderScheduler,
} from '../scheduler/index.ts'

export {
  resolveEngineWorkerMode,
} from '../platform/index.ts'

export type {
  EngineSpatialIndex,
  EngineSpatialItem,
} from '../spatial/index.ts'
export {
  createEngineSpatialIndex,
} from '../spatial/index.ts'

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
} from '../visibility/index.ts'
export type {
  CreateEngineVisibilityResolverOptions,
  EngineVisibilityResolver,
} from '../visibility/index.ts'
export {
  createEngineVisibilityResolver,
  resolveEngineBounds2DVisibilityQuery,
} from '../visibility/index.ts'

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