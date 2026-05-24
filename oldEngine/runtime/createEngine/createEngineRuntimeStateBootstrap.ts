import type { EngineRenderFallbackReason } from '../../renderer/fallbackTaxonomy/index.ts'
import type {
  EngineFrameBudget,
  EngineInteractionPredictorState,
  EngineRenderStats,
} from '../../renderer/types/index.ts'
import type { EngineFramePlan } from '../../scene/framePlan.ts'
import type { EngineHitPlan } from '../../scene/hitPlan.ts'
import type { EngineProfileName } from '../../settings/index.ts'
import type { EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts'
import type { EngineRenderStrategyPhase, EngineInteractionMutationKind } from './strategy/strategy.ts'
import type { EngineRuntimePolicy } from '../policy/runtimePolicy.ts'
import type { EngineAutoQualityScalerState } from '../policy/autoQualityScaler.ts'
import type { EnginePhaseStabilityState } from '../strategy/phaseStabilityGuard.ts'
import type { EngineHybridAutoPolicyState } from '../strategy/hybridAutoPolicy.ts'
import type { EngineDegradationLevel } from '../strategy/degradationLadder.ts'
import { resolveEngineQosDiagnosticsPanel, type EngineQosDiagnosticsPanel } from '../strategy/qosDiagnosticsPanel.ts'

/**
 * Captures mutable runtime state initialized before the render loop starts.
 */
export interface CreateEngineRuntimeStateBootstrap {
  /** Latest render stats snapshot. */
  latestRenderStats: EngineRenderStats | null
  /** Latest frame plan snapshot. */
  latestFramePlan: EngineFramePlan | null
  /** Signature used for frame plan cache validity checks. */
  latestFramePlanSignature: string
  /** Current shortlist activation state. */
  shortlistActive: boolean
  /** Current shortlist candidate ratio. */
  shortlistCandidateRatio: number
  /** Applied shortlist candidate count for current frame. */
  shortlistAppliedCandidateCount: number
  /** Pending shortlist target state during debounce. */
  shortlistPendingState: boolean | null
  /** Pending shortlist frame count during debounce. */
  shortlistPendingFrameCount: number
  /** Total shortlist toggle count for diagnostics. */
  shortlistToggleCount: number
  /** Toggle attempts blocked by debounce. */
  shortlistDebounceBlockedToggleCount: number
  /** Enter threshold with hysteresis applied. */
  shortlistEnterRatioThreshold: number
  /** Leave threshold with hysteresis applied. */
  shortlistLeaveRatioThreshold: number
  /** Latest hit plan snapshot. */
  latestHitPlan: EngineHitPlan | null
  /** Latest strategy phase. */
  latestStrategyPhase: EngineRenderStrategyPhase
  /** Latest strategy interaction-active flag. */
  latestStrategyInteractionActive: boolean
  /** Latest interaction predictor snapshot. */
  latestInteractionPredictor: EngineInteractionPredictorState
  /** Latest budget pressure tier. */
  latestBudgetPressure: EngineFrameBudgetPressure
  /** Latest pressure score sample. */
  latestPressureScore: number
  /** Latest auto-quality decision reason. */
  latestAutoQualityDecisionReason: string
  /** Latest QoS trace string. */
  latestQosTrace: string
  /** Latest QoS degradation level. */
  latestQosDegradationLevel: EngineDegradationLevel
  /** Latest QoS hard-guard triggers. */
  latestQosGuardTriggers: string[]
  /** Latest QoS profile. */
  latestQosProfile: EngineProfileName
  /** Latest QoS pressure tier. */
  latestQosPressure: EngineFrameBudgetPressure
  /** Latest QoS budget payload. */
  latestQosBudget: EngineFrameBudget
  /** Latest stable phase for QoS convergence. */
  latestQosStablePhase: EngineRenderStrategyPhase
  /** Latest fallback reason observed from renderer stats. */
  latestQosFallbackReason: EngineRenderFallbackReason | null
  /** Latest QoS diagnostics panel payload. */
  latestQosPanel: EngineQosDiagnosticsPanel
  /** Last interaction timestamp. */
  lastInteractionAtMs: number
  /** Last interaction kind. */
  lastInteractionKind: EngineInteractionMutationKind
  /** Settling sharpness contract state. */
  settleSharpnessState: {
    /** True while settling sharpness contract is pending. */
    pending: boolean
    /** Settling deadline timestamp in ms. */
    deadlineAtMs: number
    /** True after one deadline miss is recorded. */
    deadlineMissRecorded: boolean
    /** True to force one sharp frame recovery. */
    forceSharpFrame: boolean
    /** Number of met events. */
    metCount: number
    /** Number of miss events. */
    missCount: number
    /** Last observed settle latency in ms. */
    lastLatencyMs: number
    /** Last observed miss latency in ms. */
    lastMissLatencyMs: number
    /** Number of high-zoom text SLA checks. */
    highZoomTextSlaCheckedCount: number
    /** Number of high-zoom text SLA violations. */
    highZoomTextSlaViolationCount: number
  }
  /** Policy scale state for auto-quality scaler. */
  policyScaleState: EngineAutoQualityScalerState
  /** Phase stability state for strategy convergence. */
  phaseStabilityState: EnginePhaseStabilityState
  /** Hybrid auto-policy state for hybrid profile routing. */
  hybridPolicyState: EngineHybridAutoPolicyState
}

/**
 * Resolves mutable startup state consumed by createEngine runtime loop.
 * @param nowMs Current startup timestamp in milliseconds.
 * @param resolvedSettingsProfile Resolved settings profile.
 * @param resolvedRuntimePolicy Resolved startup runtime policy.
 * @param shortlistRatioThreshold Shortlist ratio threshold.
 * @param shortlistHysteresisRatio Shortlist hysteresis ratio.
 * @returns Runtime state bootstrap snapshot.
 */
export function resolveCreateEngineRuntimeStateBootstrap(
  nowMs: number,
  resolvedSettingsProfile: EngineProfileName,
  resolvedRuntimePolicy: EngineRuntimePolicy,
  shortlistRatioThreshold: number,
  shortlistHysteresisRatio: number,
): CreateEngineRuntimeStateBootstrap {
  const latestQosBudget: EngineFrameBudget = {
    drawSubmitBudgetMs: 0,
    textureUploadBudgetBytes: 0,
    textureUploadTotalBudgetBytes: 0,
    imageTextureUploadMaxCount: 0,
    textTextureUploadMaxCount: 0,
    tilePreloadBudgetMs: 0,
    tilePreloadMaxUploads: 0,
    overlayPassBudgetMs: 0,
  }

  const latestQosProfile: EngineProfileName = resolvedSettingsProfile
  const latestQosPressure: EngineFrameBudgetPressure = 'low'
  const latestQosStablePhase: EngineRenderStrategyPhase = 'static'
  const latestQosTrace = ''
  const latestQosFallbackReason: EngineRenderFallbackReason | null = null
  const latestQosGuardTriggers: string[] = []
  const latestQosDegradationLevel: EngineDegradationLevel = 'none'

  return {
    latestRenderStats: null,
    latestFramePlan: null,
    latestFramePlanSignature: '',
    shortlistActive: false,
    shortlistCandidateRatio: 1,
    shortlistAppliedCandidateCount: 0,
    shortlistPendingState: null,
    shortlistPendingFrameCount: 0,
    shortlistToggleCount: 0,
    shortlistDebounceBlockedToggleCount: 0,
    shortlistEnterRatioThreshold: shortlistRatioThreshold - shortlistHysteresisRatio,
    shortlistLeaveRatioThreshold: shortlistRatioThreshold + shortlistHysteresisRatio,
    latestHitPlan: null,
    latestStrategyPhase: 'static',
    latestStrategyInteractionActive: false,
    latestInteractionPredictor: {
      directionX: 0,
      directionY: 0,
      speedPxPerSec: 0,
      confidence: 0,
    },
    latestBudgetPressure: 'low',
    latestPressureScore: 0,
    latestAutoQualityDecisionReason: 'hold',
    latestQosTrace,
    latestQosDegradationLevel,
    latestQosGuardTriggers,
    latestQosProfile,
    latestQosPressure,
    latestQosBudget,
    latestQosStablePhase,
    latestQosFallbackReason,
    latestQosPanel: resolveEngineQosDiagnosticsPanel({
      profile: latestQosProfile,
      phase: latestQosStablePhase,
      pressure: latestQosPressure,
      budget: latestQosBudget,
      degradationLevel: latestQosDegradationLevel,
      fallbackReason: latestQosFallbackReason,
      guardTriggers: latestQosGuardTriggers,
      trace: latestQosTrace,
    }),
    lastInteractionAtMs: nowMs,
    lastInteractionKind: 'none',
    settleSharpnessState: {
      pending: false,
      deadlineAtMs: 0,
      deadlineMissRecorded: false,
      forceSharpFrame: false,
      metCount: 0,
      missCount: 0,
      lastLatencyMs: 0,
      lastMissLatencyMs: 0,
      highZoomTextSlaCheckedCount: 0,
      highZoomTextSlaViolationCount: 0,
    },
    policyScaleState: {
      renderScale: resolvedRuntimePolicy.graphics.renderScale,
      lastAdjustedAtMs: nowMs,
    },
    phaseStabilityState: {
      phase: latestQosStablePhase,
      pendingPhase: null,
      pendingFrames: 0,
    },
    hybridPolicyState: {
      profile: 'editor',
      lastSwitchAtMs: nowMs,
      pendingProfile: null,
      pendingFrameCount: 0,
    },
  }
}
