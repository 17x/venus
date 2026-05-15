import {
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
} from '../../interaction/viewport/viewport.ts'
import type {EngineOverlayDrawNode} from '../../interaction/overlayCanvas.ts'
import { createWebGLEngineRenderer } from '../../renderer/webgl/index.ts'
import { createWebGPUEngineRenderer } from '../../renderer/webgpu/index.ts'
import type { EngineRenderFallbackReason } from '../../renderer/fallbackTaxonomy/index.ts'
import { getEngineRenderPlanCacheDiagnostics } from '../../renderer/plan/index.ts'
import type {
  EngineBackend,
  EngineCanvasSurfaceFactory,
  EngineFrameBudget,
  EngineInteractionPredictorState,
  EngineInteractionPreviewConfig,
  EngineRenderQuality,
  EngineRenderSurfaceSize,
  EngineRenderStats,
  EngineResourceLoader,
  EngineTextShaper,
} from '../../renderer/types/index.ts'
import {
  createEngineSceneStore,
  type EngineSceneStoreDiagnostics,
  type EngineSceneStoreTransaction,
} from '../../scene/store/store.ts'
import {
  type EngineFramePlan,
} from '../../scene/framePlan.ts'
import {
  prepareEngineHitPlan,
  type EngineHitPlan,
} from '../../scene/hitPlan.ts'
import type {
  EngineVisibleSet,
  EngineVisibilityFrustum3DQuery,
} from '../../scene/visibility/contracts.ts'
import {
  createEngineVisibilityResolver,
} from '../../scene/visibility/visibility.ts'
import type { EngineHitTestResult } from '../../scene/hitTest/hitTest.ts'
import type {
  EngineNodeId,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
} from '../../scene/types/types.ts'
import type { EngineRay3 } from '../../math/dimension/types.ts'
import type {
  EngineScenePatchApplyResult,
  EngineScenePatchBatch,
} from '../../scene/patch/patch.ts'
import {
  createEngineHitResolver,
  createEnginePointHitQuery,
} from '../../scene/hit/resolver.ts'
import { createSystemEngineClock, type EngineClock } from '../../time/index.ts'
import { createEngineLoop, type EngineLoopController } from '../createEngineLoop/createEngineLoop.ts'
import {
  resolveEnginePerformanceOptions,
  resolveEnginePixelRatio,
  resolveInitialViewport,
} from './config.ts'
import {
  buildEngineFramePlan,
  buildEngineHitPlan,
  resolveEngineFramePlanSignature,
  resolveViewportAnimationTarget,
} from './planning.ts'
import {
  resolveEngineRenderStrategy,
  type EngineInteractionMutationKind,
  type EngineRenderStrategyPhase,
} from './strategy/strategy.ts'
import {
  resolveEngineFrameBudget,
  type EngineFrameBudgetPressure,
} from './frameBudgetBroker/frameBudgetBroker.ts'
import { createEngineInteractionPredictor } from './interactionPredictor/interactionPredictor.ts'
import { resolveShortlistCandidateNodeIds } from './shortlist.ts'
import type { EngineLodConfig } from '../../interaction/lodConfig.ts'
import type { EngineTileConfig } from '../../renderer/tileManager/index.ts'
import type { EngineInitialRenderConfig } from '../../renderer/initialRender/index.ts'
import {
  createEngineAnimationController,
  type EngineEasingDefinition,
} from '../../animation/index.ts'
import {
  resolveLayeredRenderBridgeOutput,
} from '../bridge/index.ts'
import {
  resolveEnginePerformanceGateStatus,
  type EnginePerformanceGateStatus,
} from './performanceGate.ts'

type EnginePerformanceToggle<TOptions> = boolean | TOptions

export interface EngineCullingOptions {
  enabled?: boolean
}

export interface EngineOverscanOptions {
  enabled?: boolean
  borderPx?: number
}

export interface EnginePerformanceOptionsObject {
  overscan?: EnginePerformanceToggle<EngineOverscanOptions>
  tiles?: EnginePerformanceToggle<EngineTileConfig>
  culling?: EnginePerformanceToggle<EngineCullingOptions>
  lod?: EnginePerformanceToggle<EngineLodConfig>
}

export type EnginePerformanceOptions = boolean | EnginePerformanceOptionsObject

export interface ResolvedEnginePerformanceOptions {
  culling: boolean
  lodConfig: EngineLodConfig | undefined
  tileConfig: EngineTileConfig | undefined
}

interface EngineRenderOptions {
  // Optional: renderer backend selection.
  backend?: EngineBackend
  quality?: EngineRenderQuality
  webglClearColor?: readonly [number, number, number, number]
  // Short alias for pixel ratio config.
  dpr?: number | 'auto'
  // `auto` resolves through the host-provided DPR callback when available.
  pixelRatio?: number | 'auto'
  maxPixelRatio?: number
  webglAntialias?: boolean
  // Optional: LOD (level-of-detail) configuration
  lod?: EngineLodConfig
  // Optional: Tile-based caching configuration
  tileConfig?: EngineTileConfig
  // Optional: Initial render optimization (low-DPR preview + progressive detail)
  initialRender?: EngineInitialRenderConfig
  // Optional: interaction-time affine preview from last rendered frame.
  interactionPreview?: EngineInteractionPreviewConfig
  // Optional: promote settled full-quality frames through the model-complete
  // composite path so WebGL packets do not have to approximate unsupported
  // fidelity features like image clips or non-rect shape strokes.
  modelCompleteComposite?: boolean
  // Optional: coarse frame-plan shortlist pruning controls.
  shortlist?: {
    enabled?: boolean
    minSceneNodes?: number
    ratioThreshold?: number
    hysteresisRatio?: number
    stableFrameCount?: number
  }
  // Optional: emits layered-pipeline compatibility payload into render context.
  layeredBridgeEnabled?: boolean
}

