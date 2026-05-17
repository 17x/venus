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
  EngineStrategyInputV2,
} from '../runtime/strategy/strategyInputV2.ts'
export {
  resolveEngineStrategyInputV2,
} from '../runtime/strategy/strategyInputV2.ts'

export type {
  EngineDegradationDecision,
  EngineDegradationLevel,
} from '../runtime/strategy/degradationLadder.ts'
export {
  resolveEngineDegradationDecision,
} from '../runtime/strategy/degradationLadder.ts'

export type {
  EnginePhaseStabilityConfig,
  EnginePhaseStabilityState,
} from '../runtime/strategy/phaseStabilityGuard.ts'
export {
  DEFAULT_ENGINE_PHASE_STABILITY_CONFIG,
  resolveEngineStablePhase,
} from '../runtime/strategy/phaseStabilityGuard.ts'

export type {
  EnginePhaseBudgetProfiles,
} from '../runtime/strategy/budgetProfiles.ts'
export {
  DEFAULT_ENGINE_PHASE_BUDGET_PROFILES,
} from '../runtime/strategy/budgetProfiles.ts'

export type {
  EngineQosControllerDecision,
  EngineQosControllerInput,
} from '../runtime/strategy/qosController.ts'
export {
  resolveEngineQosControllerDecision,
} from '../runtime/strategy/qosController.ts'

export type {
  EngineQosHardGuardResult,
} from '../runtime/strategy/qosHardGuard.ts'
export {
  applyEngineQosHardGuard,
} from '../runtime/strategy/qosHardGuard.ts'

export {
  applyEngineQosBudgetToRendererContext,
} from '../runtime/strategy/qosRendererWiring.ts'

export type {
  EngineProfilePolicyPack,
} from '../runtime/strategy/profilePolicyPack.ts'
export {
  resolveEngineProfilePolicyPack,
} from '../runtime/strategy/profilePolicyPack.ts'

export type {
  EngineHybridAutoPolicyDecision,
  EngineHybridAutoPolicyState,
} from '../runtime/strategy/hybridAutoPolicy.ts'
export {
  resolveEngineHybridAutoPolicy,
} from '../runtime/strategy/hybridAutoPolicy.ts'

export type {
  EngineQosDiagnosticsPanel,
} from '../runtime/strategy/qosDiagnosticsPanel.ts'
export {
  resolveEngineQosDiagnosticsPanel,
} from '../runtime/strategy/qosDiagnosticsPanel.ts'

export type {
  EngineQosE2EReport,
  EngineQosReplayFrameSample,
} from '../runtime/strategy/qosE2EReport.ts'
export {
  resolveEngineQosE2EReport,
} from '../runtime/strategy/qosE2EReport.ts'

export type {
  EngineStrategyConvergenceResult,
} from '../runtime/strategy/strategyConvergence.ts'
export {
  resolveEngineStrategyConvergence,
} from '../runtime/strategy/strategyConvergence.ts'

export type {
  EngineGpuUploadBrokerDecision,
  EngineGpuUploadLaneRequest,
} from '../runtime/budget/gpuUploadBroker.ts'
export {
  resolveEngineGpuUploadBrokerDecision,
} from '../runtime/budget/gpuUploadBroker.ts'

export type {
  EngineWorkerBudgetBrokerDecision,
  EngineWorkerTaskRequest,
} from '../runtime/budget/workerBudgetBroker.ts'
export {
  resolveEngineWorkerBudgetBrokerDecision,
} from '../runtime/budget/workerBudgetBroker.ts'

export type {
  EngineSchedulerPolicyDecision,
  EngineSchedulerPolicyInput,
} from '../runtime/renderScheduler/schedulerPolicyV2.ts'
export {
  resolveEngineSchedulerPolicyV2,
} from '../runtime/renderScheduler/schedulerPolicyV2.ts'

export type {
  EngineRenderRequestReason,
  EngineRenderRequestReasonCounters,
} from '../renderer/fallbackTaxonomy/renderRequestTaxonomy.ts'
export {
  createEngineRenderRequestReasonCounters,
  ENGINE_RENDER_REQUEST_REASON,
  incrementEngineRenderRequestReason,
} from '../renderer/fallbackTaxonomy/renderRequestTaxonomy.ts'

