import {
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
} from '../interaction/viewport.ts'
import { createWebGLEngineRenderer } from '../renderer/webgl.ts'
import type {
  EngineCanvasSurfaceFactory,
  EngineInteractionPreviewConfig,
  EngineRenderQuality,
  EngineRenderSurfaceSize,
  EngineRenderStats,
  EngineResourceLoader,
  EngineTextShaper,
} from '../renderer/types.ts'
import {
  createEngineSceneStore,
  type EngineSceneStoreDiagnostics,
  type EngineSceneStoreTransaction,
} from '../scene/store.ts'
import {
  type EngineFramePlan,
} from '../scene/framePlan.ts'
import {
  prepareEngineHitPlan,
  type EngineHitPlan,
} from '../scene/hitPlan.ts'
import type { EngineHitTestResult } from '../scene/hitTest.ts'
import type {
  EngineNodeId,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
} from '../scene/types.ts'
import type {
  EngineScenePatchApplyResult,
  EngineScenePatchBatch,
} from '../scene/patch.ts'
import { createSystemEngineClock, type EngineClock } from '../time/index.ts'
import { createEngineLoop, type EngineLoopController } from './createEngineLoop.ts'
import {
  resolveEnginePerformanceOptions,
  resolveEnginePixelRatio,
  resolveInitialViewport,
} from './createEngine/config.ts'
import {
  buildEngineFramePlan,
  buildEngineHitPlan,
  resolveEngineFramePlanSignature,
  resolveViewportAnimationTarget,
} from './createEngine/planning.ts'
import { resolveShortlistCandidateNodeIds } from './createEngine/shortlist.ts'
import type {
  EngineLodConfig,
  EngineTileConfig,
  EngineInitialRenderConfig,
} from '../index.ts'
import {
  createEngineAnimationController,
  type EngineEasingDefinition,
} from '../animation/index.ts'

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
  backend: 'webgl'
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
}

