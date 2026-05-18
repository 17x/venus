import type {
  EngineFrameBudget,
  EngineInteractionPredictorState,
  EngineRenderQuality,
  EngineRenderStats,
} from '../../renderer/types/index.ts'
import type {
  EngineVisibility3DPolicyDecision,
} from '../../visibility/index.ts'
import type { EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts'
import type {
  EngineRenderStrategyPhase,
} from './strategy/strategy.ts'
import type {
  EngineQosDiagnosticsPanel,
} from '../strategy/qosDiagnosticsPanel.ts'
import {
  resolveEnginePerformanceGateStatus,
} from './performanceGate.ts'
import {
  resolveEngineRuntimeDiagnosticsSnapshot,
} from './diagnosticsSnapshot.ts'
import type { EngineRuntimeDiagnostics } from './createEngineContracts.ts'

/**
 * Builds one runtime diagnostics snapshot from live engine state.
 * @param options Runtime state required to compose diagnostics.
 * @returns Fully materialized runtime diagnostics snapshot.
 */
export function buildEngineRuntimeDiagnosticsSnapshot(options: {
  backend: EngineRuntimeDiagnostics['backend']
  latestRenderStats: EngineRenderStats | null
  pixelRatio: number
  outputPixelRatio: number
  sceneDiagnostics: EngineRuntimeDiagnostics['scene']
  latestFramePlan: EngineRuntimeDiagnostics['framePlan']
  latestHitPlan: EngineRuntimeDiagnostics['hitPlan']
  hit3dPolicy: EngineRuntimeDiagnostics['hit3dPolicy']
  shortlistState: {
    active: boolean
    candidateRatio: number
    appliedCandidateCount: number
    pendingState: EngineRuntimeDiagnostics['shortlist']['pendingState']
    pendingFrameCount: number
    toggleCount: number
    debounceBlockedToggleCount: number
    minSceneNodes: number
    ratioThreshold: number
    hysteresisRatio: number
    enterRatioThreshold: number
    leaveRatioThreshold: number
    stableFrameCount: number
  }
  viewport: {
    scale: number
    offsetX: number
    offsetY: number
    viewportWidth: number
    viewportHeight: number
  }
  cameraAnimationState: {
    active: boolean
    cachePreviewOnly: boolean
    previewHitCount: number
    previewMissCount: number
  }
  latestStrategyPhase: EngineRenderStrategyPhase
  latestStrategyInteractionActive: boolean
  renderQuality: EngineRenderQuality
  lastInteractionKind: EngineRuntimeDiagnostics['strategy']['lastInteractionKind']
  nowMs: number
  lastInteractionAtMs: number
  predictorState: EngineInteractionPredictorState
  latestBudgetPressure: EngineFrameBudgetPressure
  frameBudget: EngineFrameBudget | undefined
  visibility3dPolicyDecision: EngineVisibility3DPolicyDecision
  settleSharpnessState: {
    pending: boolean
    deadlineAtMs: number
    forceSharpFrame: boolean
    metCount: number
    missCount: number
    lastLatencyMs: number
    lastMissLatencyMs: number
    highZoomTextSlaCheckedCount: number
    highZoomTextSlaViolationCount: number
  }
  runtimePolicy: {
    profile: EngineRuntimeDiagnostics['policy']['profile']
    preset: EngineRuntimeDiagnostics['policy']['preset']
    graphics: { renderScale: number }
  }
  latestPressureScore: number
  latestAutoQualityDecisionReason: string
  latestQosPanel: EngineQosDiagnosticsPanel
}): EngineRuntimeDiagnostics {
  return resolveEngineRuntimeDiagnosticsSnapshot({
    backend: options.backend,
    renderStats: options.latestRenderStats,
    pixelRatio: options.pixelRatio,
    outputPixelRatio: options.outputPixelRatio,
    scene: options.sceneDiagnostics,
    framePlan: options.latestFramePlan,
    hitPlan: options.latestHitPlan,
    hit3dPolicy: options.hit3dPolicy,
    shortlist: {
      active: options.shortlistState.active,
      candidateRatio: options.shortlistState.candidateRatio,
      appliedCandidateCount: options.shortlistState.appliedCandidateCount,
      pendingState: options.shortlistState.pendingState,
      pendingFrameCount: options.shortlistState.pendingFrameCount,
      toggleCount: options.shortlistState.toggleCount,
      debounceBlockedToggleCount: options.shortlistState.debounceBlockedToggleCount,
      minSceneNodes: options.shortlistState.minSceneNodes,
      ratioThreshold: options.shortlistState.ratioThreshold,
      hysteresisRatio: options.shortlistState.hysteresisRatio,
      enterRatioThreshold: options.shortlistState.enterRatioThreshold,
      leaveRatioThreshold: options.shortlistState.leaveRatioThreshold,
      stableFrameCount: options.shortlistState.stableFrameCount,
    },
    viewport: {
      scale: options.viewport.scale,
      offsetX: options.viewport.offsetX,
      offsetY: options.viewport.offsetY,
      viewportWidth: options.viewport.viewportWidth,
      viewportHeight: options.viewport.viewportHeight,
    },
    cameraAnimation: {
      active: options.cameraAnimationState.active,
      cachePreviewOnly: options.cameraAnimationState.cachePreviewOnly,
      previewHitCount: options.cameraAnimationState.previewHitCount,
      previewMissCount: options.cameraAnimationState.previewMissCount,
    },
    strategy: {
      phase: options.latestStrategyPhase,
      interactionActive: options.latestStrategyInteractionActive,
      quality: options.renderQuality,
      lastInteractionKind: options.lastInteractionKind,
      lastInteractionElapsedMs: Math.max(0, options.nowMs - options.lastInteractionAtMs),
    },
    predictor: {
      directionX: options.predictorState.directionX,
      directionY: options.predictorState.directionY,
      speedPxPerSec: options.predictorState.speedPxPerSec,
      confidence: options.predictorState.confidence,
    },
    budget: {
      pressure: options.latestBudgetPressure,
      drawSubmitBudgetMs: options.frameBudget?.drawSubmitBudgetMs ?? 0,
      textureUploadBudgetBytes: options.frameBudget?.textureUploadBudgetBytes ?? 0,
      textureUploadTotalBudgetBytes: options.frameBudget?.textureUploadTotalBudgetBytes ?? 0,
      imageTextureUploadMaxCount: options.frameBudget?.imageTextureUploadMaxCount ?? 0,
      textTextureUploadMaxCount: options.frameBudget?.textTextureUploadMaxCount ?? 0,
      tilePreloadBudgetMs: options.frameBudget?.tilePreloadBudgetMs ?? 0,
      tilePreloadMaxUploads: options.frameBudget?.tilePreloadMaxUploads ?? 0,
      overlayPassBudgetMs: options.frameBudget?.overlayPassBudgetMs ?? 0,
    },
    strategySnapshot: {
      lane: options.latestStrategyPhase,
      budgetPressure: options.latestBudgetPressure,
      fallbackReason: options.latestRenderStats?.cacheFallbackReason ?? null,
      predictorConfidence: options.predictorState.confidence,
      previewExecutionMode: options.latestRenderStats?.webglPreviewExecutionMode ?? 'unknown',
    },
    visibility3dPolicy: options.visibility3dPolicyDecision,
    settleSharpness: {
      pending: options.settleSharpnessState.pending,
      remainingDeadlineMs: options.settleSharpnessState.pending
        ? Math.max(0, options.settleSharpnessState.deadlineAtMs - options.nowMs)
        : 0,
      forceSharpFrame: options.settleSharpnessState.forceSharpFrame,
      metCount: options.settleSharpnessState.metCount,
      missCount: options.settleSharpnessState.missCount,
      lastLatencyMs: options.settleSharpnessState.lastLatencyMs,
      lastMissLatencyMs: options.settleSharpnessState.lastMissLatencyMs,
      highZoomTextSlaCheckedCount: options.settleSharpnessState.highZoomTextSlaCheckedCount,
      highZoomTextSlaViolationCount: options.settleSharpnessState.highZoomTextSlaViolationCount,
    },
    policy: {
      profile: options.runtimePolicy.profile,
      preset: options.runtimePolicy.preset,
      renderScale: options.runtimePolicy.graphics.renderScale,
      pressureScore: options.latestPressureScore,
      scalerDecisionReason: options.latestAutoQualityDecisionReason,
    },
    qos: {
      profile: options.latestQosPanel.profile,
      stablePhase: options.latestQosPanel.phase,
      pressure: options.latestQosPanel.pressure,
      budget: {
        ...options.latestQosPanel.budget,
      },
      degradationLevel: options.latestQosPanel.degradationLevel,
      fallbackReason: options.latestQosPanel.fallbackReason,
      trace: options.latestQosPanel.trace,
      guardTriggers: [...options.latestQosPanel.guardTriggers],
    },
    performanceGate: resolveEnginePerformanceGateStatus(options.latestRenderStats),
  })
}