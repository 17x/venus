export {
  computeEnginePostGaHotfixPolicy,
} from '../runtime/release/postGaHotfixPolicy.ts'

export type {
  EnginePhaseGAcceptanceChecklist,
} from '../runtime/release/phaseGAcceptance.ts'
export {
  computeEnginePhaseGAcceptance,
} from '../runtime/release/phaseGAcceptance.ts'

export type {
  EnginePhaseGCloseoutPostmortemChecklist,
} from '../runtime/release/phaseGCloseoutPostmortem.ts'
export {
  computeEnginePhaseGCloseoutPostmortem,
} from '../runtime/release/phaseGCloseoutPostmortem.ts'

export type {
  EngineGovernanceAuditItem,
} from '../runtime/release/governanceAuditAutomationV1.ts'
export {
  computeEngineGovernanceAuditAutomationV1,
} from '../runtime/release/governanceAuditAutomationV1.ts'

export type {
  EngineReleaseRiskScoringInput,
} from '../runtime/release/releaseRiskScoringV1.ts'
export {
  computeEngineReleaseRiskScoringV1,
} from '../runtime/release/releaseRiskScoringV1.ts'

export type {
  EngineHotpathLatencyGuardInput,
} from '../runtime/release/hotpathLatencyGuardV1.ts'
export {
  computeEngineHotpathLatencyGuardV1,
} from '../runtime/release/hotpathLatencyGuardV1.ts'

export type {
  EngineStateTransitionSample,
} from '../runtime/release/stateTransitionAnomalyGate.ts'
export {
  computeEngineStateTransitionAnomalyGate,
} from '../runtime/release/stateTransitionAnomalyGate.ts'

export type {
  EngineProfileRolloutCohortSample,
} from '../runtime/release/profileRolloutFairnessCheck.ts'
export {
  computeEngineProfileRolloutFairnessCheck,
} from '../runtime/release/profileRolloutFairnessCheck.ts'

export type {
  EngineFallbackStormWindow,
} from '../runtime/release/fallbackStormRateLimiter.ts'
export {
  computeEngineFallbackStormRateLimiter,
} from '../runtime/release/fallbackStormRateLimiter.ts'

export type {
  EngineCriticalLayerProofRecord,
} from '../runtime/release/criticalLayerProofExportV1.ts'
export {
  computeEngineCriticalLayerProofExportV1,
} from '../runtime/release/criticalLayerProofExportV1.ts'

export type {
  EngineFallbackParitySample2d3d,
} from '../runtime/release/fallbackParityGate2d3d.ts'
export {
  computeEngineFallbackParityGate2d3d,
} from '../runtime/release/fallbackParityGate2d3d.ts'

export type {
  EngineThreeDimensionalRolloutReadinessInput,
} from '../runtime/release/threeDimensionalRolloutReadinessScoreV1.ts'
export {
  computeEngineThreeDimensionalRolloutReadinessScoreV1,
} from '../runtime/release/threeDimensionalRolloutReadinessScoreV1.ts'

export type {
  EngineThreeDimensionalMechanismReadinessInputV1,
  EngineThreeDimensionalMechanismTelemetrySignalsV1,
} from '../runtime/release/threeDimensionalMechanismReadinessV1.ts'
export {
  computeEngineThreeDimensionalMechanismReadinessInputV1,
  computeEngineThreeDimensionalMechanismReadinessV1,
} from '../runtime/release/threeDimensionalMechanismReadinessV1.ts'

export type {
  EngineCrossBackendSceneParitySample,
} from '../runtime/release/crossBackendSceneParitySuite.ts'
export {
  computeEngineCrossBackendSceneParitySuite,
} from '../runtime/release/crossBackendSceneParitySuite.ts'

export type {
  EngineRuntimePolicyConvergenceAuditInput,
} from '../runtime/release/runtimePolicyConvergenceAuditV2.ts'
export {
  computeEngineRuntimePolicyConvergenceAuditV2,
} from '../runtime/release/runtimePolicyConvergenceAuditV2.ts'

export type {
  EngineLongTailDeviceReadinessSample,
} from '../runtime/release/longTailDeviceReadinessGate.ts'
export {
  computeEngineLongTailDeviceReadinessGate,
} from '../runtime/release/longTailDeviceReadinessGate.ts'

export type {
  EngineObservabilitySchemaLockInput,
} from '../runtime/release/observabilitySchemaLockV1.ts'
export {
  computeEngineObservabilitySchemaLockV1,
} from '../runtime/release/observabilitySchemaLockV1.ts'

export type {
  EngineReleaseEvidenceItem,
} from '../runtime/release/releaseEvidenceBundleGate.ts'
export {
  computeEngineReleaseEvidenceBundleGate,
} from '../runtime/release/releaseEvidenceBundleGate.ts'

