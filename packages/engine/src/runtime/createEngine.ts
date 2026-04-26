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

interface ResolvedEnginePerformanceOptions {
  culling: boolean
  lodConfig: EngineLodConfig | undefined
  tileConfig: EngineTileConfig | undefined
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

export interface EngineCameraAnimationOptions {
  durationMs?: number
  easing?: EngineEasingDefinition
  cachePreviewOnly?: boolean
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
  )
  const store = createEngineSceneStore({
    initialScene: options.initialScene,
  })
  const renderer = createWebGLEngineRenderer({
    canvas: options.canvas,
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
    scene: EngineSceneSnapshot,
    framePlan: EngineFramePlan,
    protectedNodeIds: readonly EngineNodeId[] | undefined,
  ) => {
    // Build a candidate set that includes ancestor groups so planner-side
    // group pruning can stay enabled without hiding leaf nodes on zoom.
    const mergedCandidateIdSet = new Set(framePlan.candidateNodeIds)
    if (protectedNodeIds && protectedNodeIds.length > 0) {
      // Keep currently active nodes in render planning even when coarse
      // viewport candidates are narrow.
      for (const nodeId of protectedNodeIds) {
        mergedCandidateIdSet.add(nodeId)
      }
    }

    const parentIdByNodeId = new Map<EngineNodeId, EngineNodeId>()
    const childIdsByGroupId = new Map<EngineNodeId, EngineNodeId[]>()
    const groupIdSet = new Set<EngineNodeId>()
    const collectParents = (
      nodes: readonly EngineRenderableNode[],
      parentId: EngineNodeId | null,
    ) => {
      for (const node of nodes) {
        if (parentId) {
          parentIdByNodeId.set(node.id, parentId)
        }

        if (node.type === 'group') {
          groupIdSet.add(node.id)
          // Track direct children so candidate groups can expand to descendant
          // leaves and avoid false negatives from coarse spatial shortlist ids.
          childIdsByGroupId.set(
            node.id,
            node.children.map((child) => child.id),
          )
          collectParents(node.children, node.id)
        }
      }
    }
    collectParents(scene.nodes, null)

    const seedIds = Array.from(mergedCandidateIdSet)
    for (const nodeId of seedIds) {
      let parentId = parentIdByNodeId.get(nodeId)
      while (parentId) {
        if (mergedCandidateIdSet.has(parentId)) {
          break
        }

        mergedCandidateIdSet.add(parentId)
        parentId = parentIdByNodeId.get(parentId)
      }
    }

    // Also expand from candidate groups downward because some spatial-index
    // frames can return container/group ids without all overlapping leaves.
    const groupQueue: EngineNodeId[] = []
    for (const nodeId of Array.from(mergedCandidateIdSet)) {
      if (groupIdSet.has(nodeId)) {
        groupQueue.push(nodeId)
      }
    }

    while (groupQueue.length > 0) {
      const groupId = groupQueue.pop()
      if (!groupId) {
        continue
      }

      const childIds = childIdsByGroupId.get(groupId)
      if (!childIds || childIds.length === 0) {
        continue
      }

      for (const childId of childIds) {
        if (mergedCandidateIdSet.has(childId)) {
          continue
        }

        mergedCandidateIdSet.add(childId)
        if (groupIdSet.has(childId)) {
          groupQueue.push(childId)
        }
      }
    }

    return Array.from(mergedCandidateIdSet)
  }

  const resolveViewportAnimationTarget = (target: EngineViewportOptions) => {
    return resolveEngineViewportState({
      viewportWidth: target.viewportWidth ?? viewport.viewportWidth,
      viewportHeight: target.viewportHeight ?? viewport.viewportHeight,
      offsetX: target.offsetX ?? viewport.offsetX,
      offsetY: target.offsetY ?? viewport.offsetY,
      scale: target.scale ?? viewport.scale,
    })
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
    const resolvedTarget = resolveViewportAnimationTarget(target)
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

function resolveEngineTileConfig(
  tileConfig: EngineTileConfig | undefined,
  overscan: EngineOverscanOptions | undefined,
) {
  if (!tileConfig || !overscan) {
    return tileConfig
  }

  // Merge top-level overscan knobs into tile config without changing any
  // unrelated tile-cache feature flags.
  return {
    ...tileConfig,
    overscanEnabled: overscan.enabled ?? tileConfig.overscanEnabled,
    overscanBorderPx: overscan.borderPx ?? tileConfig.overscanBorderPx,
  }
}

function resolveEnginePerformanceOptions(
  options: CreateEngineOptions,
): ResolvedEnginePerformanceOptions {
  const legacyCulling = options.culling
  const legacyLodConfig = options.lod ?? options.render?.lod
  const legacyTileConfig = options.render?.tileConfig
  const legacyOverscan = options.overscan
  const performance = options.performance

  // Default to all performance features enabled unless callers opt out.
  if (performance === undefined || performance === true) {
    return {
      culling: legacyCulling ?? true,
      lodConfig: legacyLodConfig ?? {enabled: true},
      tileConfig: resolveEngineTileConfig(
        legacyTileConfig ?? {enabled: true},
        legacyOverscan ?? {enabled: true},
      ),
    }
  }

  if (performance === false) {
    return {
      culling: false,
      lodConfig: {enabled: false},
      tileConfig: resolveEngineTileConfig(
        {enabled: false},
        {enabled: false},
      ),
    }
  }

  const culling = resolveEngineCullingEnabled(
    performance.culling,
    legacyCulling,
  )
  const lodConfig = resolveEngineLodConfig(
    performance.lod,
    legacyLodConfig,
  )
  const tileConfig = resolveEngineTileConfig(
    resolveEngineTileFeatureConfig(performance.tiles, legacyTileConfig),
    resolveEngineOverscanFeatureConfig(performance.overscan, legacyOverscan),
  )

  return {
    culling,
    lodConfig,
    tileConfig,
  }
}

function resolveEngineCullingEnabled(
  culling: EnginePerformanceOptionsObject['culling'],
  legacyCulling: boolean | undefined,
) {
  if (culling === undefined) {
    return legacyCulling ?? true
  }

  if (typeof culling === 'boolean') {
    return culling
  }

  return culling.enabled ?? legacyCulling ?? true
}

function resolveEngineLodConfig(
  lod: EnginePerformanceOptionsObject['lod'],
  legacyLodConfig: EngineLodConfig | undefined,
) {
  if (lod === undefined) {
    return legacyLodConfig ?? {enabled: true}
  }

  if (typeof lod === 'boolean') {
    return lod
      ? (legacyLodConfig ?? {enabled: true})
      : {enabled: false}
  }

  return {
    ...lod,
    enabled: lod.enabled ?? true,
  }
}

function resolveEngineTileFeatureConfig(
  tiles: EnginePerformanceOptionsObject['tiles'],
  legacyTileConfig: EngineTileConfig | undefined,
) {
  if (tiles === undefined) {
    return legacyTileConfig ?? {enabled: true}
  }

  if (typeof tiles === 'boolean') {
    return tiles
      ? (legacyTileConfig ?? {enabled: true})
      : {enabled: false}
  }

  return {
    ...tiles,
    enabled: tiles.enabled ?? true,
  }
}

function resolveEngineOverscanFeatureConfig(
  overscan: EnginePerformanceOptionsObject['overscan'],
  legacyOverscan: EngineOverscanOptions | undefined,
) {
  if (overscan === undefined) {
    return legacyOverscan ?? {enabled: true}
  }

  if (typeof overscan === 'boolean') {
    return overscan
      ? (legacyOverscan ?? {enabled: true})
      : {enabled: false}
  }

  return {
    ...overscan,
    enabled: overscan.enabled ?? true,
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
