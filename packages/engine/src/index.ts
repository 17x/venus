import { createEngine as createCanonicalEngine } from "./orchestration/api/createEngine";
import type { CreateEngineOptions } from "./orchestration/api/createEngineContracts";
import type { EngineHandle } from "./orchestration/api/public-types";

/**
 * Creates the canonical engine handle for application/runtime consumers.
 * @param options Engine creation options for surface/backend/runtime configuration.
 */
export function createEngine(options: CreateEngineOptions): EngineHandle {
  return createCanonicalEngine(options);
}
export { resolveEnginePerformanceOptions } from "./orchestration/api/createEngineContracts";
export {
  ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION,
  ENGINE_RUNTIME_CAPABILITY_REGISTRY,
  ENGINE_RUNTIME_CAPABILITY_MAP,
  resolveEngineRuntimeCapabilityDescriptor,
} from "./orchestration/api/runtimeCapabilityMap";
export { resolveCreateEnginePolicyBootstrap } from "./optimization/createEnginePolicyBootstrap";
export { resolveCreateEngineFrame } from "./orchestration/render-planning/createEngineFrameResolver";
export {
  createViewportFacade,
  panViewportState,
  resolveViewportState,
  zoomViewportState,
} from "./kernel/view/viewportFacade";
export {
  createEngineCameraController,
} from "./kernel/interaction/camera/engineCameraController";
export type {
  EngineCameraController,
  EngineCameraControllerOptions,
  EngineCameraControllerScheduler,
} from "./kernel/interaction/camera/engineCameraController";
export type {
  EngineCameraCommand,
  EngineCameraFrameBounds,
  EngineCameraPreset,
  EngineCameraState,
} from "./kernel/interaction/camera/cameraCommandProtocol";
export { resolveEngineRenderStrategy } from "./orchestration/render-runtime/strategy";
export { resolveRuntimeFrameController } from "./orchestration/render-runtime/runtimeFrameController";
export { createEngineRuntimeFacade } from "./orchestration/render-runtime/runtimeFacade";
export { drawCanvas2DScenePayload } from "./orchestration/render-runtime/canvas2dSceneDrawPayload";
export {
  applyPressureContraction,
  resolveEngineFrameBudget,
  resolveFrameBudgetPressure,
  resolveFrameBudgetPressureReason,
  resolveFrameBudgetPressureSignals,
  resolvePhaseBudget,
} from "./optimization/frameBudgetBroker";
export { compileDocumentChangeSet } from "./kernel/compiler/incrementalCompiler";
export { applyDocumentChangeSet, createDocumentSnapshot } from "./kernel/document/document-store";
export { createRuntimeWorldFromDocument } from "./kernel/ecs/runtimeWorld";
export {
  createSpatialIndexFromWorld,
  querySpatialCandidates,
} from "./kernel/spatial/spatialIndex";
export type {
  EngineSpatialItem,
  EngineSpatialIndex,
} from "./kernel/spatial/engineSpatialIndex";
export { createEngineBvh } from "./kernel/spatial/bvh";
export type {
  BvhAABB,
  BvhPrimitive,
  EngineBvh,
} from "./kernel/spatial/bvh";
export { createEngineSpatialQueryModule, resolveSpatialQueryResult } from "./kernel/spatial/spatialQuery/spatialQuery";
export {
  createDefaultEngineBackendProbes,
  resolveAutoBackendMode,
  resolveBackendSelectionFromProtocol,
  resolveBackendSelection,
} from "./platform/protocol/backend/backend-selection";
export { resolvePickingHitStack } from "./kernel/picking/pickingPipeline";
export { createEngineHitTestRayModule, resolveNearestRayHit } from "./kernel/picking/hitTestRay/hitTestRay";
export { resolveStagedExecutionSnapshot } from "./orchestration/render-execution/stagedExecutionChain";
export { resolveEngineModuleRegistry } from "./kernel/module-registry";
export { createEngineDocumentStoreModule } from "./kernel/core/document/document-store-module";
export { createEngineCompilerModule } from "./kernel/core/compiler/incremental-compiler-module";
export { createEngineWorldModule } from "./kernel/core/world/runtime-world-module";
export { createEngineViewModule } from "./kernel/core/view/viewport-module";
export { createEngineSchedulerModule } from "./kernel/core/scheduler/frame-budget-module";
export {
  assertEngineRuntimeProfile,
  resolveEngineCapabilityAccess,
  validateEngineRuntimeProfile,
} from "./kernel/profile-validator";
export { createEngineRuntimeFromProfile } from "./kernel/runtime-builder";
export { createEngineDocumentGraphModule } from "./kernel/document/documentGraph/documentGraph";
export * from "./backend/index";
export * from "./kernel/index";
export * from "./platform/index";
export * from "./orchestration/index";
export * from "./optimization/index";
export { createEngineSceneCompilerModule } from "./kernel/compiler/sceneCompiler/sceneCompiler";
export { createEngineRuntimeWorldModule } from "./kernel/scene-runtime/runtimeWorld/runtimeWorld";
export { createEngineDirtyPropagationModule } from "./kernel/dirty/dirtyPropagation/dirtyPropagation";
export { createEngineCommandEncoderModule } from "./kernel/command-buffer/commandEncoder/commandEncoder";
export { createEngineCommandReplayModule } from "./kernel/command-buffer/commandReplay/commandReplay";
export { createEngineBackendSelectorModule } from "./backend/backendSelector/backendSelector";
export { createEngineProductAdapterBoundaryModule } from "./orchestration/api/productAdapterBoundary/productAdapterBoundary";
export { createEnginePublicApiSurfaceModule } from "./orchestration/api/publicApiSurface/publicApiSurface";
export {
  baseRuntimeProfile,
  engineObservabilityModule,
  engineSchedulerModule,
} from "./kernel/profiles/base/base-runtime-profile";
export {
  engineCompilerModule,
  engineDocumentModule,
  engineWorldModule,
  headlessRuntimeProfile,
} from "./kernel/profiles/headless/headless-runtime-profile";
export {
  browserPlatformRuntimeProfile,
  engineCompositionModule,
  engineExtractionModule,
  engineRenderPlanningModule,
  engineViewModule,
} from "./kernel/profiles/browser/browser-runtime-profile";
export {
  headlessReplayScenarioProfile,
} from "./kernel/profiles/scenario/headless-replay-profile";

