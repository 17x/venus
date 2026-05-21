import { createEngine as createCanonicalEngine } from "./api/createEngine";
import type { CreateEngineOptions } from "./api/createEngineContracts";
import type { EngineHandle } from "./api/public-types";

/**
 * Creates the canonical engine handle for application/runtime consumers.
 * @param options Engine creation options for surface/backend/runtime configuration.
 */
export function createEngine(options: CreateEngineOptions): EngineHandle {
  return createCanonicalEngine(options);
}
export { resolveEnginePerformanceOptions } from "./api/createEngineContracts";
export {
  ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
  ENGINE_RUNTIME_CAPABILITY_REGISTRY,
  ENGINE_RUNTIME_CAPABILITY_MAP,
  resolveEngineRuntimeCapabilityDescriptor,
} from "./api/runtimeCapabilityMap";
export { resolveCreateEnginePolicyBootstrap } from "./policy/createEnginePolicyBootstrap";
export { resolveCreateEngineFrame } from "./render-planning/createEngineFrameResolver";
export {
  createViewportFacade,
  panViewportState,
  resolveViewportState,
  zoomViewportState,
} from "./view/viewportFacade";
export { resolveEngineRenderStrategy } from "./render-runtime/strategy";
export { resolveRuntimeFrameController } from "./render-runtime/runtimeFrameController";
export { createEngineRuntimeFacade } from "./render-runtime/runtimeFacade";
export { drawCanvas2DScenePayload } from "./render-runtime/canvas2dSceneDrawPayload";
export {
  applyPressureContraction,
  resolveEngineFrameBudget,
  resolveFrameBudgetPressure,
  resolveFrameBudgetPressureReason,
  resolveFrameBudgetPressureSignals,
  resolvePhaseBudget,
} from "./scheduler/frameBudgetBroker";
export { compileDocumentChangeSet } from "./compiler/incrementalCompiler";
export { applyDocumentChangeSet, createDocumentSnapshot } from "./document/document-store";
export { createRuntimeWorldFromDocument } from "./ecs/runtimeWorld";
export {
  createSpatialIndexFromWorld,
  querySpatialCandidates,
} from "./spatial/spatialIndex";
export { createEngineSpatialQueryModule, resolveSpatialQueryResult } from "./spatial/spatialQuery/spatialQuery";
export {
  createDefaultEngineBackendProbes,
  resolveAutoBackendMode,
  resolveBackendSelectionFromProtocol,
  resolveBackendSelection,
} from "./protocol/backend/backend-selection";
export { resolvePickingHitStack } from "./picking/pickingPipeline";
export { createEngineHitTestRayModule, resolveNearestRayHit } from "./picking/hitTestRay/hitTestRay";
export { resolveStagedExecutionSnapshot } from "./render-execution/stagedExecutionChain";
export { resolveEngineModuleRegistry } from "./core/module/module-registry";
export { createEngineDocumentStoreModule } from "./core/document/document-store-module";
export { createEngineCompilerModule } from "./core/compiler/incremental-compiler-module";
export { createEngineWorldModule } from "./core/world/runtime-world-module";
export { createEngineViewModule } from "./core/view/viewport-module";
export { createEngineSchedulerModule } from "./core/scheduler/frame-budget-module";
export {
  assertEngineRuntimeProfile,
  resolveEngineCapabilityAccess,
  validateEngineRuntimeProfile,
} from "./profiles/profile-validator";
export { createEngineRuntimeFromProfile } from "./runtime/runtime-builder";
export { createEngineDocumentGraphModule } from "./document/documentGraph/documentGraph";
export { createEngineSceneCompilerModule } from "./compiler/sceneCompiler/sceneCompiler";
export { createEngineRuntimeWorldModule } from "./scene-runtime/runtimeWorld/runtimeWorld";
export { createEngineDirtyPropagationModule } from "./dirty/dirtyPropagation/dirtyPropagation";
export { createEngineCommandEncoderModule } from "./command-buffer/commandEncoder/commandEncoder";
export { createEngineCommandReplayModule } from "./command-buffer/commandReplay/commandReplay";
export { createEngineBackendSelectorModule } from "./backend/backendSelector/backendSelector";
export { createEngineProductAdapterBoundaryModule } from "./api/productAdapterBoundary/productAdapterBoundary";
export { createEnginePublicApiSurfaceModule } from "./api/publicApiSurface/publicApiSurface";
export {
  baseRuntimeProfile,
  engineObservabilityModule,
  engineSchedulerModule,
} from "./profiles/base/base-runtime-profile";
export {
  engineCompilerModule,
  engineDocumentModule,
  engineWorldModule,
  headlessRuntimeProfile,
} from "./profiles/headless/headless-runtime-profile";
export {
  browserPlatformRuntimeProfile,
  engineCompositionModule,
  engineExtractionModule,
  engineRenderPlanningModule,
  engineViewModule,
} from "./profiles/browser/browser-runtime-profile";
export {
  headlessReplayScenarioProfile,
} from "./profiles/scenario/headless-replay-profile";