interface EngineResourceOptions {
  loader?: EngineResourceLoader
  textShaper?: EngineTextShaper
}

interface EngineDebugOptions {
  onStats?: (stats: EngineRenderStats) => void
}

export interface EngineViewportOptions {
  viewportWidth?: number
  viewportHeight?: number
  offsetX?: number
  offsetY?: number
  scale?: number
}

export interface EngineCameraAnimationOptions {
  durationMs?: number
  easing?: EngineEasingDefinition
  cachePreviewOnly?: boolean
}

export interface EngineResizeOptions extends EngineRenderSurfaceSize {}

export interface EngineHostEnvironment {
  resolvePixelRatio?: () => number
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface']
}

interface EngineCameraAnimationState {
  active: boolean
  cachePreviewOnly: boolean
  previewHitCount: number
  previewMissCount: number
}

export interface CreateEngineOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas
  initialScene?: EngineSceneSnapshot
  viewport?: EngineViewportOptions
  // Legacy top-level culling switch retained for compatibility.
  culling?: boolean
  // Legacy top-level LOD config retained for compatibility.
  lod?: EngineLodConfig
  // Legacy top-level overscan retained for compatibility.
  overscan?: EngineOverscanOptions
  // Unified performance options. Defaults to enabled for all feature switches.
  performance?: EnginePerformanceOptions
  render?: EngineRenderOptions
  resource?: EngineResourceOptions
  debug?: EngineDebugOptions
  clock?: EngineClock
  host?: EngineHostEnvironment
}