export type {
  EngineFallbackSeverity,
} from '../renderer/fallbackTaxonomy/fallbackReasonModel.ts'
export {
  isEngineFallbackRecovered,
  resolveEngineFallbackSeverity,
} from '../renderer/fallbackTaxonomy/fallbackReasonModel.ts'

export type {
  EngineCacheConsistencyFactors,
} from '../renderer/cache/cacheConsistencyGuard.ts'
export {
  canReuseEngineCacheEntry,
  resolveEngineCacheConsistencyKey,
} from '../renderer/cache/cacheConsistencyGuard.ts'

export type {
  EngineStreamingPressureDecision,
  EngineStreamingPressureInput,
} from '../runtime/policy/streamingPressurePolicy.ts'
export {
  resolveEngineStreamingPressurePolicy,
} from '../runtime/policy/streamingPressurePolicy.ts'

export type {
  EngineIncrementalVisibilityEntry,
  EngineIncrementalVisibilityIndex,
} from '../renderer/plan/incrementalVisibilityIndex.ts'
export {
  applyEngineIncrementalVisibilityUpdates,
  queryEngineIncrementalVisibility,
} from '../renderer/plan/incrementalVisibilityIndex.ts'

export type {
  EngineAnimationCachePolicyDecision,
  EngineAnimationCachePolicyInput,
} from '../runtime/policy/animationCachePolicy.ts'
export {
  resolveEngineAnimationCachePolicy,
} from '../runtime/policy/animationCachePolicy.ts'

export type {
  EngineCameraRuntimePolicy,
} from '../runtime/policy/cameraRuntimePolicy.ts'
export {
  resolveEngineCameraRuntimePolicy,
} from '../runtime/policy/cameraRuntimePolicy.ts'

export type {
  EngineMedicalRegionCandidate,
} from '../runtime/policy/medicalMultiResolutionPolicy.ts'
export {
  resolveEngineMedicalMultiResolutionOrder,
} from '../runtime/policy/medicalMultiResolutionPolicy.ts'

export type {
  EngineBackendCapabilityFlags,
} from '../renderer/pipeline/backendFallbackMatrix.ts'
export {
  resolveEngineBackendFallbackMatrix,
} from '../renderer/pipeline/backendFallbackMatrix.ts'

export type {
  EnginePipelineFrameTrace,
  EnginePipelineStageTraceSample,
} from '../renderer/pipeline/pipelineTrace.ts'
export {
  resolveEnginePipelineFrameTrace,
} from '../renderer/pipeline/pipelineTrace.ts'

export type {
  EngineRenderRegressionResult,
  EngineRenderRegressionSample,
} from '../renderer/pipeline/renderRegressionHarness.ts'
export {
  resolveEngineRenderRegressionResult,
} from '../renderer/pipeline/renderRegressionHarness.ts'

export type {
  EngineScenarioTuningPack,
} from '../runtime/policy/scenarioTuningPacks.ts'
export {
  resolveEngineScenarioTuningPack,
} from '../runtime/policy/scenarioTuningPacks.ts'

export type {
  EngineMedicalLayerCandidate,
} from '../runtime/policy/medicalCriticalLayerPolicy.ts'
export {
  resolveEngineMedicalCriticalLayerPolicy,
} from '../runtime/policy/medicalCriticalLayerPolicy.ts'

export type {
  EngineMedicalRoiCandidate,
} from '../runtime/policy/medicalRoiPolicy.ts'
export {
  resolveEngineMedicalRoiPriority,
} from '../runtime/policy/medicalRoiPolicy.ts'

export type {
  EngineMassiveProgressivePolicyInput,
} from '../runtime/policy/massiveProgressivePolicy.ts'
export {
  shouldLoadMassiveProgressiveChunkNow,
} from '../runtime/policy/massiveProgressivePolicy.ts'

export type {
  EngineMassiveThroughputPolicyInput,
} from '../runtime/policy/massiveThroughputPolicy.ts'
export {
  resolveEngineMassiveThroughputUnits,
} from '../runtime/policy/massiveThroughputPolicy.ts'