export type {
  EngineBackendProbe,
} from "./protocol/backend/backend-selection";
export type {
  BackendSelectionResult,
  EngineBackendMode,
  EngineCreateOptions,
  EngineHandle,
  EngineRuntimeApi,
  EngineRuntimeBackendApi,
  EngineRuntimeBackendGetActiveOutput,
  EngineRuntimeBackendGetFallbackTraceOutput,
  EngineRuntimeBackendListAvailableOutput,
  EngineRuntimeCommand,
  EngineRuntimeCommandApi,
  EngineRuntimeCommandEncodeInput,
  EngineRuntimeCommandEncodeOutput,
  EngineRuntimeCommandValidateInput,
  EngineRuntimeCommandValidateOutput,
  EngineRuntimeDirtyApi,
  EngineRuntimeDirtyMarkInput,
  EngineRuntimeDirtyStateOutput,
  EngineRuntimeDocumentApi,
  EngineRuntimeDocumentApplyChangeSetInput,
  EngineRuntimeDocumentApplyChangeSetResult,
  EngineRuntimeFramePlanOutput,
  EngineRuntimeGetTraceOutput,
  EngineRuntimeLodPlanOutput,
  EngineRuntimeLodPlanRequest,
  EngineRuntimeMetricsSnapshot,
  EngineRuntimeObservabilityApi,
  EngineRuntimePlanApi,
  EngineRuntimePlanFrameRequest,
  EngineRuntimePlanInspectOutput,
  EngineRuntimeReplayOutput,
  EngineRuntimeReplayTokenOutput,
  EngineRuntimeResourceApi,
  EngineRuntimeResourceCollectGarbageInput,
  EngineRuntimeResourceCollectGarbageOutput,
  EngineRuntimeResourceDescriptor,
  EngineRuntimeResourcePatch,
  EngineRuntimeResourceResidencyOutput,
  EngineRuntimeRoiPlanOutput,
  EngineRuntimeRoiPlanRequest,
  EngineRuntimeStartTraceInput,
  EngineRuntimeStartTraceOutput,
  EngineRuntimeStopTraceOutput,
  EngineRuntimeTraceEvent,
  EngineRuntimeVisibilityPlanOutput,
  EngineRuntimeVisibilityPlanRequest,
  EngineRuntimeWorldApi,
  EngineRuntimeWorldGraphStatsOutput,
  EngineRuntimeWorldSnapshotOutput,
  EnginePickHit,
  EnginePickOptions,
  EnginePickPointInput,
  EnginePickResult,
  EngineQueryBoundsInput,
  EngineQueryResult,
  EngineRayInput,
  EngineRaycastHit,
  EngineRaycastOptions,
  EngineLifecycleState,
  EngineRuntimeAdapter,
  EngineStatsSnapshot,
  EngineSurface,
} from "./api/public-types";

export type {
  CreateEngineOptions,
  EngineCullingOptions,
  EngineOverscanOptions,
  EnginePerformanceOptions,
  EnginePerformanceOptionsObject,
  EnginePerformanceToggle,
  ResolvedEnginePerformanceOptions,
} from "./api/createEngineContracts";

export type {
  EngineRuntimeCapabilityEntry,
  EngineRuntimeCapabilityName,
  EnginePublicApiStability,
  EngineRuntimeCapabilityDescriptor,
} from "./api/runtimeCapabilityMap";

export type {
  CreateEnginePolicyBootstrap as CreateEnginePolicyBootstrapSnapshot,
  EnginePolicyProfile,
  EngineQualityPreset,
  EngineRuntimeBudgetSettings,
} from "./policy/createEnginePolicyBootstrap";

export type {
  EngineBudgetPressure,
  EngineFramePlanningDecision,
  EnginePlanningSceneSummary,
  EnginePlanningViewport,
} from "./render-planning/createEngineFrameResolver";

export type {
  EngineInteractionMutationKind,
  EngineRenderStrategyDecision,
  EngineRenderStrategyInput,
  EngineRenderStrategyPhase,
} from "./render-runtime/strategy";

export type {
  EngineRuntimeFrameControllerDecision,
  EngineRuntimeFrameControllerInput,
} from "./render-runtime/runtimeFrameController";

export type {
  EngineRenderFrameStats,
  EngineRuntimeDiagnosticsAdapter,
  EngineRuntimeFacade,
  EngineRuntimeLoopAdapter,
  EngineRuntimeRenderAdapter,
} from "./render-runtime/runtimeFacade";
export type {
  Canvas2DSceneDrawPayload,
  Canvas2DSceneDrawRect,
} from "./render-runtime/canvas2dSceneDrawPayload";

export type {
  EngineFrameBudget,
  EngineFrameBudgetBrokerDecision,
  EngineFrameBudgetBrokerInput,
  EngineFrameBudgetPressure,
  EngineFrameBudgetPressureSignals,
} from "./scheduler/frameBudgetBroker";