export interface EngineRuntimeDiagnostics {
  backend: EngineBackend
  renderStats: EngineRenderStats | null
  pixelRatio: number
  outputPixelRatio: number
  scene: EngineSceneStoreDiagnostics
  framePlan: EngineFramePlan | null
  hitPlan: EngineHitPlan | null
  shortlist: {
    active: boolean
    candidateRatio: number
    appliedCandidateCount: number
    pendingState: boolean | null
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
  viewport: Pick<EngineCanvasViewportState, 'scale' | 'offsetX' | 'offsetY' | 'viewportWidth' | 'viewportHeight'>
  cameraAnimation: EngineCameraAnimationState
  // Reports internal render-strategy state so diagnostics can correlate
  // quality/preview decisions with interaction and fallback behavior.
  strategy: {
    // Active strategy phase for current render timeline.
    phase: EngineRenderStrategyPhase
    // Whether the strategy currently treats rendering as interaction-time.
    interactionActive: boolean
    // Effective quality lane applied to render context.
    quality: EngineRenderQuality
    // Last viewport mutation kind captured by strategy input state.
    lastInteractionKind: EngineInteractionMutationKind
    // Elapsed time since last viewport interaction mutation.
    lastInteractionElapsedMs: number
  }
  // Reports internal interaction predictor output used by tile prefetch tuning.
  predictor: {
    // Unit X direction of viewport offset movement.
    directionX: number
    // Unit Y direction of viewport offset movement.
    directionY: number
    // Predicted viewport movement speed in pixels per second.
    speedPxPerSec: number
    // Confidence score in range [0, 1] for direction stability.
    confidence: number
  }
  // Reports internal frame-budget broker decision for renderer lane budgeting.
  budget: {
    // Budget pressure tier resolved from scene and queue pressure.
    pressure: EngineFrameBudgetPressure
    // Draw submission budget in milliseconds.
    drawSubmitBudgetMs: number
    // Image texture upload budget in bytes.
    textureUploadBudgetBytes: number
    // Combined texture upload budget in bytes.
    textureUploadTotalBudgetBytes: number
    // Image texture upload budget in count.
    imageTextureUploadMaxCount: number
    // Text texture upload budget in count.
    textTextureUploadMaxCount: number
    // Tile preload scheduler budget in milliseconds.
    tilePreloadBudgetMs: number
    // Tile preload scheduler budget in count.
    tilePreloadMaxUploads: number
    // Overlay pass budget in milliseconds.
    overlayPassBudgetMs: number
  }
  // Exposes one compact per-frame strategy snapshot to simplify telemetry joins.
  strategySnapshot: {
    // Strategy lane resolved for current render timeline.
    lane: EngineRenderStrategyPhase
    // Current budget pressure tier used to shape renderer budgets.
    budgetPressure: EngineFrameBudgetPressure
    // Latest fallback reason emitted by renderer path selection.
    fallbackReason: EngineRenderFallbackReason | null
    // Predictor confidence from the latest viewport-motion estimate.
    predictorConfidence: number
  }
  // Reports settle sharpness contract state and compliance counters.
  settleSharpness: {
    // Whether current interaction stop is still waiting for a sharp frame.
    pending: boolean
    // Remaining time until settle deadline in milliseconds.
    remainingDeadlineMs: number
    // Whether next frame is forced into sharp recovery mode.
    forceSharpFrame: boolean
    // Total count of interactions that met stop-to-sharp deadline.
    metCount: number
    // Total count of interactions that missed stop-to-sharp deadline.
    missCount: number
    // Last measured stop-to-sharp latency in milliseconds.
    lastLatencyMs: number
    // Last measured miss latency in milliseconds.
    lastMissLatencyMs: number
    // Number of high-zoom text SLA checks observed in full-quality frames.
    highZoomTextSlaCheckedCount: number
    // Number of high-zoom text SLA violations observed in checked frames.
    highZoomTextSlaViolationCount: number
  }
  /** Reports runtime performance-gate evaluation based on latest render stats. */
  performanceGate: EnginePerformanceGateStatus
}

export interface Engine {
  loadScene(scene: EngineSceneSnapshot): EngineScenePatchApplyResult
  applyScenePatchBatch(batch: EngineScenePatchBatch): EngineScenePatchApplyResult
  transaction(
    run: (transaction: EngineSceneStoreTransaction) => void,
    options?: {revision?: string | number},
  ): EngineScenePatchApplyResult | null
  queryViewportCandidates(padding?: number): EngineNodeId[]
  /** Resolves one coarse visible-set snapshot from the current 2D viewport camera state. */
  queryVisibleSet(padding?: number): EngineVisibleSet
  /** Resolves one coarse visible-set snapshot from an explicit 3D frustum query. */
  queryFrustumVisibleSet(query: EngineVisibilityFrustum3DQuery): EngineVisibleSet
  queryPointCandidates(point: {x: number; y: number}, tolerance?: number): EngineNodeId[]
  prepareFramePlan(padding?: number): EngineFramePlan
  prepareHitPlan(point: {x: number; y: number}, tolerance?: number): EngineHitPlan
  query(bounds: EngineRect): EngineNodeId[]
  /** Resolves one 2D point hit using shared 2D/3D hit resolver contracts. */
  hitTest2D(point: {x: number; y: number}, tolerance?: number): EngineHitTestResult | null
  /** Resolves one 3D ray hit using shared 2D/3D hit resolver contracts. */
  hitTestRay(ray: EngineRay3, maxDistance?: number): EngineHitTestResult | null
  hitTest(point: {x: number; y: number}, tolerance?: number): EngineHitTestResult | null
  getNode(nodeId: EngineNodeId): EngineRenderableNode | null
  getSnapshot(): EngineSceneSnapshot
  setViewport(next: EngineViewportOptions): EngineCanvasViewportState
  panBy(deltaX: number, deltaY: number): EngineCanvasViewportState
  zoomTo(scale: number, anchor?: {x: number; y: number}): EngineCanvasViewportState
  startCameraAnimation(target: EngineViewportOptions, options?: EngineCameraAnimationOptions): void
  updateCameraAnimation(target: EngineViewportOptions, options?: EngineCameraAnimationOptions): void
  stopCameraAnimation(options?: {commitTarget?: boolean}): void
  resize(size: EngineResizeOptions): EngineCanvasViewportState
  setProtectedNodeIds(nodeIds?: readonly EngineNodeId[]): void
  // Publishes editing-scope active ids so layered base/active routing stays stable.
  setInteractionActiveNodeIds(nodeIds?: readonly EngineNodeId[]): void
  setOverlayNodes(nodes?: readonly EngineOverlayDrawNode[]): void
  setResourceLoader(loader?: EngineResourceLoader): void
  setTextShaper(textShaper?: EngineTextShaper): void
  /** Mark world-space bounds as dirty for incremental tile invalidation. */
  markDirtyBounds(bounds: EngineRect, zoomLevel?: number): void
  renderFrame(): Promise<EngineRenderStats>
  start(): void
  stop(): void
  isRunning(): boolean
  getDiagnostics(): EngineRuntimeDiagnostics
  dispose(): void
}

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
  const resolveResizeSurface = (size: EngineResizeOptions) => {
    const viewportWidth = Math.max(1, Math.round(size.viewportWidth))
    const viewportHeight = Math.max(1, Math.round(size.viewportHeight))
    const outputWidth = Math.max(1, Math.round(size.outputWidth))
    const outputHeight = Math.max(1, Math.round(size.outputHeight))

    // Keep app-provided output sizing authoritative so engine never repairs
    // canvas dimensions behind the host's back.
    return {
      viewportWidth,
      viewportHeight,
      outputWidth,
      outputHeight,
      outputPixelRatio: Math.max(
        1,
        Math.min(outputWidth / viewportWidth, outputHeight / viewportHeight),
      ),
    }
  }

  const shouldValidateCanvasOutputSize = () => {
    const runtimeProcess = (globalThis as Record<string, unknown>)['process'] as
      | {env?: {NODE_ENV?: string}}
      | undefined
    if (runtimeProcess?.env?.NODE_ENV) {
      return runtimeProcess.env.NODE_ENV !== 'production'
    }

    if (typeof location !== 'undefined') {
      return location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    }

    return false
  }

  const validateCanvasOutputSize = (size: EngineResizeOptions) => {
    const hostCanvas = options.canvas as {width?: number; height?: number}
    if (typeof console === 'undefined' || !shouldValidateCanvasOutputSize()) {
      return
    }

    if (hostCanvas.width !== size.outputWidth || hostCanvas.height !== size.outputHeight) {
      // Dev-only style warning: surface ownership stays with the app even when
      // the host forgets to keep the drawing buffer aligned with resize input.
      console.warn(
        '[venus/engine] resize() expected app-owned canvas buffer size',
        {
          expectedWidth: size.outputWidth,
          expectedHeight: size.outputHeight,
          actualWidth: hostCanvas.width,
          actualHeight: hostCanvas.height,
        },
      )
    }
  }

