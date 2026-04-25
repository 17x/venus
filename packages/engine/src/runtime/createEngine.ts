import {
  DEFAULT_ENGINE_VIEWPORT,
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
} from '../interaction/viewport.ts'
import { createWebGLEngineRenderer } from '../renderer/webgl.ts'
import type {
  EngineInteractionPreviewConfig,
  EngineRenderQuality,
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
  prepareEngineFramePlan,
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
import type {
  EngineLodConfig,
  EngineTileConfig,
  EngineInitialRenderConfig,
} from '../index.ts'

interface EnginePerformanceOptions {
  culling?: boolean
  lod?: boolean
}

interface EngineRenderOptions {
  quality?: EngineRenderQuality
  webglClearColor?: readonly [number, number, number, number]
  // Short alias for pixel ratio config.
  dpr?: number | 'auto'
  // `auto` resolves from `window.devicePixelRatio` when available.
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

interface EngineViewportOptions {
  viewportWidth?: number
  viewportHeight?: number
  offsetX?: number
  offsetY?: number
  scale?: number
}

export interface CreateEngineOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas
  initialScene?: EngineSceneSnapshot
  viewport?: EngineViewportOptions
  performance?: EnginePerformanceOptions
  render?: EngineRenderOptions
  resource?: EngineResourceOptions
  debug?: EngineDebugOptions
  clock?: EngineClock
}

export interface EngineRuntimeDiagnostics {
  backend: 'webgl'
  renderStats: EngineRenderStats | null
  pixelRatio: number
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
  resize(width: number, height: number): EngineCanvasViewportState
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
  )
  const store = createEngineSceneStore({
    initialScene: options.initialScene,
  })
  const renderer = createWebGLEngineRenderer({
    canvas: options.canvas,
    enableCulling: options.performance?.culling,
    clearColor: options.render?.webglClearColor,
    antialias: options.render?.webglAntialias ?? true,
    modelCompleteComposite: options.render?.modelCompleteComposite ?? true,
    lod: options.render?.lod,
    tileConfig: options.render?.tileConfig,
    initialRender: options.render?.initialRender,
    interactionPreview: options.render?.interactionPreview,
  })
  const renderContext: {
    quality: EngineRenderQuality
    pixelRatio: number
    loader?: EngineResourceLoader
    textShaper?: EngineTextShaper
    dirtyRegions?: Array<{zoomLevel?: number; bounds: EngineRect}>
    framePlanCandidateIds?: readonly EngineNodeId[]
    framePlanVersion?: number
    protectedNodeIds?: readonly EngineNodeId[]
  } = {
    quality: options.render?.quality ?? 'full',
    pixelRatio,
    loader: options.resource?.loader,
    textShaper: options.resource?.textShaper,
  }
  const clock = options.clock ?? createSystemEngineClock()
  let viewport = resolveInitialViewport(options.canvas, options.viewport)
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

  // Keep frame-plan construction centralized so diagnostics and future
  // planner-facing APIs use the same viewport candidate query contract.
  const buildFramePlan = (scene: ReturnType<typeof store.getSnapshot>, padding = 0) => prepareEngineFramePlan({
    scene,
    viewport,
    padding,
    queryCandidates: (bounds) => store.queryCandidates(bounds),
  })
  const resolveFramePlanSignature = (
    scene: ReturnType<typeof store.getSnapshot>,
    padding = 0,
  ) => {
    return [
      scene.revision,
      scene.metadata?.planVersion ?? 0,
      padding,
      viewport.viewportWidth,
      viewport.viewportHeight,
      viewport.offsetX,
      viewport.offsetY,
      viewport.scale,
    ].join(':')
  }
  // Build point shortlist diagnostics from the same coarse query surface the
  // future hit planner will reuse.
  const buildHitPlan = (point: {x: number; y: number}, tolerance = 0) => prepareEngineHitPlan({
    scene: store.getSnapshot(),
    point,
    tolerance,
    queryPointCandidates: (queryPoint, queryTolerance) => store.queryPointCandidates(queryPoint, queryTolerance),
    hitTestAll: (queryPoint, queryTolerance) => store.hitTestAll(queryPoint, queryTolerance),
  })
  const resolveShortlistCandidateNodeIds = (
    framePlan: EngineFramePlan,
    protectedNodeIds: readonly EngineNodeId[] | undefined,
  ) => {
    const baseCandidateIds = framePlan.candidateNodeIds
    if (!protectedNodeIds || protectedNodeIds.length === 0) {
      return baseCandidateIds
    }

    // Keep currently active nodes in render planning even when coarse
    // viewport candidates are narrow, so editing/selection visuals do not
    // disappear from planner-side pruning.
    const mergedCandidateIdSet = new Set(baseCandidateIds)
    for (const nodeId of protectedNodeIds) {
      mergedCandidateIdSet.add(nodeId)
    }

    return Array.from(mergedCandidateIdSet)
  }

  const loop: EngineLoopController = createEngineLoop({
    clock,
    renderer,
    resolveFrame: () => {
      const scene = store.getSnapshot()
      if (ENABLE_FRAME_PLAN_SHORTLIST) {
        const framePlanSignature = resolveFramePlanSignature(scene)
        if (!latestFramePlan || latestFramePlanSignature !== framePlanSignature) {
          latestFramePlan = buildFramePlan(scene)
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
    onStats: (stats) => {
      latestRenderStats = stats
      options.debug?.onStats?.(stats)
    },
  })

  // Keep renderer and viewport dimensions in sync so callers can just pass the
  // engine canvas once and then rely on `resize(...)`.
  if (renderer.resize) {
    renderer.resize(
      Math.max(1, Math.round(viewport.viewportWidth * pixelRatio)),
      Math.max(1, Math.round(viewport.viewportHeight * pixelRatio)),
    )
  }

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
      latestFramePlan = buildFramePlan(scene, padding)
      latestFramePlanSignature = resolveFramePlanSignature(scene, padding)
      return latestFramePlan
    },
    prepareHitPlan(point, tolerance = 0) {
      latestHitPlan = buildHitPlan(point, tolerance)
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
        queryPointCandidates: (queryPoint, queryTolerance) => store.queryPointCandidates(queryPoint, queryTolerance),
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
      viewport = panEngineViewportState(viewport, deltaX, deltaY)
      return viewport
    },
    zoomTo(scale, anchor) {
      viewport = zoomEngineViewportState(viewport, scale, anchor)
      return viewport
    },
    resize(width, height) {
      if (renderer.resize) {
        renderer.resize(
          Math.max(1, Math.round(width * pixelRatio)),
          Math.max(1, Math.round(height * pixelRatio)),
        )
      }
      viewport = resolveEngineViewportState({
        viewportWidth: width,
        viewportHeight: height,
        offsetX: viewport.offsetX,
        offsetY: viewport.offsetY,
        scale: viewport.scale,
      })
      return viewport
    },
    setDpr(nextDpr, dprOptions) {
      if (typeof dprOptions?.maxDpr === 'number' && Number.isFinite(dprOptions.maxDpr) && dprOptions.maxDpr > 0) {
        maxPixelRatio = dprOptions.maxDpr
      }

      pixelRatio = resolveEnginePixelRatio(nextDpr, maxPixelRatio)
      renderContext.pixelRatio = pixelRatio
      if (renderer.resize) {
        renderer.resize(
          Math.max(1, Math.round(viewport.viewportWidth * pixelRatio)),
          Math.max(1, Math.round(viewport.viewportHeight * pixelRatio)),
        )
      }
      return pixelRatio
    },
    setQuality(quality) {
      renderContext.quality = quality
    },
    setInteractionPreview(config) {
      renderer.setInteractionPreview?.(config)
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
      const stats = await loop.renderOnce()
      latestRenderStats = stats
      // Clear dirty regions after each render so they don't stale-accumulate
      renderContext.dirtyRegions = undefined
      return stats
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
      }
    },
    dispose() {
      loop.stop()
      renderer.dispose?.()
    },
  }
}

function resolveEnginePixelRatio(
  configured: number | 'auto' | undefined,
  maxPixelRatio: number,
) {
  if (typeof configured === 'number' && Number.isFinite(configured) && configured > 0) {
    return Math.min(configured, maxPixelRatio)
  }

  const auto = resolveSystemPixelRatio()
  return Math.min(auto, maxPixelRatio)
}

function resolveSystemPixelRatio() {
  if (typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0) {
    return window.devicePixelRatio
  }

  return 1
}

function resolveInitialViewport(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  next?: EngineViewportOptions,
): EngineCanvasViewportState {
  return resolveEngineViewportState({
    viewportWidth: next?.viewportWidth ?? canvas.width ?? 0,
    viewportHeight: next?.viewportHeight ?? canvas.height ?? 0,
    offsetX: next?.offsetX ?? DEFAULT_ENGINE_VIEWPORT.offsetX,
    offsetY: next?.offsetY ?? DEFAULT_ENGINE_VIEWPORT.offsetY,
    scale: next?.scale ?? DEFAULT_ENGINE_VIEWPORT.scale,
  })
}