export type {
  EngineProfileConsistencyDelta,
  EngineProfileMetricSample,
} from '../runtime/diagnostics/profileConsistencyChecker.ts'
export {
  resolveEngineProfileConsistencyDeltas,
} from '../runtime/diagnostics/profileConsistencyChecker.ts'

export type {
  EngineBottleneckSample,
  EngineTuningRecommendation,
} from '../runtime/diagnostics/tuningAdvisor.ts'
export {
  resolveEngineTuningAdvisorRecommendations,
} from '../runtime/diagnostics/tuningAdvisor.ts'

export type {
  EngineRegressionRedlineInput,
  EngineRegressionRedlineResult,
} from '../runtime/diagnostics/regressionRedlinePolicy.ts'
export {
  resolveEngineRegressionRedlineResult,
} from '../runtime/diagnostics/regressionRedlinePolicy.ts'

export type {
  EngineDeviceTier,
  EngineDeviceTierRecommendation,
} from '../runtime/diagnostics/deviceTierPerformanceReport.ts'
export {
  resolveEngineDeviceTierRecommendations,
} from '../runtime/diagnostics/deviceTierPerformanceReport.ts'

export type {
  EngineThermalAwareMode,
  EngineThermalPolicyInput,
} from '../runtime/policy/thermalAwarePolicyExperiment.ts'
export {
  resolveEngineThermalAwareMode,
} from '../runtime/policy/thermalAwarePolicyExperiment.ts'

export type {
  EngineScenarioRound1Verdict,
} from '../runtime/diagnostics/scenarioSpecializationRound1.ts'
export {
  resolveEngineScenarioRound1Summary,
} from '../runtime/diagnostics/scenarioSpecializationRound1.ts'

export type {
  EngineBenchmarkSuiteCase,
} from '../bench/benchmarkSuiteContract.ts'
export {
  validateEngineBenchmarkSuiteCases,
} from '../bench/benchmarkSuiteContract.ts'

export type {
  EnginePerfTrendSample,
} from '../bench/perfTrendAnalyzer.ts'
export {
  detectEnginePerfRegressionTrend,
} from '../bench/perfTrendAnalyzer.ts'

export type {
  EngineRuntimeInspectorV2Snapshot,
} from '../debug/runtimeInspectorV2.ts'
export {
  resolveEngineRuntimeInspectorV2Snapshot,
} from '../debug/runtimeInspectorV2.ts'

export type {
  EngineDeterministicGuardInput,
} from '../runtime/diagnostics/deterministicGuardV2.ts'
export {
  passEngineDeterministicGuardV2,
} from '../runtime/diagnostics/deterministicGuardV2.ts'

export type {
  EngineInputStormSample,
} from '../runtime/diagnostics/inputStormGuard.ts'
export {
  passEngineInputStormGuard,
} from '../runtime/diagnostics/inputStormGuard.ts'

export type {
  EngineBlankFrameSample,
} from '../runtime/diagnostics/blankFrameGuard.ts'
export {
  passEngineBlankFrameGuard,
} from '../runtime/diagnostics/blankFrameGuard.ts'

export type {
  EngineSharpenSlaSample,
} from '../runtime/diagnostics/sharpenSlaGate.ts'
export {
  passEngineSharpenSlaGate,
} from '../runtime/diagnostics/sharpenSlaGate.ts'

export type {
  EngineCriticalLayerIntegritySample,
} from '../runtime/diagnostics/criticalLayerIntegrityGate.ts'
export {
  passEngineCriticalLayerIntegrityGate,
} from '../runtime/diagnostics/criticalLayerIntegrityGate.ts'

export type {
  EngineMemoryCacheGateSample,
} from '../runtime/diagnostics/memoryCacheGate.ts'
export {
  passEngineMemoryCacheGate,
} from '../runtime/diagnostics/memoryCacheGate.ts'

export type {
  EngineBackendFeatureRequirement,
} from '../renderer/pipeline/backendCompatibilityGate.ts'
export {
  passEngineBackendCompatibilityGate,
} from '../renderer/pipeline/backendCompatibilityGate.ts'

