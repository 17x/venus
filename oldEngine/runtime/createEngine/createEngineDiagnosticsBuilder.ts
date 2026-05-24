import type {
  EngineFrameBudget,
  EngineInteractionPredictorState,
  EngineRenderQuality,
  EngineRenderStats,
} from '../../renderer/types/index.ts'
import type {
  EngineVisibility3DPolicyDecision,
} from '../../visibility/index.ts'
import type { EngineCamera3DSnapshot } from '../../camera/camera3dControllers/camera3dControllers.ts'
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
import {
  resolveCreateEngineVisibilityLodDiagnostics,
} from './createEngineVisibilityLodDiagnostics.ts'
import {
  resolveCreateEngineResourceDiagnostics,
} from './createEngineResourceDiagnostics.ts'
import {
  resolveCreateEnginePerformanceProfileDiagnostics,
} from './createEnginePerformanceProfileDiagnostics.ts'
import {
  resolveCreateEngineVisibilityOcclusionDiagnostics,
} from './createEngineVisibilityOcclusionDiagnostics.ts'
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
  camera3DSnapshot: EngineCamera3DSnapshot | null
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
    webgpu: {
      renderPath: options.latestRenderStats?.webgpuRenderPath ?? 'unknown',
      nativeSubmission: {
        attemptedCount: options.latestRenderStats?.webgpuNativeSubmissionAttemptedCount ?? 0,
        successCount: options.latestRenderStats?.webgpuNativeSubmissionSuccessCount ?? 0,
        failureCount: options.latestRenderStats?.webgpuNativeSubmissionFailureCount ?? 0,
        totalSuccessCount: options.latestRenderStats?.webgpuNativeSubmissionTotalCount ?? 0,
        totalFailureCount: options.latestRenderStats?.webgpuNativeSubmissionTotalFailureCount ?? 0,
      },
      rectBatch: {
        eligibleCount: options.latestRenderStats?.webgpuNativeRectBatchEligibleCount ?? 0,
        rejectedReason: options.latestRenderStats?.webgpuNativeRectBatchRejectedReason ?? 'unknown',
      },
      pass3d: {
        candidateCount: options.latestRenderStats?.webgpu3DPassCandidateCount ?? 0,
        batchCount: options.latestRenderStats?.webgpu3DPassBatchCount ?? 0,
        unsupportedCount: options.latestRenderStats?.webgpu3DPassUnsupportedCount ?? 0,
        nativeCoverageRatio: options.latestRenderStats?.webgpu3DPassNativeCoverageRatio ?? 0,
        instancedBatchCount: options.latestRenderStats?.webgpu3DPassInstancedBatchCount ?? 0,
        litBatchCount: options.latestRenderStats?.webgpu3DPassLitBatchCount ?? 0,
        unlitBatchCount: options.latestRenderStats?.webgpu3DPassUnlitBatchCount ?? 0,
      },
      binding3d: {
        materialUniformBytes: options.latestRenderStats?.webgpu3DBindingMaterialUniformBytes ?? 0,
        lightUniformBytes: options.latestRenderStats?.webgpu3DBindingLightUniformBytes ?? 0,
        instanceUniformBytes: options.latestRenderStats?.webgpu3DBindingInstanceUniformBytes ?? 0,
        totalUniformBytes: options.latestRenderStats?.webgpu3DBindingTotalUniformBytes ?? 0,
      },
      gpuTiming: {
        supported: options.latestRenderStats?.webgpuGpuTimingSupported ?? false,
        sampleState: options.latestRenderStats?.webgpuGpuTimingSampleState ?? 'unsupported',
        queryPlanState: options.latestRenderStats?.webgpuGpuTimingQueryPlanState ?? 'unsupported',
        queryWriteCount: options.latestRenderStats?.webgpuGpuTimingQueryWriteCount ?? 0,
        lastWriteCount: options.latestRenderStats?.webgpuGpuTimingLastWriteCount ?? 0,
        lastResolveCount: options.latestRenderStats?.webgpuGpuTimingLastResolveCount ?? 0,
        lastCopyCount: options.latestRenderStats?.webgpuGpuTimingLastCopyCount ?? 0,
        readbackBufferBytes: options.latestRenderStats?.webgpuGpuTimingReadbackBufferBytes ?? 0,
        frameMs: options.latestRenderStats?.webgpuGpuFrameMs ?? null,
      },
      camera3d: {
        active: options.latestRenderStats?.webgpuCamera3DActive ?? false,
        controller: options.latestRenderStats?.webgpuCamera3DController ?? 'none',
        projectionKind: options.latestRenderStats?.webgpuCamera3DProjectionKind ?? 'none',
        uniformBytes: options.latestRenderStats?.webgpuCamera3DUniformBytes ?? 0,
        uniformFloatCount: options.latestRenderStats?.webgpuCamera3DUniformFloatCount ?? 0,
      },
    },
    pixelRatio: options.pixelRatio,
    outputPixelRatio: options.outputPixelRatio,
    resource: resolveCreateEngineResourceDiagnostics(options.latestRenderStats, options.frameBudget),
    performanceProfile: resolveCreateEnginePerformanceProfileDiagnostics(
      options.latestRenderStats,
      options.latestFramePlan,
      options.frameBudget,
    ),
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
    camera3d: resolveCamera3DDiagnostics(options.camera3DSnapshot),
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
    visibilityLod: resolveCreateEngineVisibilityLodDiagnostics(
      options.latestFramePlan,
      options.latestBudgetPressure,
    ),
    visibilityOcclusion: resolveCreateEngineVisibilityOcclusionDiagnostics(options.latestFramePlan),
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

/**
 * Intent: resolve compact diagnostics for the active staged 3D camera snapshot.
 * @param snapshot Active runtime 3D camera snapshot.
 * @returns 3D camera diagnostics payload.
 */
function resolveCamera3DDiagnostics(
  snapshot: EngineCamera3DSnapshot | null,
): EngineRuntimeDiagnostics['camera3d'] {
  if (!snapshot) {
    return {
      active: false,
      controller: 'none',
      projectionKind: 'none',
      position: null,
      target: null,
    }
  }

  return {
    active: true,
    controller: snapshot.controller,
    projectionKind: snapshot.projection.kind,
    position: snapshot.pose.position,
    target: snapshot.pose.target,
  }
}