export type {
  EngineRollbackSimulationCase,
} from '../runtime/release/rollbackSimulationMatrixV1.ts'
export {
  computeEngineRollbackSimulationMatrixV1,
} from '../runtime/release/rollbackSimulationMatrixV1.ts'

export type {
  EngineMigrationDebtItem,
} from '../runtime/release/finalMigrationDebtBurndown.ts'
export {
  computeEngineFinalMigrationDebtBurndown,
} from '../runtime/release/finalMigrationDebtBurndown.ts'

export type {
  EngineProgramSloCloseoutInput,
} from '../runtime/release/programSloCloseoutGate.ts'
export {
  computeEngineProgramSloCloseoutGate,
} from '../runtime/release/programSloCloseoutGate.ts'

export type {
  EngineRefactorCompletionReadinessChecklist,
} from '../runtime/release/refactorCompletionReadiness.ts'
export {
  computeEngineRefactorCompletionReadiness,
} from '../runtime/release/refactorCompletionReadiness.ts'

export type {
  EnginePhaseHAcceptanceInput,
} from '../runtime/release/phaseHAcceptance.ts'
export {
  computeEnginePhaseHAcceptance,
} from '../runtime/release/phaseHAcceptance.ts'

export type {
  EnginePhaseReleaseBundleInputV1,
  EnginePhaseReleaseBundleResultV1,
} from '../runtime/release/phaseReleaseBundleV1.ts'
export {
  computeEnginePhaseReleaseBundleV1,
} from '../runtime/release/phaseReleaseBundleV1.ts'

export type {
  EnginePhaseReleaseFinalVerdictInputV1,
  EnginePhaseReleaseFinalVerdictResultV1,
} from '../runtime/release/phaseReleaseFinalVerdictV1.ts'
export {
  computeEnginePhaseReleaseFinalVerdictV1,
} from '../runtime/release/phaseReleaseFinalVerdictV1.ts'

export type {
  EngineProgramCloseoutPostmortemChecklist,
} from '../runtime/release/programCloseoutPostmortem.ts'
export {
  computeEngineProgramCloseoutPostmortem,
} from '../runtime/release/programCloseoutPostmortem.ts'

export type {
  EnginePipelineBackendCapabilities,
  EnginePipelineStageContract,
} from '../renderer/pipeline/contractV2.ts'
export {
  isEnginePipelineBackendCapabilityV2,
} from '../renderer/pipeline/contractV2.ts'

export type {
  EnginePhaseAwarePacket,
  EnginePhaseAwarePacketBuildResult,
} from '../renderer/pipeline/phaseAwarePacketBuilder.ts'
export {
  buildEnginePhaseAwarePackets,
} from '../renderer/pipeline/phaseAwarePacketBuilder.ts'

export type {
  EngineProgressivePass,
  EngineProgressiveRenderingInput,
} from '../renderer/pipeline/progressiveRenderingContract.ts'
export {
  resolveEngineProgressivePass,
} from '../renderer/pipeline/progressiveRenderingContract.ts'

export type {
  EnginePartialRedrawDecision,
} from '../renderer/pipeline/partialRedrawPolicy.ts'
export {
  resolveEnginePartialRedrawDecision,
} from '../renderer/pipeline/partialRedrawPolicy.ts'

export type {
  EngineRoiTarget,
  EngineWeightedRoiTarget,
} from '../renderer/pipeline/roiSharpenPolicy.ts'
export {
  resolveEngineRoiSharpenWeights,
} from '../renderer/pipeline/roiSharpenPolicy.ts'

export type {
  EngineGeometryCacheKeyInput,
} from '../renderer/cache/geometryCachePolicy.ts'
export {
  resolveEngineGeometryCacheKey,
  shouldInvalidateEngineGeometryCache,
} from '../renderer/cache/geometryCachePolicy.ts'

export type {
  EngineTextureCacheEntry,
  EngineTexturePriorityTier,
} from '../renderer/cache/textureCachePolicy.ts'
export {
  resolveEngineTextureEvictionCandidates,
  sortEngineTextureUploadQueue,
} from '../renderer/cache/textureCachePolicy.ts'

export type {
  EngineTileRequest,
} from '../renderer/cache/tileSchedulerPolicy.ts'
export {
  resolveEngineTileSchedulerOrder,
} from '../renderer/cache/tileSchedulerPolicy.ts'

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
  EngineVisibility3DExecutionMode,
  EngineVisibility3DPolicyDecision,
  EngineVisibilityBounds2DQuery,
  EngineVisibilityBounds2DResolver,
  EngineVisibilityFrustum3DOcclusionResolver,
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
  resolveEngineVisibility3DPolicyDecision,
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