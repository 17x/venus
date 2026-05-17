import type { EngineOverlayDrawNode } from '../../interaction/overlayCanvas.ts'
import { createWebGLEngineRenderer } from '../../gpu/webgl/index.ts'
import { createWebGPUEngineRenderer } from '../../gpu/webgpu/index.ts'
import type { EngineRenderFallbackReason } from '../../renderer/fallbackTaxonomy/index.ts'
import type {
  EngineFrameBudget,
  EngineInteractionPredictorState,
  EngineRenderQuality,
  EngineRenderStats,
  EngineResourceLoader,
  EngineTextShaper,
} from '../../renderer/types/index.ts'
import {
  createEngineSceneStore,
} from '../../scene/store/store.ts'
import {
  type EngineFramePlan,
} from '../../scene/framePlan.ts'
import {
  type EngineHitPlan,
} from '../../scene/hitPlan.ts'
import {
  createEngineVisibilityResolver,
} from '../../visibility/index.ts'
import type {
  EngineNodeId,
  EngineRect,
} from '../../scene/types/types.ts'
import {
  createEngineHitResolver,
} from '../../scene/hit/resolver.ts'
import { createSystemEngineClock } from '../../time/index.ts'
import { createEngineLoop, type EngineLoopController } from '../createEngineLoop/createEngineLoop.ts'
import {
  resolveEnginePerformanceOptions,
  resolveEnginePixelRatio,
  resolveInitialViewport,
} from './config.ts'
import {
  type EngineInteractionMutationKind,
  type EngineRenderStrategyPhase,
} from './strategy/strategy.ts'
import { type EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts'
import { createEngineInteractionPredictor } from './interactionPredictor/interactionPredictor.ts'
import {
  createEngineAnimationController,
} from '../../animation/index.ts'
import {
  resolveLayeredRenderBridgeOutput,
} from '../bridge/index.ts'
import {
  resolveEngineDefaultPreset,
  resolveEngineDeviceCapabilityProfile,
  resolveEngineGraphicsSettings,
  resolveEnginePerformanceSettings,
  resolveEngineRuntimeSettings,
  type EngineProfileName,
} from '../../settings/index.ts'
import {
  createEngineRuntimePolicy,
  resolveCapabilityAwareEngineRuntimePolicy,
} from '../policy/runtimePolicy.ts'
import {
  type EngineAutoQualityScalerState,
} from '../policy/autoQualityScaler.ts'
import {
  resolveAdaptiveHitTestExactBudget,
} from './createEnginePolicyHelpers.ts'
import {
  createEngineSceneFacade,
} from './createEngineSceneFacade.ts'
import {
  createEngineViewportFacade,
} from './createEngineViewportFacade.ts'
import {
  createEngineInteractionLifecycle,
} from './createEngineInteractionLifecycle.ts'
import {
  createEngineResizeLifecycle,
} from './createEngineResizeLifecycle.ts'
import {
  createEngineRenderStatsHandler,
} from './createEngineStatsHandler.ts'
import {
  createEngineRuntimeFacade,
} from './createEngineRuntimeFacade.ts'
import {
  resolveCreateEngineDiagnosticsInput,
} from './createEngineDiagnosticsInput.ts'
import {
  resolveCreateEngineFrame,
} from './createEngineFrameResolver.ts'
import {
  type EnginePhaseStabilityState,
} from '../strategy/phaseStabilityGuard.ts'
import {
  type EngineHybridAutoPolicyState,
} from '../strategy/hybridAutoPolicy.ts'
import {
  type EngineDegradationLevel,
} from '../strategy/degradationLadder.ts'
import {
  resolveEngineQosDiagnosticsPanel,
  type EngineQosDiagnosticsPanel,
} from '../strategy/qosDiagnosticsPanel.ts'
import type {
  CreateEngineOptions,
  Engine,
} from './createEngineContracts.ts'

export type {
  CreateEngineOptions,
  Engine,
  EngineOverscanOptions,
  EnginePerformanceOptionsObject,
  ResolvedEnginePerformanceOptions,
  EngineRuntimeDiagnostics,
  EngineViewportOptions,
  EngineCameraAnimationOptions,
  EngineResizeOptions,
} from './createEngineContracts.ts'

/**
 * High-level engine facade with:
 * - one default WebGL renderer entry
 * - batch-first scene mutation APIs
 * - optional render/resource/debug tuning grouped by concern
  * @param options Options object for this operation.
*/
export function createEngine(options: CreateEngineOptions): Engine {
  // Resolve all performance knobs through one model so each capability can be
  // toggled independently while preserving legacy option compatibility.
  const resolvedPerformance = resolveEnginePerformanceOptions(options)
  const resolvedLodEnabled = resolvedPerformance.lodConfig?.enabled ?? false
  const FRAME_PLAN_SHORTLIST_DEFAULT_MIN_SCENE_NODES = 1500
  const FRAME_PLAN_SHORTLIST_DEFAULT_RATIO_THRESHOLD = 0.72
  const FRAME_PLAN_SHORTLIST_MAX_HYSTERESIS_RATIO = 0.3
  const FRAME_PLAN_SHORTLIST_DEFAULT_HYSTERESIS_RATIO = 0.06
  const FRAME_PLAN_SHORTLIST_DEFAULT_STABLE_FRAME_COUNT = 2
  const DEFAULT_MAX_PIXEL_RATIO = 2
  const DEFAULT_CAMERA_ANIMATION_DURATION_MS = 110
  const DEFAULT_POLICY_PROFILE: EngineProfileName = 'editor'

  const resolvedSettingsProfile = options.settings?.profile ?? DEFAULT_POLICY_PROFILE
  const resolvedCapabilityProfile = resolveEngineDeviceCapabilityProfile(options.settings?.capability)
  const resolvedGraphicsSettings = resolveEngineGraphicsSettings(options.settings?.graphics)
  const resolvedPerformanceSettings = resolveEnginePerformanceSettings(options.settings?.performance)
  const resolvedRuntimeSettings = resolveEngineRuntimeSettings(options.settings?.runtime)
  const resolvedRuntimeBudgetSettings = {
    drawBudgetMs: Math.max(1, resolvedPerformanceSettings.frameTimeBudgetMs * 0.4),
    uploadBudgetBytes: resolvedPerformanceSettings.uploadBudgetBytes,
    cacheBudgetBytes: 200_000_000,
    tileBudgetCount: 64,
    workerBudgetCount: resolvedPerformanceSettings.workerBudgetCount,
    frameBudgetMs: resolvedPerformanceSettings.frameTimeBudgetMs,
  }
  const resolvedPreset = options.settings?.preset
    ?? resolveEngineDefaultPreset(resolvedSettingsProfile, resolvedCapabilityProfile)
  let resolvedRuntimePolicy = resolveCapabilityAwareEngineRuntimePolicy(
    createEngineRuntimePolicy(
      resolvedSettingsProfile,
      resolvedPreset,
      resolvedGraphicsSettings,
      resolvedPerformanceSettings,
      resolvedRuntimeSettings,
      resolvedRuntimeBudgetSettings,
      resolvedCapabilityProfile,
    ),
  )

  const ENABLE_FRAME_PLAN_SHORTLIST = options.render?.shortlist?.enabled ?? true
  const FRAME_PLAN_SHORTLIST_MIN_SCENE_NODES = Math.max(
    1,
    options.render?.shortlist?.minSceneNodes ?? FRAME_PLAN_SHORTLIST_DEFAULT_MIN_SCENE_NODES,
  )
  const FRAME_PLAN_SHORTLIST_RATIO_THRESHOLD = Math.min(
    1,
    Math.max(0, options.render?.shortlist?.ratioThreshold ?? FRAME_PLAN_SHORTLIST_DEFAULT_RATIO_THRESHOLD),
  )
  const FRAME_PLAN_SHORTLIST_HYSTERESIS_RATIO = Math.min(
    FRAME_PLAN_SHORTLIST_MAX_HYSTERESIS_RATIO,
    Math.max(0, options.render?.shortlist?.hysteresisRatio ?? FRAME_PLAN_SHORTLIST_DEFAULT_HYSTERESIS_RATIO),
  )
  const FRAME_PLAN_SHORTLIST_STABLE_FRAME_COUNT = Math.max(
    1,
    Math.round(options.render?.shortlist?.stableFrameCount ?? FRAME_PLAN_SHORTLIST_DEFAULT_STABLE_FRAME_COUNT),
  )
  const INTERACTION_SETTLE_DELAY_MS = 120
  const INTERACTION_HOLD_MS = 56
  const FRAME_PLAN_MAX_OVERSCAN_RATIO = 1
  const layeredBridgeEnabled = options.render?.layeredBridgeEnabled ?? false
  const requestedBackend = options.render?.backend ?? 'webgl'
  let maxPixelRatio = options.render?.maxPixelRatio ?? DEFAULT_MAX_PIXEL_RATIO
  let pixelRatio = resolveEnginePixelRatio(
    options.render?.dpr ?? options.render?.pixelRatio,
    maxPixelRatio,
    options.host?.resolvePixelRatio,
  )
  let outputPixelRatio = 1
  const store = createEngineSceneStore({
    initialScene: options.initialScene,
  })
  const visibilityResolver = createEngineVisibilityResolver({
    queryBounds2D: (bounds) => store.queryCandidates(bounds),
  })
  const visibility3DPolicyDecision = visibilityResolver.resolveVisibility3DPolicyDecision()
  const hitResolver = createEngineHitResolver({
    resolvePointHits: (query) => {
      const adaptiveExactBudget = resolveAdaptiveHitTestExactBudget({
        budgetPressure: latestBudgetPressure,
        interactionActive: latestStrategyInteractionActive,
      })
      return store.hitTestAllWithSummary(query.point, query.tolerance ?? 0, {
        maxExactCandidateCount: adaptiveExactBudget,
      })
    },
  })
  const createRendererOptions = {
    canvas: options.canvas,
    createCanvasSurface: options.host?.createCanvasSurface,
    enableCulling: resolvedPerformance.culling,
    clearColor: options.render?.webglClearColor,
    antialias: options.render?.webglAntialias ?? true,
    modelCompleteComposite: options.render?.modelCompleteComposite ?? true,
    lod: resolvedPerformance.lodConfig,
    tileConfig: resolvedPerformance.tileConfig,
    initialRender: options.render?.initialRender,
    interactionPreview: options.render?.interactionPreview,
  }
  const renderer = requestedBackend === 'webgpu'
    ? createWebGPUEngineRenderer(createRendererOptions)
    : createWebGLEngineRenderer(createRendererOptions)
  const renderContext: {
    quality: EngineRenderQuality
    lodEnabled: boolean
    interactionActive?: boolean
    pixelRatio: number
    outputPixelRatio: number
    loader?: EngineResourceLoader
    textShaper?: EngineTextShaper
    dirtyRegions?: Array<{zoomLevel?: number; bounds: EngineRect}>
    framePlanCandidateIds?: readonly EngineNodeId[]
    framePlanVersion?: number
    protectedNodeIds?: readonly EngineNodeId[]
    interactionActiveNodeIds?: readonly EngineNodeId[]
    overlayNodes?: readonly EngineOverlayDrawNode[]
    frameBudget?: EngineFrameBudget
    frameBudgetPressure?: EngineFrameBudgetPressure
    interactionPredictor?: EngineInteractionPredictorState
    layeredRender?: ReturnType<typeof resolveLayeredRenderBridgeOutput>
  } = {
    // Force full quality when LOD is disabled so detail degradation paths
    // cannot lower fidelity via interaction-mode quality switches.
    quality: resolvedLodEnabled
      ? (options.render?.quality ?? 'full')
      : 'full',
    lodEnabled: resolvedLodEnabled,
    pixelRatio,
    outputPixelRatio,
    loader: options.resource?.loader,
    textShaper: options.resource?.textShaper,
  }
  const clock = options.clock ?? createSystemEngineClock()
  let viewport = resolveInitialViewport(options.canvas, options.viewport)
  const { applyResizeSurface } = createEngineResizeLifecycle({
    canvas: options.canvas,
    renderer,
    setOutputPixelRatio: (value) => {
      outputPixelRatio = value
    },
    setRenderContextOutputPixelRatio: (value) => {
      renderContext.outputPixelRatio = value
    },
    getViewport: () => viewport,
    setViewport: (nextViewport) => {
      viewport = nextViewport
    },
  })
  let latestRenderStats: EngineRenderStats | null = null
  let latestFramePlan: EngineFramePlan | null = null
  let latestFramePlanSignature = ''
  let shortlistActive = false
  let shortlistCandidateRatio = 1
  let shortlistAppliedCandidateCount = 0
  let shortlistPendingState: boolean | null = null
  let shortlistPendingFrameCount = 0
  let shortlistToggleCount = 0
  let shortlistDebounceBlockedToggleCount = 0
  let shortlistEnterRatioThreshold =
    FRAME_PLAN_SHORTLIST_RATIO_THRESHOLD - FRAME_PLAN_SHORTLIST_HYSTERESIS_RATIO
  let shortlistLeaveRatioThreshold =
    FRAME_PLAN_SHORTLIST_RATIO_THRESHOLD + FRAME_PLAN_SHORTLIST_HYSTERESIS_RATIO
  let latestHitPlan: EngineHitPlan | null = null
  let latestStrategyPhase: EngineRenderStrategyPhase = 'static'
  let latestStrategyInteractionActive = false
  let latestInteractionPredictor: EngineInteractionPredictorState = {
    directionX: 0,
    directionY: 0,
    speedPxPerSec: 0,
    confidence: 0,
  }
  let latestBudgetPressure: EngineFrameBudgetPressure = 'low'
  let latestPressureScore = 0
  let latestAutoQualityDecisionReason = 'hold'
  let latestQosTrace = ''
  let latestQosDegradationLevel: EngineDegradationLevel = 'none'
  let latestQosGuardTriggers: string[] = []
  let latestQosProfile: EngineProfileName = resolvedSettingsProfile
  let latestQosPressure: EngineFrameBudgetPressure = latestBudgetPressure
  let latestQosBudget: EngineFrameBudget = {
    drawSubmitBudgetMs: 0,
    textureUploadBudgetBytes: 0,
    textureUploadTotalBudgetBytes: 0,
    imageTextureUploadMaxCount: 0,
    textTextureUploadMaxCount: 0,
    tilePreloadBudgetMs: 0,
    tilePreloadMaxUploads: 0,
    overlayPassBudgetMs: 0,
  }
  let latestQosStablePhase: EngineRenderStrategyPhase = 'static'
  let latestQosFallbackReason: EngineRenderFallbackReason | null = null
  let latestQosPanel: EngineQosDiagnosticsPanel = resolveEngineQosDiagnosticsPanel({
    profile: latestQosProfile,
    phase: latestQosStablePhase,
    pressure: latestQosPressure,
    budget: latestQosBudget,
    degradationLevel: latestQosDegradationLevel,
    fallbackReason: latestQosFallbackReason,
    guardTriggers: latestQosGuardTriggers,
    trace: latestQosTrace,
  })
  let lastInteractionAtMs = clock.now()
  let lastInteractionKind: EngineInteractionMutationKind = 'none'
  const settleSharpnessState = {
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
  }
  const cameraAnimationController = createEngineAnimationController()
  const interactionPredictor = createEngineInteractionPredictor()
  let policyScaleState: EngineAutoQualityScalerState = {
    renderScale: resolvedRuntimePolicy.graphics.renderScale,
    lastAdjustedAtMs: clock.now(),
  }
  let phaseStabilityState: EnginePhaseStabilityState = {
    phase: latestQosStablePhase,
    pendingPhase: null as EngineRenderStrategyPhase | null,
    pendingFrames: 0,
  }
  let hybridPolicyState: EngineHybridAutoPolicyState = {
    profile: 'editor',
    lastSwitchAtMs: clock.now(),
    pendingProfile: null,
    pendingFrameCount: 0,
  }
  const {
    cameraAnimationState,
    markInteractionMutation,
    isSharpRenderStats,
    stopCameraAnimationInternal,
    resolveFramePlanQueryPaddingWorld,
    startCameraAnimationInternal,
  } = createEngineInteractionLifecycle({
    clockNow: () => clock.now(),
    cameraAnimationController,
    defaultCameraAnimationDurationMs: DEFAULT_CAMERA_ANIMATION_DURATION_MS,
    interactionSettleDelayMs: INTERACTION_SETTLE_DELAY_MS,
    framePlanMaxOverscanRatio: FRAME_PLAN_MAX_OVERSCAN_RATIO,
    tileConfig: resolvedPerformance.tileConfig,
    getViewport: () => viewport,
    setViewport: (nextViewport) => {
      viewport = nextViewport
    },
    setLastInteractionAtMs: (value) => {
      lastInteractionAtMs = value
    },
    setLastInteractionKind: (kind) => {
      lastInteractionKind = kind
    },
    settleSharpnessState,
  })

  const handleRenderStats = createEngineRenderStatsHandler({
    cameraAnimationState,
    settleSharpnessState,
    isSharpRenderStats,
    getNowMs: () => clock.now(),
    getLastInteractionAtMs: () => lastInteractionAtMs,
    getLatestStrategyPhase: () => latestStrategyPhase,
    getLatestBudgetPressure: () => latestBudgetPressure,
    getLatestInteractionPredictor: () => latestInteractionPredictor,
    setLatestRenderStats: (stats) => {
      latestRenderStats = stats
    },
    onStats: options.debug?.onStats,
  })

  const loop: EngineLoopController = createEngineLoop({
    clock,
    renderer,
    beforeRender: (frame) => {
      cameraAnimationController.tick(frame)
    },
    resolveFrame: () => {
      const scene = store.getSnapshot()
      const frameResolution = resolveCreateEngineFrame({
        scene,
        viewport,
        renderContext,
        renderer,
        nowMs: clock.now(),
        cameraAnimationState,
        settleSharpnessState,
        interactionPredictorUpdate: (args) => interactionPredictor.update(args),
        resolvedRuntimePolicy,
        resolvedSettingsProfile,
        resolvedPreset,
        resolvedPerformanceSettings,
        resolvedRuntimeSettings,
        resolvedRuntimeBudgetSettings,
        resolvedCapabilityProfile,
        policyScaleState,
        phaseStabilityState,
        hybridPolicyState,
        latestRenderStats,
        latestBudgetPressure,
        latestInteractionPredictor,
        latestQosBudget,
        latestQosGuardTriggers,
        latestQosTrace,
        latestQosProfile,
        latestQosPressure,
        latestQosFallbackReason,
        lastInteractionAtMs,
        lastInteractionKind,
        latestStrategyPhase,
        latestStrategyInteractionActive,
        latestQosStablePhase,
        latestQosDegradationLevel,
        latestPressureScore,
        latestAutoQualityDecisionReason,
        latestQosPanel,
        interactionSettleDelayMs: INTERACTION_SETTLE_DELAY_MS,
        interactionHoldMs: INTERACTION_HOLD_MS,
        shortlistEnabled: ENABLE_FRAME_PLAN_SHORTLIST,
        shortlistThresholds: {
          ratioThreshold: FRAME_PLAN_SHORTLIST_RATIO_THRESHOLD,
          hysteresisRatio: FRAME_PLAN_SHORTLIST_HYSTERESIS_RATIO,
          minSceneNodes: FRAME_PLAN_SHORTLIST_MIN_SCENE_NODES,
          stableFrameCount: FRAME_PLAN_SHORTLIST_STABLE_FRAME_COUNT,
        },
        shortlistState: {
          latestFramePlan,
          latestFramePlanSignature,
          shortlistActive,
          shortlistCandidateRatio,
          shortlistAppliedCandidateCount,
          shortlistPendingState,
          shortlistPendingFrameCount,
          shortlistToggleCount,
          shortlistDebounceBlockedToggleCount,
          shortlistEnterRatioThreshold,
          shortlistLeaveRatioThreshold,
        },
        framePlanPadding: resolveFramePlanQueryPaddingWorld(viewport),
        queryCandidates: (bounds) => store.queryCandidates(bounds),
        resolveVisibleSet: (bounds) => visibilityResolver.resolveVisibleSet(scene, {
          mode: 'bounds-2d',
          bounds,
        }),
        layeredBridgeEnabled,
      })
      resolvedRuntimePolicy = frameResolution.resolvedRuntimePolicy
      policyScaleState = frameResolution.policyScaleState
      phaseStabilityState = frameResolution.phaseStabilityState
      hybridPolicyState = frameResolution.hybridPolicyState
      latestPressureScore = frameResolution.latestPressureScore
      latestAutoQualityDecisionReason = frameResolution.latestAutoQualityDecisionReason
      latestStrategyPhase = frameResolution.latestStrategyPhase
      latestStrategyInteractionActive = frameResolution.latestStrategyInteractionActive
      latestQosStablePhase = frameResolution.latestQosStablePhase
      latestInteractionPredictor = frameResolution.latestInteractionPredictor
      latestBudgetPressure = frameResolution.latestBudgetPressure
      latestQosDegradationLevel = frameResolution.latestQosDegradationLevel
      latestQosTrace = frameResolution.latestQosTrace
      latestQosGuardTriggers = frameResolution.latestQosGuardTriggers
      latestQosProfile = frameResolution.latestQosProfile
      latestQosPressure = frameResolution.latestQosPressure
      latestQosBudget = frameResolution.latestQosBudget
      latestQosFallbackReason = frameResolution.latestQosFallbackReason
      latestQosPanel = frameResolution.latestQosPanel
      latestFramePlan = frameResolution.shortlistPlanning.latestFramePlan
      latestFramePlanSignature = frameResolution.shortlistPlanning.latestFramePlanSignature
      shortlistActive = frameResolution.shortlistPlanning.shortlistActive
      shortlistCandidateRatio = frameResolution.shortlistPlanning.shortlistCandidateRatio
      shortlistAppliedCandidateCount = frameResolution.shortlistPlanning.shortlistAppliedCandidateCount
      shortlistPendingState = frameResolution.shortlistPlanning.shortlistPendingState
      shortlistPendingFrameCount = frameResolution.shortlistPlanning.shortlistPendingFrameCount
      shortlistToggleCount = frameResolution.shortlistPlanning.shortlistToggleCount
      shortlistDebounceBlockedToggleCount = frameResolution.shortlistPlanning.shortlistDebounceBlockedToggleCount
      shortlistEnterRatioThreshold = frameResolution.shortlistPlanning.shortlistEnterRatioThreshold
      shortlistLeaveRatioThreshold = frameResolution.shortlistPlanning.shortlistLeaveRatioThreshold
      renderContext.framePlanCandidateIds = frameResolution.shortlistPlanning.framePlanCandidateIds
      renderContext.framePlanVersion = frameResolution.shortlistPlanning.framePlanVersion
      return frameResolution.frame
    },
    onStats: handleRenderStats,
  })

  // Keep renderer and viewport dimensions in sync so callers can just pass the
  // engine canvas once and then rely on `resize(...)`.
  applyResizeSurface({
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
    outputWidth: Math.max(1, options.canvas.width ?? Math.round(viewport.viewportWidth * outputPixelRatio)),
    outputHeight: Math.max(1, options.canvas.height ?? Math.round(viewport.viewportHeight * outputPixelRatio)),
  })

  return {
    ...createEngineSceneFacade({
      store,
      visibilityResolver,
      hitResolver,
      getViewport: () => viewport,
      getLatestFramePlan: () => latestFramePlan,
      setLatestFramePlan: (plan) => {
        latestFramePlan = plan
      },
      setLatestFramePlanSignature: (signature) => {
        latestFramePlanSignature = signature
      },
      setLatestHitPlan: (plan) => {
        latestHitPlan = plan
      },
    }),
    ...createEngineViewportFacade({
      getViewport: () => viewport,
      setViewportState: (nextViewport) => {
        viewport = nextViewport
      },
      stopCameraAnimationInternal,
      startCameraAnimationInternal,
      markInteractionMutation,
      applyResizeSurface,
      renderContext,
    }),
    ...createEngineRuntimeFacade({
      cameraAnimationTick: () => {
        cameraAnimationController.tick({
          now: clock.now(),
          dt: 0,
        })
      },
      renderOnce: () => loop.renderOnce(),
      isSettlingPhase: () => latestStrategyPhase === 'settling',
      hasSceneNodes: () => store.getSnapshot().nodes.length > 0,
      getLatestRenderStats: () => latestRenderStats,
      forceSharpFrame: () => {
        // Force one sharp recovery pass so callers never observe persistent
        // empty/interactive-quality output after zoom/camera settling.
        settleSharpnessState.forceSharpFrame = true
      },
      clearDirtyRegions: () => {
        renderContext.dirtyRegions = undefined
      },
      startLoop: () => loop.start(),
      stopLoop: () => loop.stop(),
      isRunning: () => loop.isRunning(),
      resolveDiagnosticsInput: () => resolveCreateEngineDiagnosticsInput({
        backend: renderer.capabilities.backend,
        latestRenderStats,
        pixelRatio,
        outputPixelRatio,
        sceneDiagnostics: store.getDiagnostics(),
        latestFramePlan,
        latestHitPlan,
        shortlistState: {
          active: shortlistActive,
          candidateRatio: shortlistCandidateRatio,
          appliedCandidateCount: shortlistAppliedCandidateCount,
          pendingState: shortlistPendingState,
          pendingFrameCount: shortlistPendingFrameCount,
          toggleCount: shortlistToggleCount,
          debounceBlockedToggleCount: shortlistDebounceBlockedToggleCount,
          minSceneNodes: FRAME_PLAN_SHORTLIST_MIN_SCENE_NODES,
          ratioThreshold: FRAME_PLAN_SHORTLIST_RATIO_THRESHOLD,
          hysteresisRatio: FRAME_PLAN_SHORTLIST_HYSTERESIS_RATIO,
          enterRatioThreshold: shortlistEnterRatioThreshold,
          leaveRatioThreshold: shortlistLeaveRatioThreshold,
          stableFrameCount: FRAME_PLAN_SHORTLIST_STABLE_FRAME_COUNT,
        },
        viewport: {
          scale: viewport.scale,
          offsetX: viewport.offsetX,
          offsetY: viewport.offsetY,
          viewportWidth: viewport.viewportWidth,
          viewportHeight: viewport.viewportHeight,
        },
        cameraAnimationState,
        latestStrategyPhase,
        latestStrategyInteractionActive,
        renderQuality: renderContext.quality,
        lastInteractionKind,
        nowMs: clock.now(),
        lastInteractionAtMs,
        predictorState: latestInteractionPredictor,
        latestBudgetPressure,
        frameBudget: renderContext.frameBudget,
        visibility3dPolicyDecision: visibility3DPolicyDecision,
        settleSharpnessState,
        runtimePolicy: resolvedRuntimePolicy,
        latestPressureScore,
        latestAutoQualityDecisionReason,
        latestQosPanel,
      }),
      stopAllCameraAnimations: () => {
        cameraAnimationController.stopAll()
      },
      resetInteractionPredictor: () => {
        interactionPredictor.reset()
      },
      disposeRenderer: () => {
        renderer.dispose?.()
      },
    }),
  }
}