export type {
  EngineBackendProbe,
} from "./platform/protocol/backend/backend-selection";
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
} from "./orchestration/api/public-types";

export type {
  CreateEngineOptions,
  EngineCullingOptions,
  EngineOverscanOptions,
  EnginePerformanceOptions,
  EnginePerformanceOptionsObject,
  EnginePerformanceToggle,
  ResolvedEnginePerformanceOptions,
} from "./orchestration/api/createEngineContracts";

export type {
  EngineRuntimeCapabilityEntry,
  EngineRuntimeCapabilityName,
  EnginePublicApiStability,
  EngineRuntimeCapabilityDescriptor,
} from "./orchestration/api/runtimeCapabilityMap";

export type {
  CreateEnginePolicyBootstrap as CreateEnginePolicyBootstrapSnapshot,
  EnginePolicyProfile,
  EngineQualityPreset,
  EngineRuntimeBudgetSettings,
} from "./optimization/createEnginePolicyBootstrap";

export type {
  EngineBudgetPressure,
  EngineFramePlanningDecision,
  EnginePlanningSceneSummary,
  EnginePlanningViewport,
} from "./orchestration/render-planning/createEngineFrameResolver";

export type {
  EngineInteractionMutationKind,
  EngineRenderStrategyDecision,
  EngineRenderStrategyInput,
  EngineRenderStrategyPhase,
} from "./orchestration/render-runtime/strategy";

export type {
  EngineRuntimeFrameControllerDecision,
  EngineRuntimeFrameControllerInput,
} from "./orchestration/render-runtime/runtimeFrameController";

export type {
  EngineRenderFrameStats,
  EngineRuntimeDiagnosticsAdapter,
  EngineRuntimeFacade,
  EngineRuntimeLoopAdapter,
  EngineRuntimeRenderAdapter,
} from "./orchestration/render-runtime/runtimeFacade";
export type {
  Canvas2DSceneDrawPayload,
  Canvas2DSceneDrawRect,
} from "./orchestration/render-runtime/canvas2dSceneDrawPayload";

export type {
  EngineFrameBudget,
  EngineFrameBudgetBrokerDecision,
  EngineFrameBudgetBrokerInput,
  EngineFrameBudgetPressure,
  EngineFrameBudgetPressureSignals,
} from "./optimization/frameBudgetBroker";