export interface Engine {
  loadScene(scene: EngineSceneSnapshot): EngineScenePatchApplyResult
  applyScenePatchBatch(batch: EngineScenePatchBatch): EngineScenePatchApplyResult
  transaction(
    run: (transaction: EngineSceneStoreTransaction) => void,
    options?: {revision?: string | number},
  ): EngineScenePatchApplyResult | null
  queryViewportCandidates(padding?: number): EngineNodeId[]
  queryPointCandidates(point: {x: number; y: number}, tolerance?: number): EngineNodeId[]
  prepareFramePlan(padding?: number): EngineFramePlan
  prepareHitPlan(point: {x: number; y: number}, tolerance?: number): EngineHitPlan
  query(bounds: EngineRect): EngineNodeId[]
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
  setDpr(dpr: number | 'auto', options?: {maxDpr?: number}): number
  setQuality(quality: EngineRenderQuality): void
  setInteractionPreview(config?: EngineInteractionPreviewConfig): void
  setProtectedNodeIds(nodeIds?: readonly EngineNodeId[]): void
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
 */
export function createEngine(options: CreateEngineOptions): Engine {
  // Resolve all performance knobs through one model so each capability can be
  // toggled independently while preserving legacy option compatibility.
  const resolvedPerformance = resolveEnginePerformanceOptions(options)
  const resolvedLodEnabled = resolvedPerformance.lodConfig?.enabled ?? false

  const ENABLE_FRAME_PLAN_SHORTLIST = options.render?.shortlist?.enabled ?? true
  const FRAME_PLAN_SHORTLIST_MIN_SCENE_NODES = Math.max(
    1,
    options.render?.shortlist?.minSceneNodes ?? 1500,
  )
  const FRAME_PLAN_SHORTLIST_RATIO_THRESHOLD = Math.min(
    1,
    Math.max(0, options.render?.shortlist?.ratioThreshold ?? 0.72),
  )
  const FRAME_PLAN_SHORTLIST_HYSTERESIS_RATIO = Math.min(
    0.3,
    Math.max(0, options.render?.shortlist?.hysteresisRatio ?? 0.06),
  )
  const FRAME_PLAN_SHORTLIST_STABLE_FRAME_COUNT = Math.max(
    1,
    Math.round(options.render?.shortlist?.stableFrameCount ?? 2),
  )
  let maxPixelRatio = options.render?.maxPixelRatio ?? 2
  let pixelRatio = resolveEnginePixelRatio(
    options.render?.dpr ?? options.render?.pixelRatio,
    maxPixelRatio,
    options.host?.resolvePixelRatio,
  )
  let outputPixelRatio = 1
  const store = createEngineSceneStore({
    initialScene: options.initialScene,
  })
  const renderer = createWebGLEngineRenderer({
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
  })
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
  let hostRenderQuality: EngineRenderQuality = renderContext.quality
  let hostInteractionPreviewConfig: EngineInteractionPreviewConfig | undefined =
    options.render?.interactionPreview
  const cameraAnimationController = createEngineAnimationController()
  const CAMERA_ANIMATION_ID = 'engine.camera.viewport'
  let cameraAnimationTarget: EngineCanvasViewportState | null = null
  const cameraAnimationState: EngineCameraAnimationState = {
    active: false,
    cachePreviewOnly: false,
    previewHitCount: 0,
    previewMissCount: 0,
  }

  const applyRenderQualityPolicy = () => {
    // Keep animation playback responsive by forcing interactive quality while
    // camera animation is active.
    renderContext.quality = cameraAnimationState.active
      ? 'interactive'
      : (renderContext.lodEnabled ? hostRenderQuality : 'full')
  }

  const applyInteractionPreviewPolicy = () => {
    if (cameraAnimationState.active && cameraAnimationState.cachePreviewOnly) {
      // Allow broad affine reuse during camera animation to maximize preview hits.
      renderer.setInteractionPreview?.({
        enabled: true,
        mode: 'interaction',
        cacheOnly: true,
        maxScaleStep: 8,
        maxTranslatePx: 100_000,
      })
      return
    }

    renderer.setInteractionPreview?.(hostInteractionPreviewConfig)
  }

  const stopCameraAnimationInternal = (commitTarget = true) => {
    cameraAnimationController.stop(CAMERA_ANIMATION_ID)
    if (commitTarget && cameraAnimationTarget) {
      viewport = cameraAnimationTarget
    }
    cameraAnimationTarget = null
    cameraAnimationState.active = false
    cameraAnimationState.cachePreviewOnly = false
    applyRenderQualityPolicy()
    applyInteractionPreviewPolicy()
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
    applyRenderQualityPolicy()
    applyInteractionPreviewPolicy()

    cameraAnimationController.start<EngineCanvasViewportState>({
      id: CAMERA_ANIMATION_ID,
      from: viewport,
      to: resolvedTarget,
      duration: Math.max(0, animationOptions?.durationMs ?? 110),
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

  const handleRenderStats = (stats: EngineRenderStats) => {
    if (cameraAnimationState.active) {
      cameraAnimationState.previewHitCount += stats.l0PreviewHitCount ?? 0
      cameraAnimationState.previewMissCount += stats.l0PreviewMissCount ?? 0
    }

    const enrichedStats: EngineRenderStats = {
      ...stats,
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
      if (ENABLE_FRAME_PLAN_SHORTLIST) {
          const framePlanSignature = resolveEngineFramePlanSignature(scene, viewport)
        if (!latestFramePlan || latestFramePlanSignature !== framePlanSignature) {
          latestFramePlan = buildEngineFramePlan(scene, viewport, (bounds) => store.queryCandidates(bounds))
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
    loadScene(scene) {
      return store.loadScene(scene)
    },
    applyScenePatchBatch(batch) {
      return store.applyScenePatchBatch(batch)
    },
    transaction(run, transactionOptions) {
      return store.transaction(run, transactionOptions)
    },
    // Keep viewport candidate collection in the engine facade so callers do
    // not need to duplicate viewport-to-world bounds conversion logic.
    queryViewportCandidates(padding = 0) {
      return store.queryCandidates({
        x: -viewport.offsetX - padding,
        y: -viewport.offsetY - padding,
        width: viewport.viewportWidth / viewport.scale + padding * 2,
        height: viewport.viewportHeight / viewport.scale + padding * 2,
      })
    },
    queryPointCandidates(point, tolerance) {
      return store.queryPointCandidates(point, tolerance)
    },
    prepareFramePlan(padding = 0) {
      const scene = store.getSnapshot()
      latestFramePlan = buildEngineFramePlan(scene, viewport, (bounds) => store.queryCandidates(bounds), padding)
      latestFramePlanSignature = resolveEngineFramePlanSignature(scene, viewport, padding)
      return latestFramePlan
    },
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
    query(bounds) {
      return store.queryCandidates(bounds)
    },
    hitTest(point, tolerance) {
      const resolvedTolerance = tolerance ?? 0
      // Reuse one exact-hit pass for both the public result and diagnostics so
      // hit planning does not duplicate the execution cost it is measuring.
      const hitSummary = store.hitTestAllWithSummary(point, resolvedTolerance)
      const hits = hitSummary.hits
      latestHitPlan = prepareEngineHitPlan({
        scene: store.getSnapshot(),
        point,
        tolerance: resolvedTolerance,
        hits,
        exactCheckCount: hitSummary.exactCheckCount,
        queryPointCandidates: (queryPoint: {x: number; y: number}, queryTolerance?: number) => store.queryPointCandidates(queryPoint, queryTolerance),
      })
      return hits[0] ?? null
    },
    getNode(nodeId) {
      return store.getNode(nodeId)
    },
    getSnapshot() {
      return store.getSnapshot()
    },
    setViewport(next) {
      stopCameraAnimationInternal(false)
      viewport = resolveEngineViewportState({
        viewportWidth: next.viewportWidth ?? viewport.viewportWidth,
        viewportHeight: next.viewportHeight ?? viewport.viewportHeight,
        offsetX: next.offsetX ?? viewport.offsetX,
        offsetY: next.offsetY ?? viewport.offsetY,
        scale: next.scale ?? viewport.scale,
      })
      return viewport
    },
    panBy(deltaX, deltaY) {
      stopCameraAnimationInternal(false)
      viewport = panEngineViewportState(viewport, deltaX, deltaY)
      return viewport
    },
    zoomTo(scale, anchor) {
      stopCameraAnimationInternal(false)
      viewport = zoomEngineViewportState(viewport, scale, anchor)
      return viewport
    },
    startCameraAnimation(target, animationOptions) {
      startCameraAnimationInternal(target, animationOptions)
    },
    updateCameraAnimation(target, animationOptions) {
      // Updates restart from the current viewport to keep pan/zoom targets
      // responsive to high-frequency input streams.
      startCameraAnimationInternal(target, animationOptions)
    },
    stopCameraAnimation(stopOptions) {
      stopCameraAnimationInternal(stopOptions?.commitTarget ?? true)
    },
    resize(size) {
      return applyResizeSurface(size)
    },
    setDpr(nextDpr, dprOptions) {
      if (typeof dprOptions?.maxDpr === 'number' && Number.isFinite(dprOptions.maxDpr) && dprOptions.maxDpr > 0) {
        maxPixelRatio = dprOptions.maxDpr
      }

      // Resolve auto-DPR through host injection so engine never reaches into window.
      pixelRatio = resolveEnginePixelRatio(nextDpr, maxPixelRatio, options.host?.resolvePixelRatio)
      renderContext.pixelRatio = pixelRatio
      return pixelRatio
    },
    setQuality(quality) {
      hostRenderQuality = quality
      // LOD-disabled mode keeps full-detail rendering while preserving
      // non-LOD optimization features (culling, shortlist, tile cache).
      applyRenderQualityPolicy()
    },
    setInteractionPreview(config) {
      hostInteractionPreviewConfig = config
      applyInteractionPreviewPolicy()
    },
    setProtectedNodeIds(nodeIds) {
      if (!nodeIds || nodeIds.length === 0) {
        renderContext.protectedNodeIds = undefined
        return
      }

      // Keep protected ids de-duplicated and stable for planner-side guards.
      renderContext.protectedNodeIds = Array.from(new Set(nodeIds))
    },
    setResourceLoader(loader) {
      renderContext.loader = loader
    },
    setTextShaper(textShaper) {
      renderContext.textShaper = textShaper
    },
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
        backend: 'webgl',
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
      }
    },
    dispose() {
      loop.stop()
      cameraAnimationController.stopAll()
      renderer.dispose?.()
    },
  }
}