export type {
  EngineGateVerdict,
} from '../runtime/release/scenarioSpecializationRound2.ts'
export {
  resolveEngineScenarioSpecializationRound2,
} from '../runtime/release/scenarioSpecializationRound2.ts'

export type {
  EnginePhaseEAcceptanceInput,
} from '../runtime/release/phaseEAcceptance.ts'
export {
  passEnginePhaseEAcceptance,
} from '../runtime/release/phaseEAcceptance.ts'

export type {
  EngineMigrationMapping,
} from '../runtime/release/migrationGuideV1.ts'
export {
  validateEngineMigrationMappings,
} from '../runtime/release/migrationGuideV1.ts'

export type {
  EngineRolloutBatch,
} from '../runtime/release/rolloutPlanV1.ts'
export {
  validateEngineRolloutPlanV1,
} from '../runtime/release/rolloutPlanV1.ts'

export type {
  EngineProductionSloSample,
} from '../runtime/release/productionDashboardPolicy.ts'
export {
  resolveEngineProductionAlerts,
} from '../runtime/release/productionDashboardPolicy.ts'

export type {
  EngineIncidentRunbookChecklist,
} from '../runtime/release/incidentRunbook.ts'
export {
  validateEngineIncidentRunbook,
} from '../runtime/release/incidentRunbook.ts'

export type {
  EngineProfileGovernanceRecord,
} from '../runtime/release/profileGovernancePolicy.ts'
export {
  validateEngineProfileGovernanceRecord,
} from '../runtime/release/profileGovernancePolicy.ts'

export type {
  EngineAbMetricPair,
} from '../runtime/release/runtimeAbFramework.ts'
export {
  isEngineAbDeltaSignificant,
} from '../runtime/release/runtimeAbFramework.ts'

export type {
  EngineAiTuningProposal,
} from '../runtime/release/aiTuningProposalV1.ts'
export {
  validateEngineAiTuningProposalV1,
} from '../runtime/release/aiTuningProposalV1.ts'

export type {
  EngineCloudEdgeProfileExtension,
} from '../runtime/release/cloudEdgeProfileExtension.ts'
export {
  validateEngineCloudEdgeProfileExtension,
} from '../runtime/release/cloudEdgeProfileExtension.ts'

export type {
  EngineInternalWhitepaperChecklist,
} from '../runtime/release/internalWhitepaper.ts'
export {
  validateEngineInternalWhitepaper,
} from '../runtime/release/internalWhitepaper.ts'

export type {
  EngineTechDebtEntry,
} from '../runtime/release/techDebtLedger.ts'
export {
  validateEngineTechDebtLedger,
} from '../runtime/release/techDebtLedger.ts'

export type {
  EngineQuarterlyAuditTemplate,
} from '../runtime/release/quarterlyAuditTemplates.ts'
export {
  validateEngineQuarterlyAuditTemplates,
} from '../runtime/release/quarterlyAuditTemplates.ts'

export type {
  EngineV2RoadmapChecklist,
} from '../runtime/release/v2RoadmapDraft.ts'
export {
  validateEngineV2RoadmapDraft,
} from '../runtime/release/v2RoadmapDraft.ts'

export type {
  EngineRcReportSample,
} from '../runtime/release/rcValidation.ts'
export {
  passEngineRcValidation,
} from '../runtime/release/rcValidation.ts'

export type {
  EngineGaReadinessChecklist,
} from '../runtime/release/gaReadinessChecklist.ts'
export {
  validateEngineGaReadiness,
} from '../runtime/release/gaReadinessChecklist.ts'

export type {
  EngineGaPostmortemChecklist,
} from '../runtime/release/gaPostmortem.ts'
export {
  validateEngineGaPostmortem,
} from '../runtime/release/gaPostmortem.ts'

export type {
  EngineWeek1ObservabilitySample,
} from '../runtime/release/postGaWeek1ObservabilityAudit.ts'
export {
  computeEnginePostGaWeek1ObservabilityAudit,
} from '../runtime/release/postGaWeek1ObservabilityAudit.ts'