export type {
  EngineViewportAnchor,
  EngineViewportFacade,
  EngineViewportPatch,
  EngineViewportState,
} from "./kernel/view/viewportFacade";
export type {
  EngineDocumentChangeOperation,
  EngineDocumentChangeSet,
  EngineDocumentNode,
  EngineDocumentNodeKind,
  EngineDocumentNodePayload,
  EngineDocumentRemoveNodeOperation,
  EngineDocumentSnapshot,
  EngineDocumentUpsertNodeOperation,
} from "./kernel/document/document-contracts";
export type {
  EngineDocumentGraphCreateSnapshotOptions,
  EngineDocumentGraphModule,
} from "./kernel/document/documentGraph/documentGraph.contract";
export type {
  EngineCompilerInvalidationSummary,
  EngineIncrementalCompileOutput,
} from "./kernel/compiler/incrementalCompiler";
export type {
  EngineSceneCompileInput,
  EngineSceneCompilerModule,
} from "./kernel/compiler/sceneCompiler/sceneCompiler.contract";
export type {
  EngineRuntimeEntity,
  EngineRuntimeWorldSnapshot,
} from "./kernel/ecs/runtimeWorld";
export type {
  EngineRuntimeWorldModule,
} from "./kernel/scene-runtime/runtimeWorld/runtimeWorld.contract";
export type {
  EngineDirtyDomain,
  EngineDirtyPropagationModule,
  EngineDirtyStateSnapshot,
} from "./kernel/dirty/dirtyPropagation/dirtyPropagation.contract";
export type {
  EngineCommandEncodeResult,
  EngineCommandEncoderModule,
  EngineEncodedCommand,
  EngineEncodedCommandKind,
} from "./kernel/command-buffer/commandEncoder/commandEncoder.contract";
export type {
  EngineCommandReplayEvent,
  EngineCommandReplayModule,
  EngineCommandReplayResult,
} from "./kernel/command-buffer/commandReplay/commandReplay.contract";
export type {
  EngineBackendSelectorModule,
} from "./backend/backendSelector/backendSelector.contract";
export type {
  EngineProductAdapterBoundaryModule,
  EngineProductBoundaryValidationResult,
  EngineProductBoundaryViolation,
} from "./orchestration/api/productAdapterBoundary/productAdapterBoundary.contract";
export type {
  EnginePublicApiDescriptor,
  EnginePublicApiLevel,
  EnginePublicApiSurfaceModule,
  EnginePublicApiViolation,
} from "./orchestration/api/publicApiSurface/publicApiSurface.contract";
export type { EngineSpatialIndexSnapshot } from "./kernel/spatial/spatialIndex";
export type {
  EngineSpatialQueryBounds,
  EngineSpatialQueryModule,
  EngineSpatialQueryNode,
  EngineSpatialQueryPoint,
  EngineSpatialQueryResult,
} from "./kernel/spatial/spatialQuery/spatialQuery.contract";
export type {
  EnginePickingHit,
  EnginePickingHitStack,
} from "./kernel/picking/pickingPipeline";
export type {
  EngineHitTestRayModule,
  EngineRay3D,
  EngineRayPickCandidate,
  EngineRayPickHit,
} from "./kernel/picking/hitTestRay/hitTestRay.contract";
export type { EngineExecutionSnapshot } from "./orchestration/render-execution/stagedExecutionChain";
export type {
  EngineDocumentStoreModule,
} from "./kernel/core/document/document-module-contracts";
export type {
  EngineCompilerModule,
} from "./kernel/core/compiler/compiler-module-contracts";
export type {
  EngineWorldModule,
} from "./kernel/core/world/world-module-contracts";
export type {
  EngineViewModule,
} from "./kernel/core/view/view-module-contracts";
export type {
  EngineSchedulerModule,
} from "./kernel/core/scheduler/scheduler-module-contracts";
export type {
  EngineCapabilityId,
  EngineCoreModule,
  EngineModuleActivationContext,
  EngineModuleActivationResult,
  EngineModuleDiagnosticsSink,
  EngineModuleId,
  EngineModuleWarning,
  EngineRuntimeStrictness,
} from "./kernel/module-contracts";
export type {
  EngineCompositionLayerContract,
  EngineCompositionLayerId,
  EngineCompositionPlane,
  EngineCompositionStackSnapshot,
} from "./kernel/core/composition/composition-contracts";
export type {
  EngineModuleDuplicateId,
  EngineModuleMissingRequirement,
  EngineModuleRegistryResult,
} from "./kernel/module-registry";
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
} from "./kernel/profile-contracts";
export type {
  EngineProfileValidationIssue,
  EngineProfileValidationResult,
  EngineProfileValidationSeverity,
} from "./kernel/profile-validator";
export type {
  EngineProfileRuntime,
  EngineRuntimeBuilderOptions,
  EngineRuntimeCapabilityRequirement,
} from "./kernel/runtime-builder";

export { createTestSurface } from "./testing/createTestSurface";