export type {
  EngineViewportAnchor,
  EngineViewportFacade,
  EngineViewportPatch,
  EngineViewportState,
} from "./view/viewportFacade";
export type {
  EngineDocumentChangeOperation,
  EngineDocumentChangeSet,
  EngineDocumentNode,
  EngineDocumentNodeKind,
  EngineDocumentNodePayload,
  EngineDocumentRemoveNodeOperation,
  EngineDocumentSnapshot,
  EngineDocumentUpsertNodeOperation,
} from "./document/document-contracts";
export type {
  EngineDocumentGraphCreateSnapshotOptions,
  EngineDocumentGraphModule,
} from "./document/documentGraph/documentGraph.contract";
export type {
  EngineCompilerInvalidationSummary,
  EngineIncrementalCompileOutput,
} from "./compiler/incrementalCompiler";
export type {
  EngineSceneCompileInput,
  EngineSceneCompilerModule,
} from "./compiler/sceneCompiler/sceneCompiler.contract";
export type {
  EngineRuntimeEntity,
  EngineRuntimeWorldSnapshot,
} from "./ecs/runtimeWorld";
export type {
  EngineRuntimeWorldModule,
} from "./scene-runtime/runtimeWorld/runtimeWorld.contract";
export type {
  EngineDirtyDomain,
  EngineDirtyPropagationModule,
  EngineDirtyStateSnapshot,
} from "./dirty/dirtyPropagation/dirtyPropagation.contract";
export type {
  EngineCommandEncodeResult,
  EngineCommandEncoderModule,
  EngineEncodedCommand,
  EngineEncodedCommandKind,
} from "./command-buffer/commandEncoder/commandEncoder.contract";
export type {
  EngineCommandReplayEvent,
  EngineCommandReplayModule,
  EngineCommandReplayResult,
} from "./command-buffer/commandReplay/commandReplay.contract";
export type {
  EngineBackendSelectorModule,
} from "./backend/backendSelector/backendSelector.contract";
export type {
  EngineProductAdapterBoundaryModule,
  EngineProductBoundaryValidationResult,
  EngineProductBoundaryViolation,
} from "./api/productAdapterBoundary/productAdapterBoundary.contract";
export type {
  EnginePublicApiDescriptor,
  EnginePublicApiLevel,
  EnginePublicApiSurfaceModule,
  EnginePublicApiViolation,
} from "./api/publicApiSurface/publicApiSurface.contract";
export type { EngineSpatialIndexSnapshot } from "./spatial/spatialIndex";
export type {
  EngineSpatialQueryBounds,
  EngineSpatialQueryModule,
  EngineSpatialQueryNode,
  EngineSpatialQueryPoint,
  EngineSpatialQueryResult,
} from "./spatial/spatialQuery/spatialQuery.contract";
export type {
  EnginePickingHit,
  EnginePickingHitStack,
} from "./picking/pickingPipeline";
export type {
  EngineHitTestRayModule,
  EngineRay3D,
  EngineRayPickCandidate,
  EngineRayPickHit,
} from "./picking/hitTestRay/hitTestRay.contract";
export type { EngineExecutionSnapshot } from "./render-execution/stagedExecutionChain";
export type {
  EngineDocumentStoreModule,
} from "./core/document/document-module-contracts";
export type {
  EngineCompilerModule,
} from "./core/compiler/compiler-module-contracts";
export type {
  EngineWorldModule,
} from "./core/world/world-module-contracts";
export type {
  EngineViewModule,
} from "./core/view/view-module-contracts";
export type {
  EngineSchedulerModule,
} from "./core/scheduler/scheduler-module-contracts";
export type {
  EngineCapabilityId,
  EngineCoreModule,
  EngineModuleActivationContext,
  EngineModuleActivationResult,
  EngineModuleDiagnosticsSink,
  EngineModuleId,
  EngineModuleWarning,
  EngineRuntimeStrictness,
} from "./core/module/module-contracts";
export type {
  EngineCompositionLayerContract,
  EngineCompositionLayerId,
  EngineCompositionPlane,
  EngineCompositionStackSnapshot,
} from "./core/composition/composition-contracts";
export type {
  EngineModuleDuplicateId,
  EngineModuleMissingRequirement,
  EngineModuleRegistryResult,
} from "./core/module/module-registry";
export type {
  EngineBackendPriority,
  EngineCapabilityAccessInput,
  EngineCapabilityAccessResult,
  EngineScenarioDiagnosticsSnapshot,
  EngineScenarioProfileManifest,
  EngineScenarioReplayInputEvent,
  EngineScenarioReplayManifest,
  EngineRuntimeProfile,
  EngineRuntimeProfileTarget,
} from "./profiles/profile-contracts";
export type {
  EngineProfileValidationIssue,
  EngineProfileValidationResult,
  EngineProfileValidationSeverity,
} from "./profiles/profile-validator";
export type {
  EngineProfileRuntime,
  EngineRuntimeBuilderOptions,
  EngineRuntimeCapabilityRequirement,
} from "./runtime/runtime-builder";

export { createTestSurface } from "./testing/createTestSurface";