export type {
  EngineEmergencyRollbackDrillChecklist,
} from '../runtime/release/emergencyRollbackDrillV1.ts'
export {
  computeEngineEmergencyRollbackDrillV1,
} from '../runtime/release/emergencyRollbackDrillV1.ts'

export type {
  EngineCanaryAutopauseInput,
} from '../runtime/release/canaryAutopausePolicy.ts'
export {
  computeEngineCanaryAutopause,
} from '../runtime/release/canaryAutopausePolicy.ts'

export type {
  EngineReleaseDriftEntry,
} from '../runtime/release/releaseDriftDetector.ts'
export {
  computeEngineReleaseDrift,
} from '../runtime/release/releaseDriftDetector.ts'

export type {
  EngineProfileSignatureRecord,
} from '../runtime/release/profileSignatureGovernor.ts'
export {
  computeEngineProfileSignatureGovernance,
} from '../runtime/release/profileSignatureGovernor.ts'

export type {
  EngineDeterministicSnapshotArchiveEntry,
} from '../runtime/release/deterministicSnapshotArchive.ts'
export {
  computeEngineDeterministicSnapshotArchive,
} from '../runtime/release/deterministicSnapshotArchive.ts'

export type {
  EngineRegressionTriageTicket,
} from '../runtime/release/regressionTriageAutomation.ts'
export {
  computeEngineRegressionTriageAutomation,
} from '../runtime/release/regressionTriageAutomation.ts'

export type {
  EnginePerfBudgetRecalibrationInput,
} from '../runtime/release/perfBudgetRecalibrationV1.ts'
export {
  computeEnginePerfBudgetRecalibrationV1,
} from '../runtime/release/perfBudgetRecalibrationV1.ts'

export type {
  EngineThreeDimensionalCapabilityReadinessInput,
} from '../runtime/release/threeDimensionalCapabilityReadiness.ts'
export {
  computeEngineThreeDimensionalCapabilityReadiness,
} from '../runtime/release/threeDimensionalCapabilityReadiness.ts'

export type {
  EngineHybrid2d3dTransitionSample,
} from '../runtime/release/hybridPolicyPack2d3d.ts'
export {
  computeEngineHybridPolicyPack2d3d,
} from '../runtime/release/hybridPolicyPack2d3d.ts'

export type {
  EngineSceneLodCandidate,
} from '../runtime/release/sceneLodGovernanceV1.ts'
export {
  computeEngineSceneLodGovernanceV1,
} from '../runtime/release/sceneLodGovernanceV1.ts'

export type {
  EngineMemoryPressureCircuitBreakerInput,
} from '../runtime/release/memoryPressureCircuitBreaker.ts'
export {
  computeEngineMemoryPressureCircuitBreaker,
} from '../runtime/release/memoryPressureCircuitBreaker.ts'

export type {
  EngineGpuFallbackChaosSample,
} from '../runtime/release/gpuFallbackChaosSuite.ts'
export {
  computeEngineGpuFallbackChaosSuite,
} from '../runtime/release/gpuFallbackChaosSuite.ts'

export type {
  EngineEdgeSyncMismatch,
} from '../runtime/release/edgeSyncConsistencyGate.ts'
export {
  computeEngineEdgeSyncConsistencyGate,
} from '../runtime/release/edgeSyncConsistencyGate.ts'

export type {
  EngineReleaseNotesChecklist,
} from '../runtime/release/releaseNotesQualityGate.ts'
export {
  computeEngineReleaseNotesQualityGate,
} from '../runtime/release/releaseNotesQualityGate.ts'

export type {
  EngineCompatibilityMatrixEntryV2,
} from '../runtime/release/compatibilityMatrixV2.ts'
export {
  computeEngineCompatibilityMatrixV2,
} from '../runtime/release/compatibilityMatrixV2.ts'

export type {
  EngineLongRunSoakReportSample,
} from '../runtime/release/longRunSoakReportV1.ts'
export {
  computeEngineLongRunSoakReportV1,
} from '../runtime/release/longRunSoakReportV1.ts'

export type {
  EnginePostGaHotfixCandidate,
} from '../runtime/release/postGaHotfixPolicy.ts'
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