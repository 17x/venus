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

export * from './index.advancedExports.ts'
