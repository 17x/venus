import type {
  EngineFrameBudget,
  EngineInteractionPredictorState,
  EngineRenderFrame,
  EngineRenderStats,
  EngineRenderer,
  EngineRendererContext,
} from '../../renderer/types/index.ts'
import type { EngineSceneSnapshot } from '../../scene/types/types.ts'
import type { EngineCanvasViewportState } from '../../interaction/viewport/viewport.ts'
import type { EngineVisibleSet } from '../../visibility/index.ts'
import type { EngineCamera3DSnapshot } from '../../camera/camera3dControllers/camera3dControllers.ts'
import type {
  EnginePerformanceSettings,
  EngineProfileName,
  EngineQualityPresetName,
  EngineRuntimeBudgetSettings,
  EngineRuntimeSettings,
  EngineDeviceCapabilityProfile,
} from '../../settings/index.ts'
import { resolveEngineGraphicsSettings } from '../../settings/index.ts'
import {
  createEngineRuntimePolicy,
  resolveCapabilityAwareEngineRuntimePolicy,
  type EngineRuntimePolicy,
} from '../policy/runtimePolicy.ts'
import { resolveEngineAutoQualityScalerDecision, type EngineAutoQualityScalerState } from '../policy/autoQualityScaler.ts'
import { resolveEnginePressureSample } from '../budget/pressureMonitor.ts'
import { resolveEngineRenderStrategy, type EngineInteractionMutationKind, type EngineRenderStrategyPhase } from './strategy/strategy.ts'
import { resolveEngineFrameBudget, type EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts'
import { resolveHigherPressureTier, resolvePolicyPressureSignals } from './createEnginePolicyHelpers.ts'
import { DEFAULT_ENGINE_PHASE_STABILITY_CONFIG, resolveEngineStablePhase, type EnginePhaseStabilityState } from '../strategy/phaseStabilityGuard.ts'
import { resolveEngineStrategyConvergence } from '../strategy/strategyConvergence.ts'
import { resolveEngineHybridAutoPolicy, type EngineHybridAutoPolicyState } from '../strategy/hybridAutoPolicy.ts'
import { resolveEngineStrategyInputV2 } from '../strategy/strategyInputV2.ts'
import { resolveEngineDegradationDecision } from '../strategy/degradationLadder.ts'
import { resolveEngineQosControllerDecision } from '../strategy/qosController.ts'
import { resolveEngineProfilePolicyPack } from '../strategy/profilePolicyPack.ts'
import { applyEngineQosHardGuard } from '../strategy/qosHardGuard.ts'
import { applyEngineQosBudgetToRendererContext } from '../strategy/qosRendererWiring.ts'
import { resolveEngineQosDiagnosticsPanel } from '../strategy/qosDiagnosticsPanel.ts'
import { resolveEngineShortlistFramePlanning } from './createEngineShortlistFramePlanner.ts'
import { resolveLayeredRenderBridgeOutput } from '../bridge/index.ts'

/**
 * Resolves one render frame payload and updated runtime strategy state.
 * @param options Runtime frame dependencies and mutable snapshot state.
 */
export function resolveCreateEngineFrame(options: {
  scene: EngineSceneSnapshot
  viewport: EngineCanvasViewportState
  renderContext: EngineRendererContext
  camera3DSnapshot: EngineCamera3DSnapshot | null
  renderer: EngineRenderer
  nowMs: number
  cameraAnimationState: {
    active: boolean
    cachePreviewOnly: boolean
  }
  settleSharpnessState: {
    pending: boolean
    forceSharpFrame: boolean
    deadlineAtMs: number
    deadlineMissRecorded: boolean
    missCount: number
    lastMissLatencyMs: number
  }
  interactionPredictorUpdate: (args: {
    nowMs: number
    viewport: EngineCanvasViewportState
    interactionActive: boolean
  }) => EngineInteractionPredictorState
  resolvedRuntimePolicy: EngineRuntimePolicy
  resolvedSettingsProfile: EngineProfileName
  resolvedPreset: EngineQualityPresetName
  resolvedPerformanceSettings: EnginePerformanceSettings
  resolvedRuntimeSettings: EngineRuntimeSettings
  resolvedRuntimeBudgetSettings: EngineRuntimeBudgetSettings
  resolvedCapabilityProfile: EngineDeviceCapabilityProfile
  policyScaleState: EngineAutoQualityScalerState
  phaseStabilityState: EnginePhaseStabilityState
  hybridPolicyState: EngineHybridAutoPolicyState
  latestRenderStats: EngineRenderStats | null
  latestBudgetPressure: EngineFrameBudgetPressure
  latestInteractionPredictor: EngineInteractionPredictorState
  latestQosBudget: EngineFrameBudget
  latestQosGuardTriggers: readonly string[]
  latestQosTrace: string
  latestQosProfile: EngineProfileName
  latestQosPressure: EngineFrameBudgetPressure
  latestQosFallbackReason: string | null
  lastInteractionAtMs: number
  lastInteractionKind: EngineInteractionMutationKind
  latestStrategyPhase: EngineRenderStrategyPhase
  latestStrategyInteractionActive: boolean
  latestQosStablePhase: EngineRenderStrategyPhase
  latestQosDegradationLevel: ReturnType<typeof resolveEngineDegradationDecision>['level']
  latestPressureScore: number
  latestAutoQualityDecisionReason: string
  latestQosPanel: ReturnType<typeof resolveEngineQosDiagnosticsPanel>
  interactionSettleDelayMs: number
  interactionHoldMs: number
  shortlistEnabled: boolean
  shortlistThresholds: {
    ratioThreshold: number
    hysteresisRatio: number
    minSceneNodes: number
    stableFrameCount: number
  }
  shortlistState: {
    latestFramePlan: ReturnType<typeof resolveEngineShortlistFramePlanning>['latestFramePlan']
    latestFramePlanSignature: string
    shortlistActive: boolean
    shortlistCandidateRatio: number
    shortlistAppliedCandidateCount: number
    shortlistPendingState: boolean | null
    shortlistPendingFrameCount: number
    shortlistToggleCount: number
    shortlistDebounceBlockedToggleCount: number
    shortlistEnterRatioThreshold: number
    shortlistLeaveRatioThreshold: number
  }
  framePlanPadding: number
  queryCandidates: (bounds: {x: number; y: number; width: number; height: number}) => string[]
  resolveVisibleSet: (bounds: {x: number; y: number; width: number; height: number}) => EngineVisibleSet
  layeredBridgeEnabled: boolean
}) {
  const pressureSample = resolveEnginePressureSample(
    resolvePolicyPressureSignals(options.scene.nodes.length, options.latestRenderStats),
    options.latestBudgetPressure,
  )

  let resolvedRuntimePolicy = options.resolvedRuntimePolicy
  const policyScaleState: EngineAutoQualityScalerState = {
    ...options.policyScaleState,
  }
  const latestPressureScore = pressureSample.score
  const autoQualityDecision = resolveEngineAutoQualityScalerDecision(
    pressureSample.tier,
    options.nowMs,
    policyScaleState,
  )
  const latestAutoQualityDecisionReason = autoQualityDecision.reason
  if (autoQualityDecision.changed) {
    policyScaleState.renderScale = autoQualityDecision.nextRenderScale
    policyScaleState.lastAdjustedAtMs = options.nowMs
    const nextGraphicsSettings = resolveEngineGraphicsSettings({
      ...resolvedRuntimePolicy.graphics,
      renderScale: autoQualityDecision.nextRenderScale,
    })
    resolvedRuntimePolicy = resolveCapabilityAwareEngineRuntimePolicy(
      createEngineRuntimePolicy(
        options.resolvedSettingsProfile,
        options.resolvedPreset,
        nextGraphicsSettings,
        options.resolvedPerformanceSettings,
        options.resolvedRuntimeSettings,
        options.resolvedRuntimeBudgetSettings,
        options.resolvedCapabilityProfile,
      ),
    )
  }

  // Resolve one strategy decision per frame so quality and preview policy
  // stay synchronized across planner and renderer execution.
  const strategyDecision = resolveEngineRenderStrategy({
    nowMs: options.nowMs,
    lodEnabled: options.renderContext.lodEnabled ?? false,
    cameraAnimationActive: options.cameraAnimationState.active,
    cameraCachePreviewOnly: options.cameraAnimationState.cachePreviewOnly,
    lastInteractionAtMs: options.lastInteractionAtMs,
    lastInteractionKind: options.lastInteractionKind,
    settleDelayMs: options.interactionSettleDelayMs,
    interactionHoldMs: options.interactionHoldMs,
    forceSharpFrame: options.settleSharpnessState.forceSharpFrame,
  })
  options.renderContext.quality = strategyDecision.quality
  options.renderContext.interactionActive = strategyDecision.interactionActive
  options.renderer.setInteractionPreview?.(strategyDecision.interactionPreview)
  const latestStrategyPhase = strategyDecision.phase
  const latestStrategyInteractionActive = strategyDecision.interactionActive
  options.renderContext.camera3DSnapshot = options.camera3DSnapshot

  const phaseStabilityState = resolveEngineStablePhase(
    options.phaseStabilityState,
    strategyDecision.phase,
    DEFAULT_ENGINE_PHASE_STABILITY_CONFIG,
  )
  const latestQosStablePhase = phaseStabilityState.phase

  // Refresh interaction predictor each frame so renderer lanes can adapt
  // prefetch ring and overscan using one shared motion snapshot.
  const latestInteractionPredictor = options.interactionPredictorUpdate({
    nowMs: options.nowMs,
    viewport: options.viewport,
    interactionActive: strategyDecision.interactionActive,
  })
  options.renderContext.interactionPredictor = latestInteractionPredictor

  // Resolve one frame budget snapshot so renderer lanes share the same
  // draw/upload/preload throttling contract for this frame.
  const frameBudgetDecision = resolveEngineFrameBudget({
    phase: strategyDecision.phase,
    interactionActive: strategyDecision.interactionActive,
    sceneNodeCount: options.scene.nodes.length,
    tileQueuePendingCount: options.latestRenderStats?.tileSchedulerPendingCount ?? 0,
    dirtyRegionCount: options.renderContext.dirtyRegions?.length ?? 0,
    settleSharpnessPending: options.settleSharpnessState.pending,
    forceSharpFrame: options.settleSharpnessState.forceSharpFrame,
    predictorConfidence: latestInteractionPredictor.confidence,
    predictorSpeedPxPerSec: latestInteractionPredictor.speedPxPerSec,
  })
  options.renderContext.frameBudget = {
    ...frameBudgetDecision.budget,
    drawSubmitBudgetMs: Math.min(
      frameBudgetDecision.budget.drawSubmitBudgetMs,
      resolvedRuntimePolicy.budget.drawBudgetMs,
    ),
    textureUploadBudgetBytes: Math.min(
      frameBudgetDecision.budget.textureUploadBudgetBytes,
      resolvedRuntimePolicy.budget.uploadBudgetBytes,
    ),
    textureUploadTotalBudgetBytes: Math.min(
      frameBudgetDecision.budget.textureUploadTotalBudgetBytes,
      resolvedRuntimePolicy.budget.uploadBudgetBytes,
    ),
    tilePreloadMaxUploads: Math.min(
      frameBudgetDecision.budget.tilePreloadMaxUploads,
      resolvedRuntimePolicy.budget.tileBudgetCount,
    ),
  }
  const effectiveBudgetPressure = resolveHigherPressureTier(
    frameBudgetDecision.pressure,
    pressureSample.tier,
  )
  options.renderContext.frameBudgetPressure = effectiveBudgetPressure
  const latestBudgetPressure = effectiveBudgetPressure

  const convergedStrategyPhase = resolveEngineStrategyConvergence(latestQosStablePhase)
  let effectiveQosProfile: EngineProfileName = options.resolvedSettingsProfile
  let hybridPolicyState: EngineHybridAutoPolicyState = {
    ...options.hybridPolicyState,
  }
  if (options.resolvedSettingsProfile === 'hybrid') {
    // Hybrid mode derives one concrete profile tendency to avoid frame-to-frame
    // budget jitter between editor/game/animation semantics.
    const hybridDecision = resolveEngineHybridAutoPolicy(
      hybridPolicyState,
      convergedStrategyPhase.phase,
      options.nowMs,
    )
    hybridPolicyState = hybridDecision.state
    effectiveQosProfile = hybridDecision.effectiveProfile
  }

  const strategyInputV2 = resolveEngineStrategyInputV2({
    profile: effectiveQosProfile,
    phase: convergedStrategyPhase.phase,
    pressure: effectiveBudgetPressure,
    cameraAnimationActive: options.cameraAnimationState.active,
    predictorConfidence: latestInteractionPredictor.confidence,
    interactionElapsedMs: Math.max(0, options.nowMs - options.lastInteractionAtMs),
  })
  const degradationDecision = resolveEngineDegradationDecision(strategyInputV2)
  const latestQosDegradationLevel = degradationDecision.level
  const qosDecision = resolveEngineQosControllerDecision({
    profile: strategyInputV2.profile,
    phase: strategyInputV2.phase,
    pressure: strategyInputV2.pressure,
    capabilityTier: options.resolvedCapabilityProfile.gpuTier,
    degradation: degradationDecision,
  })
  const profilePolicyPack = resolveEngineProfilePolicyPack(
    strategyInputV2.profile,
    strategyInputV2.phase,
    strategyInputV2.pressure,
    qosDecision.budget,
  )
  const qosHardGuardResult = applyEngineQosHardGuard(
    {
      profile: strategyInputV2.profile,
      phase: strategyInputV2.phase,
      pressure: strategyInputV2.pressure,
      capabilityTier: options.resolvedCapabilityProfile.gpuTier,
      degradation: degradationDecision,
    },
    {
      ...qosDecision,
      budget: profilePolicyPack.budget,
    },
  )
  const latestQosTrace = qosHardGuardResult.decision.trace
  const latestQosGuardTriggers = [
    ...profilePolicyPack.guardTriggers,
    ...qosHardGuardResult.triggers,
  ]
  options.renderContext.frameBudget = applyEngineQosBudgetToRendererContext(
    options.renderContext.frameBudget,
    qosHardGuardResult.decision,
  )
  const latestQosProfile = strategyInputV2.profile
  const latestQosPressure = strategyInputV2.pressure
  const latestQosBudget: EngineFrameBudget = {
    ...(options.renderContext.frameBudget as EngineFrameBudget),
  }
  const latestQosFallbackReason = options.latestRenderStats?.cacheFallbackReason ?? null
  const latestQosPanel = resolveEngineQosDiagnosticsPanel({
    profile: latestQosProfile,
    phase: latestQosStablePhase,
    pressure: latestQosPressure,
    budget: latestQosBudget,
    degradationLevel: latestQosDegradationLevel,
    fallbackReason: latestQosFallbackReason,
    guardTriggers: latestQosGuardTriggers,
    trace: latestQosTrace,
  })

  if (options.settleSharpnessState.pending && options.nowMs > options.settleSharpnessState.deadlineAtMs) {
    // Record one contract miss and force one immediate sharp recovery frame.
    if (!options.settleSharpnessState.deadlineMissRecorded) {
      options.settleSharpnessState.deadlineMissRecorded = true
      options.settleSharpnessState.missCount += 1
      options.settleSharpnessState.lastMissLatencyMs = Math.max(0, options.nowMs - options.lastInteractionAtMs)
    }

    options.settleSharpnessState.forceSharpFrame = true
  }

  const shortlistPlanning = resolveEngineShortlistFramePlanning({
    enabled: options.shortlistEnabled,
    scene: options.scene,
    viewport: options.viewport,
    framePlanPadding: options.framePlanPadding,
    thresholds: options.shortlistThresholds,
    state: options.shortlistState,
    protectedNodeIds: options.renderContext.protectedNodeIds,
    queryCandidates: options.queryCandidates,
    resolveVisibleSet: options.resolveVisibleSet,
  })

  if (options.layeredBridgeEnabled) {
    options.renderContext.layeredRender = resolveLayeredRenderBridgeOutput({
      scene: options.scene,
      viewport: options.viewport,
      context: options.renderContext,
    })
  } else {
    options.renderContext.layeredRender = undefined
  }

  const frame: EngineRenderFrame = {
    scene: options.scene,
    viewport: options.viewport,
    context: options.renderContext,
  }

  return {
    frame,
    resolvedRuntimePolicy,
    policyScaleState,
    phaseStabilityState,
    hybridPolicyState,
    latestPressureScore,
    latestAutoQualityDecisionReason,
    latestStrategyPhase,
    latestStrategyInteractionActive,
    latestQosStablePhase,
    latestInteractionPredictor,
    latestBudgetPressure,
    latestQosDegradationLevel,
    latestQosTrace,
    latestQosGuardTriggers,
    latestQosProfile,
    latestQosPressure,
    latestQosBudget,
    latestQosFallbackReason,
    latestQosPanel,
    shortlistPlanning,
  }
}
