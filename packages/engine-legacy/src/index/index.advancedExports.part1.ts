
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