  const applyResizeSurface = (size: EngineResizeOptions) => {
    const resolvedSize = resolveResizeSurface(size)
    outputPixelRatio = resolvedSize.outputPixelRatio
    renderContext.outputPixelRatio = outputPixelRatio
    validateCanvasOutputSize(resolvedSize)
    renderer.resize?.(resolvedSize)
    viewport = resolveEngineViewportState({
      viewportWidth: resolvedSize.viewportWidth,
      viewportHeight: resolvedSize.viewportHeight,
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
      scale: viewport.scale,
    })
    return viewport
  }
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
  const CAMERA_ANIMATION_ID = 'engine.camera.viewport'
  let cameraAnimationTarget: EngineCanvasViewportState | null = null
  const cameraAnimationState: EngineCameraAnimationState = {
    active: false,
    cachePreviewOnly: false,
    previewHitCount: 0,
    previewMissCount: 0,
  }

  // Capture one interaction mutation event so internal strategy can classify
  // upcoming frames into pan/zoom/settling/static phases.
  const markInteractionMutation = (kind: EngineInteractionMutationKind) => {
    lastInteractionAtMs = clock.now()
    lastInteractionKind = kind
    // Arm stop-to-sharp contract window from the latest interaction mutation.
    settleSharpnessState.pending = true
    settleSharpnessState.deadlineAtMs = lastInteractionAtMs + INTERACTION_SETTLE_DELAY_MS
    settleSharpnessState.deadlineMissRecorded = false
    settleSharpnessState.forceSharpFrame = false
  }

  // Keep one conservative sharpness heuristic so settle contract does not
  // depend on app-level policy or runtime-specific fidelity interpretation.
  const isSharpRenderStats = (stats: EngineRenderStats): boolean => {
    const deferredImageCount = stats.webglDeferredImageTextureCount ?? 0
    const deferredTextCount = stats.webglDeferredTextTextureCount ?? 0
    const interactiveTextFallbackCount = stats.webglInteractiveTextFallbackCount ?? 0
    const drawBudgetExceeded = Boolean(stats.webglDrawSubmitBudgetExceeded)
    return (
      stats.drawCount > 0 &&
      stats.engineFrameQuality === 'full' &&
      deferredImageCount === 0 &&
      deferredTextCount === 0 &&
      interactiveTextFallbackCount === 0 &&
      !drawBudgetExceeded
    )
  }

  const stopCameraAnimationInternal = (commitTarget = true) => {
    cameraAnimationController.stop(CAMERA_ANIMATION_ID)
    if (commitTarget && cameraAnimationTarget) {
      viewport = cameraAnimationTarget
    }
    cameraAnimationTarget = null
    cameraAnimationState.active = false
    cameraAnimationState.cachePreviewOnly = false
  }

  const startCameraAnimationInternal = (
    target: EngineViewportOptions,
    animationOptions?: EngineCameraAnimationOptions,
  ) => {
    const resolvedTarget = resolveViewportAnimationTarget(viewport, target)
    cameraAnimationTarget = resolvedTarget
    cameraAnimationState.active = true
    cameraAnimationState.cachePreviewOnly = Boolean(animationOptions?.cachePreviewOnly)
    cameraAnimationState.previewHitCount = 0
    cameraAnimationState.previewMissCount = 0

    cameraAnimationController.start<EngineCanvasViewportState>({
      id: CAMERA_ANIMATION_ID,
      from: viewport,
      to: resolvedTarget,
      duration: Math.max(0, animationOptions?.durationMs ?? DEFAULT_CAMERA_ANIMATION_DURATION_MS),
      easing: animationOptions?.easing ?? 'easeOut',
      interpolate: (from, to, progress) => {
        return resolveEngineViewportState({
          viewportWidth: from.viewportWidth + (to.viewportWidth - from.viewportWidth) * progress,
          viewportHeight: from.viewportHeight + (to.viewportHeight - from.viewportHeight) * progress,
          offsetX: from.offsetX + (to.offsetX - from.offsetX) * progress,
          offsetY: from.offsetY + (to.offsetY - from.offsetY) * progress,
          scale: from.scale + (to.scale - from.scale) * progress,
        })
      },
      onUpdate: (nextViewport) => {
        viewport = nextViewport
      },
      onComplete: () => {
        stopCameraAnimationInternal(true)
      },
    })
  }

  // Enrich renderer stats with runtime-only strategy/camera diagnostics before
  // publishing snapshots to debug hooks and runtime diagnostics consumers.
  const handleRenderStats = (stats: EngineRenderStats) => {
    const globalGeometryCacheDiagnostics = getEngineRenderPlanCacheDiagnostics()
    const geometryCacheHitCount = Math.max(
      0,
      stats.geometryCacheHitCount ?? globalGeometryCacheDiagnostics.geometryCacheHitCount,
    )
    const geometryCacheMissCount = Math.max(
      0,
      stats.geometryCacheMissCount ?? globalGeometryCacheDiagnostics.geometryCacheMissCount,
    )
    const geometryCacheHitRate = stats.geometryCacheHitRate
      ?? globalGeometryCacheDiagnostics.geometryCacheHitRate

    if (cameraAnimationState.active) {
      cameraAnimationState.previewHitCount += stats.l0PreviewHitCount ?? 0
      cameraAnimationState.previewMissCount += stats.l0PreviewMissCount ?? 0
    }

    if (stats.webglHighZoomTextSlaChecked) {
      // Track high-zoom text SLA checks and violations in runtime diagnostics.
      settleSharpnessState.highZoomTextSlaCheckedCount += 1
      settleSharpnessState.highZoomTextSlaViolationCount += stats.webglHighZoomTextSlaViolationCount ?? 0
    }

    if (settleSharpnessState.pending && isSharpRenderStats(stats)) {
      // Resolve settle contract as soon as one sharp full-quality frame lands.
      settleSharpnessState.pending = false
      settleSharpnessState.deadlineMissRecorded = false
      settleSharpnessState.forceSharpFrame = false
      settleSharpnessState.metCount += 1
      settleSharpnessState.lastLatencyMs = Math.max(0, clock.now() - lastInteractionAtMs)
    }

    const enrichedStats: EngineRenderStats = {
      ...stats,
      geometryCacheHitCount,
      geometryCacheMissCount,
      geometryCacheHitRate,
      strategySnapshotLane: latestStrategyPhase,
      strategySnapshotBudgetPressure: latestBudgetPressure,
      strategySnapshotFallbackReason: stats.cacheFallbackReason ?? null,
      strategySnapshotPredictorConfidence: latestInteractionPredictor.confidence,
      cameraAnimationActive: cameraAnimationState.active,
      cameraAnimationCachePreviewOnly: cameraAnimationState.cachePreviewOnly,
      cameraAnimationPreviewHitCount: cameraAnimationState.previewHitCount,
      cameraAnimationPreviewMissCount: cameraAnimationState.previewMissCount,
    }
    latestRenderStats = enrichedStats
    options.debug?.onStats?.(enrichedStats)
  }

