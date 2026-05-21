import { createEngineSceneStore } from '../../scene/store/store.ts'
import {
  createEngineVisibilityResolver,
  resolveEngineFrustumFallbackNodeIds,
} from '../../visibility/index.ts'
import { createEngineHitResolver } from '../../scene/hit/resolver.ts'
import { createSystemEngineClock } from '../../time/index.ts'
import { createEngineLoop, type EngineLoopController } from '../createEngineLoop/createEngineLoop.ts'
import {
  resolveEnginePerformanceOptions,
  resolveEnginePixelRatio,
  resolveInitialViewport,
} from './config.ts'
import { createEngineInteractionPredictor } from './interactionPredictor/interactionPredictor.ts'
import {
  createEngineAnimationController,
} from '../../animation/index.ts'
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
import { applyCreateEngineInitialResize } from './createEngineInitialResize.ts'
import {
  resolveCreateEngineFrame,
} from './createEngineFrameResolver.ts'
import { resolveCreateEnginePolicyBootstrap } from './createEnginePolicyBootstrap.ts'
import { resolveCreateEngineRendererBootstrap } from './createEngineRendererBootstrap.ts'
import { resolveCreateEngineRuntimeStateBootstrap } from './createEngineRuntimeStateBootstrap.ts'
import type {
  CreateEngineOptions,
  Engine,
} from './createEngineContracts.ts'

export type {
  CreateEngineOptions,
  EngineCamera3DOptions,
  EngineCameraAnimationOptions,
  Engine,
  EngineOverscanOptions,
  EnginePerformanceOptionsObject,
  ResolvedEnginePerformanceOptions,
  EngineRuntimeDiagnostics,
  EngineViewportOptions,
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
  const {
    resolvedSettingsProfile,
    resolvedCapabilityProfile,
    resolvedPerformanceSettings,
    resolvedRuntimeSettings,
    resolvedRuntimeBudgetSettings,
    resolvedPreset,
    resolvedRuntimePolicy: bootstrapRuntimePolicy,
  } = resolveCreateEnginePolicyBootstrap(options)
  let resolvedRuntimePolicy = bootstrapRuntimePolicy

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
  let maxPixelRatio = options.render?.maxPixelRatio ?? DEFAULT_MAX_PIXEL_RATIO
  let pixelRatio = resolveEnginePixelRatio(
    options.render?.dpr ?? options.render?.pixelRatio,
    maxPixelRatio,
    options.host?.resolvePixelRatio,
  )
  let outputPixelRatio = 1
  const {
    renderer,
    renderContext,
  } = resolveCreateEngineRendererBootstrap(
    options,
    resolvedPerformance,
    resolvedLodEnabled,
    pixelRatio,
    outputPixelRatio,
  )
  const store = createEngineSceneStore({
    initialScene: options.initialScene,
    spatialDimension: options.spatial?.dimension ?? '3d',
  })
  const visibilityResolver = createEngineVisibilityResolver({
    queryBounds2D: (bounds) => store.queryCandidates(bounds),
    queryFrustum3D: options.visibility?.queryFrustum3D ?? resolveEngineFrustumFallbackNodeIds,
    queryFrustum3DOcclusion: options.visibility?.queryFrustum3DOcclusion,
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
    resolveRayHits: options.hit?.resolveRay3D,
  })

  const clock = options.clock ?? createSystemEngineClock()
  let viewport = resolveInitialViewport(options.canvas, options.viewport)
  let camera3DSnapshot = options.camera3d?.snapshot ?? null
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
  let {
    latestRenderStats,
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
    latestHitPlan,
    latestStrategyPhase,
    latestStrategyInteractionActive,
    latestInteractionPredictor,
    latestBudgetPressure,
    latestPressureScore,
    latestAutoQualityDecisionReason,
    latestQosTrace,
    latestQosDegradationLevel,
    latestQosGuardTriggers,
    latestQosProfile,
    latestQosPressure,
    latestQosBudget,
    latestQosStablePhase,
    latestQosFallbackReason,
    latestQosPanel,
    lastInteractionAtMs,
    lastInteractionKind,
    settleSharpnessState,
    policyScaleState,
    phaseStabilityState,
    hybridPolicyState,
  } = resolveCreateEngineRuntimeStateBootstrap(
    clock.now(),
    resolvedSettingsProfile,
    resolvedRuntimePolicy,
    FRAME_PLAN_SHORTLIST_RATIO_THRESHOLD,
    FRAME_PLAN_SHORTLIST_HYSTERESIS_RATIO,
  )
  const cameraAnimationController = createEngineAnimationController()
  const interactionPredictor = createEngineInteractionPredictor()
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
        camera3DSnapshot,
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

  applyCreateEngineInitialResize({
    canvas: options.canvas,
    viewportWidth: viewport.viewportWidth,
    viewportHeight: viewport.viewportHeight,
    outputPixelRatio,
    applyResizeSurface,
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
      getCamera3DSnapshot: () => camera3DSnapshot,
      setCamera3DSnapshotState: (snapshot) => {
        camera3DSnapshot = snapshot
      },
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
        hit3dPolicy: {
          hasRayResolver: Boolean(options.hit?.resolveRay3D),
        },
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
        camera3DSnapshot,
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