  const loop: EngineLoopController = createEngineLoop({
    clock,
    renderer,
    beforeRender: (frame) => {
      cameraAnimationController.tick(frame)
    },
    resolveFrame: () => {
      const scene = store.getSnapshot()
      // Resolve one strategy decision per frame so quality and preview policy
      // stay synchronized across planner and renderer execution.
      const strategyDecision = resolveEngineRenderStrategy({
        nowMs: clock.now(),
        lodEnabled: renderContext.lodEnabled,
        cameraAnimationActive: cameraAnimationState.active,
        cameraCachePreviewOnly: cameraAnimationState.cachePreviewOnly,
        lastInteractionAtMs,
        lastInteractionKind,
        settleDelayMs: INTERACTION_SETTLE_DELAY_MS,
        interactionHoldMs: INTERACTION_HOLD_MS,
        forceSharpFrame: settleSharpnessState.forceSharpFrame,
      })
      renderContext.quality = strategyDecision.quality
      renderer.setInteractionPreview?.(strategyDecision.interactionPreview)
      latestStrategyPhase = strategyDecision.phase
      latestStrategyInteractionActive = strategyDecision.interactionActive

      // Refresh interaction predictor each frame so renderer lanes can adapt
      // prefetch ring and overscan using one shared motion snapshot.
      latestInteractionPredictor = interactionPredictor.update({
        nowMs: clock.now(),
        viewport,
        interactionActive: strategyDecision.interactionActive,
      })
      renderContext.interactionPredictor = latestInteractionPredictor

      // Resolve one frame budget snapshot so renderer lanes share the same
      // draw/upload/preload throttling contract for this frame.
      const frameBudgetDecision = resolveEngineFrameBudget({
        phase: strategyDecision.phase,
        interactionActive: strategyDecision.interactionActive,
        sceneNodeCount: scene.nodes.length,
        tileQueuePendingCount: latestRenderStats?.tileSchedulerPendingCount ?? 0,
        dirtyRegionCount: renderContext.dirtyRegions?.length ?? 0,
        settleSharpnessPending: settleSharpnessState.pending,
        forceSharpFrame: settleSharpnessState.forceSharpFrame,
      })
      renderContext.frameBudget = frameBudgetDecision.budget
      renderContext.frameBudgetPressure = frameBudgetDecision.pressure
      latestBudgetPressure = frameBudgetDecision.pressure

      if (settleSharpnessState.pending && clock.now() > settleSharpnessState.deadlineAtMs) {
        // Record one contract miss and force one immediate sharp recovery frame.
        if (!settleSharpnessState.deadlineMissRecorded) {
          settleSharpnessState.deadlineMissRecorded = true
          settleSharpnessState.missCount += 1
          settleSharpnessState.lastMissLatencyMs = Math.max(0, clock.now() - lastInteractionAtMs)
        }

        settleSharpnessState.forceSharpFrame = true
      }

      if (ENABLE_FRAME_PLAN_SHORTLIST) {
          const framePlanSignature = resolveEngineFramePlanSignature(scene, viewport)
        if (!latestFramePlan || latestFramePlanSignature !== framePlanSignature) {
          latestFramePlan = buildEngineFramePlan(scene, viewport, (bounds) => store.queryCandidates(bounds), 0, {
            resolveVisibleSet: (bounds) => visibilityResolver.resolveVisibleSet(scene, {
              mode: 'bounds-2d',
              bounds,
            }),
          })
          latestFramePlanSignature = framePlanSignature
        }
        const candidateRatio = latestFramePlan.sceneNodeCount > 0
          ? latestFramePlan.candidateCount / latestFramePlan.sceneNodeCount
          : 1
        shortlistCandidateRatio = candidateRatio
        shortlistEnterRatioThreshold =
          FRAME_PLAN_SHORTLIST_RATIO_THRESHOLD - FRAME_PLAN_SHORTLIST_HYSTERESIS_RATIO
        shortlistLeaveRatioThreshold =
          FRAME_PLAN_SHORTLIST_RATIO_THRESHOLD + FRAME_PLAN_SHORTLIST_HYSTERESIS_RATIO
        const canUseShortlist =
          latestFramePlan.sceneNodeCount >= FRAME_PLAN_SHORTLIST_MIN_SCENE_NODES &&
          latestFramePlan.candidateCount > 0

        const resolveTargetShortlistState = () => {
          if (!canUseShortlist) {
            return false
          }

          if (shortlistActive) {
            return candidateRatio <= shortlistLeaveRatioThreshold
          }

          return candidateRatio <= shortlistEnterRatioThreshold
        }
        const targetShortlistState = resolveTargetShortlistState()

        if (!canUseShortlist) {
          shortlistActive = false
          shortlistPendingState = null
          shortlistPendingFrameCount = 0
        } else if (targetShortlistState === shortlistActive) {
          // Track transient shortlist flips that debounce intentionally blocked.
          if (shortlistPendingState !== null && shortlistPendingFrameCount > 0) {
            shortlistDebounceBlockedToggleCount += 1
          }
          shortlistPendingState = null
          shortlistPendingFrameCount = 0
        } else {
          if (shortlistPendingState !== targetShortlistState) {
            shortlistPendingState = targetShortlistState
            shortlistPendingFrameCount = 1
          } else {
            shortlistPendingFrameCount += 1
          }

          if (shortlistPendingFrameCount >= FRAME_PLAN_SHORTLIST_STABLE_FRAME_COUNT) {
            shortlistActive = targetShortlistState
            shortlistToggleCount += 1
            shortlistPendingState = null
            shortlistPendingFrameCount = 0
          }
        }

        // Feed the current frame-plan shortlist into renderer planning so render
        // execution can start consuming the same coarse candidates as diagnostics.
        renderContext.framePlanCandidateIds = shortlistActive
          ? resolveShortlistCandidateNodeIds(
            scene,
            latestFramePlan,
            renderContext.protectedNodeIds,
          )
          : undefined
        shortlistAppliedCandidateCount = renderContext.framePlanCandidateIds?.length ?? 0
        renderContext.framePlanVersion = latestFramePlan.planVersion
      } else {
        shortlistActive = false
        shortlistCandidateRatio = 1
        shortlistAppliedCandidateCount = 0
        shortlistPendingState = null
        shortlistPendingFrameCount = 0
        shortlistToggleCount = 0
        shortlistDebounceBlockedToggleCount = 0
        renderContext.framePlanCandidateIds = undefined
        renderContext.framePlanVersion = undefined
      }

      if (layeredBridgeEnabled) {
        renderContext.layeredRender = resolveLayeredRenderBridgeOutput({
          scene,
          viewport,
          context: renderContext,
        })
      } else {
        renderContext.layeredRender = undefined
      }

      return {
        scene,
        viewport,
        context: renderContext,
      }
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
        /**
     * Handles loadScene.
     * @param scene Scene snapshot.
     */
loadScene(scene) {
      return store.loadScene(scene)
    },
        /**
     * Handles applyScenePatchBatch.
     * @param batch batch parameter.
     */
applyScenePatchBatch(batch) {
      return store.applyScenePatchBatch(batch)
    },
        /**
     * Handles transaction.
     * @param run run parameter.
     * @param transactionOptions transactionOptions parameter.
     */
transaction(run, transactionOptions) {
      return store.transaction(run, transactionOptions)
    },
    // Keep viewport candidate collection in the engine facade so callers do
    // not need to duplicate viewport-to-world bounds conversion logic.
        /**
     * Handles queryViewportCandidates.
     * @param padding padding parameter.
     */
queryViewportCandidates(padding = 0) {
      return this.queryVisibleSet(padding).nodeIds.slice()
    },
        /**
     * Handles queryVisibleSet.
     * @param padding padding parameter.
     */
queryVisibleSet(padding = 0) {
      return visibilityResolver.resolveViewportVisibleSet(
        store.getSnapshot(),
        viewport,
        padding,
      )
    },
        /**
     * Handles queryFrustumVisibleSet.
     * @param query query parameter.
     */
queryFrustumVisibleSet(query) {
      return visibilityResolver.resolveVisibleSet(store.getSnapshot(), query)
    },
        /**
     * Handles queryPointCandidates.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     */
queryPointCandidates(point, tolerance) {
      return store.queryPointCandidates(point, tolerance)
    },
        /**
     * Handles prepareFramePlan.
     * @param padding padding parameter.
     */
prepareFramePlan(padding = 0) {
      const scene = store.getSnapshot()
      latestFramePlan = buildEngineFramePlan(scene, viewport, (bounds) => store.queryCandidates(bounds), padding, {
        resolveVisibleSet: (bounds) => visibilityResolver.resolveVisibleSet(scene, {
          mode: 'bounds-2d',
          bounds,
        }),
      })
      latestFramePlanSignature = resolveEngineFramePlanSignature(scene, viewport, padding)
      return latestFramePlan
    },
        /**
     * Handles prepareHitPlan.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     */
prepareHitPlan(point, tolerance = 0) {
      latestHitPlan = buildEngineHitPlan(
        store.getSnapshot(),
        point,
        tolerance,
        (queryPoint, queryTolerance) => store.queryPointCandidates(queryPoint, queryTolerance),
        (queryPoint, queryTolerance) => store.hitTestAll(queryPoint, queryTolerance),
      )
      return latestHitPlan
    },
        /**
     * Handles query.
     * @param bounds Bounds data.
     */
query(bounds) {
      return store.queryCandidates(bounds)
    },
        /**
     * Handles hitTest2D.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     */
hitTest2D(point, tolerance) {
      const resolvedTolerance = tolerance ?? 0
      const hitSet = hitResolver.resolve(createEnginePointHitQuery(point, resolvedTolerance))
      latestHitPlan = prepareEngineHitPlan({
        scene: store.getSnapshot(),
        point,
        tolerance: resolvedTolerance,
        hits: hitSet.hits,
        exactCheckCount: hitSet.exactCheckCount,
        exactCheckBudget: hitSet.exactCheckBudget,
        exactBudgetExceeded: hitSet.exactBudgetExceeded,
        queryPointCandidates: (queryPoint: {x: number; y: number}, queryTolerance?: number) => store.queryPointCandidates(queryPoint, queryTolerance),
      })
      return hitSet.primaryHit
    },
        /**
     * Handles hitTestRay.
     * @param ray ray parameter.
     * @param maxDistance maxDistance parameter.
     */
hitTestRay(ray, maxDistance) {
      const hitSet = hitResolver.resolve({
        mode: 'ray-3d',
        ray,
        maxDistance,
      })
      // Keep hit-plan diagnostics contract populated even for ray queries by
      // projecting the ray origin through the existing point-based hit-plan view.
      latestHitPlan = prepareEngineHitPlan({
        scene: store.getSnapshot(),
        point: {
          x: ray.origin.x,
          y: ray.origin.y,
        },
        tolerance: 0,
        hits: hitSet.hits,
        exactCheckCount: hitSet.exactCheckCount,
        exactCheckBudget: hitSet.exactCheckBudget,
        exactBudgetExceeded: hitSet.exactBudgetExceeded,
        queryPointCandidates: (queryPoint: {x: number; y: number}, queryTolerance?: number) => store.queryPointCandidates(queryPoint, queryTolerance),
      })
      return hitSet.primaryHit
    },
        /**
     * Handles hitTest.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     */
hitTest(point, tolerance) {
      return this.hitTest2D(point, tolerance)
    },
        /**
     * Handles getNode.
     * @param nodeId nodeId parameter.
     */
getNode(nodeId) {
      return store.getNode(nodeId)
    },
    getSnapshot() {
      return store.getSnapshot()
    },
        /**
     * Handles setViewport.
     * @param next next parameter.
     */
setViewport(next) {
      stopCameraAnimationInternal(false)
      markInteractionMutation('set')
      viewport = resolveEngineViewportState({
        viewportWidth: next.viewportWidth ?? viewport.viewportWidth,
        viewportHeight: next.viewportHeight ?? viewport.viewportHeight,
        offsetX: next.offsetX ?? viewport.offsetX,
        offsetY: next.offsetY ?? viewport.offsetY,
        scale: next.scale ?? viewport.scale,
      })
      return viewport
    },
        /**
     * Handles panBy.
     * @param deltaX deltaX parameter.
     * @param deltaY deltaY parameter.
     */
panBy(deltaX, deltaY) {
      stopCameraAnimationInternal(false)
      markInteractionMutation('pan')
      viewport = panEngineViewportState(viewport, deltaX, deltaY)
      return viewport
    },
        /**
     * Handles zoomTo.
     * @param scale Scale value.
     * @param anchor anchor parameter.
     */
zoomTo(scale, anchor) {
      stopCameraAnimationInternal(false)
      markInteractionMutation('zoom')
      viewport = zoomEngineViewportState(viewport, scale, anchor)
      return viewport
    },
        /**
     * Handles startCameraAnimation.
     * @param target target parameter.
     * @param animationOptions animationOptions parameter.
     */
startCameraAnimation(target, animationOptions) {
      startCameraAnimationInternal(target, animationOptions)
    },
        /**
     * Handles updateCameraAnimation.
     * @param target target parameter.
     * @param animationOptions animationOptions parameter.
     */
updateCameraAnimation(target, animationOptions) {
      // Updates restart from the current viewport to keep pan/zoom targets
      // responsive to high-frequency input streams.
      startCameraAnimationInternal(target, animationOptions)
    },
        /**
     * Handles stopCameraAnimation.
     * @param stopOptions stopOptions parameter.
     */
stopCameraAnimation(stopOptions) {
      stopCameraAnimationInternal(stopOptions?.commitTarget ?? true)
    },
        /**
     * Handles resize.
     * @param size size parameter.
     */
resize(size) {
      markInteractionMutation('set')
      return applyResizeSurface(size)
    },
        /**
     * Handles setProtectedNodeIds.
     * @param nodeIds nodeIds parameter.
     */
setProtectedNodeIds(nodeIds) {
      if (!nodeIds || nodeIds.length === 0) {
        renderContext.protectedNodeIds = undefined
        return
      }

      // Keep protected ids de-duplicated and stable for planner-side guards.
      renderContext.protectedNodeIds = Array.from(new Set(nodeIds))
    },
        /**
     * Handles setInteractionActiveNodeIds.
     * @param nodeIds Active node ids for editing-layer routing.
     */
setInteractionActiveNodeIds(nodeIds) {
      if (!nodeIds || nodeIds.length === 0) {
        renderContext.interactionActiveNodeIds = undefined
        return
      }

      // Keep interaction ids de-duplicated so active/base split remains deterministic.
      renderContext.interactionActiveNodeIds = Array.from(new Set(nodeIds))
    },
        /**
     * Handles setOverlayNodes.
     * @param nodes nodes parameter.
     */
setOverlayNodes(nodes) {
      if (!nodes || nodes.length === 0) {
        renderContext.overlayNodes = undefined
        return
      }

      // Keep one immutable snapshot so render loop reads stable overlay data.
      renderContext.overlayNodes = [...nodes]
    },
        /**
     * Handles setResourceLoader.
     * @param loader loader parameter.
     */
setResourceLoader(loader) {
      renderContext.loader = loader
    },
        /**
     * Handles setTextShaper.
     * @param textShaper textShaper parameter.
     */
setTextShaper(textShaper) {
      renderContext.textShaper = textShaper
    },
        /**
     * Handles markDirtyBounds.
     * @param bounds Bounds data.
     * @param zoomLevel zoomLevel parameter.
     */
markDirtyBounds(bounds, zoomLevel) {
      if (bounds.width <= 0 || bounds.height <= 0) {
        return
      }

      renderContext.dirtyRegions = (renderContext.dirtyRegions ?? []).concat({
        zoomLevel,
        bounds,
      })
    },
    renderFrame: async () => {
      cameraAnimationController.tick({
        now: clock.now(),
        dt: 0,
      })
      const stats = await loop.renderOnce()
      // Clear dirty regions after each render so they don't stale-accumulate
      renderContext.dirtyRegions = undefined
      return latestRenderStats ?? stats
    },
    start() {
      loop.start()
    },
    stop() {
      loop.stop()
    },
    isRunning() {
      return loop.isRunning()
    },
    getDiagnostics() {
      return {
        backend: renderer.capabilities.backend,
        renderStats: latestRenderStats,
        pixelRatio,
        outputPixelRatio,
        scene: store.getDiagnostics(),
        framePlan: latestFramePlan,
        hitPlan: latestHitPlan,
        shortlist: {
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
        cameraAnimation: {
          active: cameraAnimationState.active,
          cachePreviewOnly: cameraAnimationState.cachePreviewOnly,
          previewHitCount: cameraAnimationState.previewHitCount,
          previewMissCount: cameraAnimationState.previewMissCount,
        },
        strategy: {
          phase: latestStrategyPhase,
          interactionActive: latestStrategyInteractionActive,
          quality: renderContext.quality,
          lastInteractionKind,
          lastInteractionElapsedMs: Math.max(0, clock.now() - lastInteractionAtMs),
        },
        predictor: {
          directionX: latestInteractionPredictor.directionX,
          directionY: latestInteractionPredictor.directionY,
          speedPxPerSec: latestInteractionPredictor.speedPxPerSec,
          confidence: latestInteractionPredictor.confidence,
        },
        budget: {
          pressure: latestBudgetPressure,
          drawSubmitBudgetMs: renderContext.frameBudget?.drawSubmitBudgetMs ?? 0,
          textureUploadBudgetBytes: renderContext.frameBudget?.textureUploadBudgetBytes ?? 0,
          textureUploadTotalBudgetBytes: renderContext.frameBudget?.textureUploadTotalBudgetBytes ?? 0,
          imageTextureUploadMaxCount: renderContext.frameBudget?.imageTextureUploadMaxCount ?? 0,
          textTextureUploadMaxCount: renderContext.frameBudget?.textTextureUploadMaxCount ?? 0,
          tilePreloadBudgetMs: renderContext.frameBudget?.tilePreloadBudgetMs ?? 0,
          tilePreloadMaxUploads: renderContext.frameBudget?.tilePreloadMaxUploads ?? 0,
          overlayPassBudgetMs: renderContext.frameBudget?.overlayPassBudgetMs ?? 0,
        },
        strategySnapshot: {
          lane: latestStrategyPhase,
          budgetPressure: latestBudgetPressure,
          fallbackReason: latestRenderStats?.cacheFallbackReason ?? null,
          predictorConfidence: latestInteractionPredictor.confidence,
        },
        settleSharpness: {
          pending: settleSharpnessState.pending,
          remainingDeadlineMs: settleSharpnessState.pending
            ? Math.max(0, settleSharpnessState.deadlineAtMs - clock.now())
            : 0,
          forceSharpFrame: settleSharpnessState.forceSharpFrame,
          metCount: settleSharpnessState.metCount,
          missCount: settleSharpnessState.missCount,
          lastLatencyMs: settleSharpnessState.lastLatencyMs,
          lastMissLatencyMs: settleSharpnessState.lastMissLatencyMs,
          highZoomTextSlaCheckedCount: settleSharpnessState.highZoomTextSlaCheckedCount,
          highZoomTextSlaViolationCount: settleSharpnessState.highZoomTextSlaViolationCount,
        },
        performanceGate: resolveEnginePerformanceGateStatus(latestRenderStats),
      }
    },
    dispose() {
      loop.stop()
      cameraAnimationController.stopAll()
      interactionPredictor.reset()
      renderer.dispose?.()
    },
  }
}

// Resolve exact-hit candidate budget so interaction and pressure tiers can cap
// expensive geometry checks without changing public hit-test call signatures.
/**
 * Handles resolveAdaptiveHitTestExactBudget.
 * @param options Options object for this operation.
 */
function resolveAdaptiveHitTestExactBudget(options: {
  budgetPressure: EngineFrameBudgetPressure
  interactionActive: boolean
}) {
  const HIGH_PRESSURE_INTERACTION_EXACT_BUDGET = 12
  const HIGH_PRESSURE_IDLE_EXACT_BUDGET = 16
  const MEDIUM_PRESSURE_INTERACTION_EXACT_BUDGET = 20
  const MEDIUM_PRESSURE_IDLE_EXACT_BUDGET = 28
  const LOW_PRESSURE_INTERACTION_EXACT_BUDGET = 36
  const LOW_PRESSURE_IDLE_EXACT_BUDGET = 48

  if (options.budgetPressure === 'high') {
    return options.interactionActive ? HIGH_PRESSURE_INTERACTION_EXACT_BUDGET : HIGH_PRESSURE_IDLE_EXACT_BUDGET
  }

  if (options.budgetPressure === 'medium') {
    return options.interactionActive ? MEDIUM_PRESSURE_INTERACTION_EXACT_BUDGET : MEDIUM_PRESSURE_IDLE_EXACT_BUDGET
  }

  return options.interactionActive ? LOW_PRESSURE_INTERACTION_EXACT_BUDGET : LOW_PRESSURE_IDLE_EXACT_BUDGET
}

