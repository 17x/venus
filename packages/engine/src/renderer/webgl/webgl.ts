/**
 * Renderer/WebGL backend orchestration module.
 * Owns frame-level WebGL render lifecycle, fallback sequencing, and backend state.
 * Does not own scene storage contracts or product-level interaction policy.
 */
import type {
  EngineCanvasSurfaceFactory,
  EngineFrameBudget,
  EngineInteractionPreviewConfig,
  EngineRenderFrame,
  EngineRenderer,
} from '../types/index.ts'
import { createCanvas2DEngineRenderer } from '../canvas2d/canvas2d.ts'
import { prepareEngineRenderPlan } from '../plan/index.ts'
import { prepareEngineRenderInstanceView } from '../instances/instances.ts'
import {
  compileEngineWebGLPacketPlan,
  createViewportMatrixForRender,
  createWebGLQuadPipeline,
  disposeWebGLQuadPipeline,
  drawWebGLPacket,
  resolveWebGLContext,
} from './core/index.ts'
import type { EngineTileConfig } from '../tileManager/index.ts'
import type { EngineLodConfig } from '../../interaction/lodConfig.ts'
import type { EngineInitialRenderConfig } from '../initialRender/index.ts'
import { EngineInitialRenderController } from '../initialRender/index.ts'
import {
  createEngineWebGLResourceBudgetTracker,
  MAX_IMAGE_TEXTURE_UPLOADS_PER_FRAME,
  MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME,
  canReuseInteractiveTextTexture,
  canReuseTextTexture,
  countPendingImageTextureEstimate,
  resolveImageTexture,
  resolvePacketTextureSourceRect,
  resolveTextCacheKey,
  resolveTextRasterScale,
  copyCanvasRegion,
  createModelSurface,
  drawInteractiveTextFallback,
  resolveCachedTextureBytes,
  shouldSkipTextPlaceholderPacket,
  disposeCachedTextures,
  disposeEvictedTextures,
  pruneTextCache,
  shouldBypassTileCompositorForFrame,
  shouldSkipInteractiveTinyPacket,
  shouldSkipOverviewImagePacket,
  type CachedTextureEntry,
  type ImageUploadBudgetState,
} from './runtime/index.ts'
import { resolveEngineZoomPerformanceConfig } from '../zoomPerformance/index.ts'
import {
  drawCompositeTextureFrame,
  resolveCompositeSnapshotPixelRatio,
} from './preview/index.ts'
import { drawModelSurfaceAsTiles } from './tiles/index.ts'
import {
  createWebGLLodCapability,
  createWebGLSnapshotCapability,
  createWebGLTileCacheCapability,
  createWebGLTileQueueCapability,
} from './capabilities/index.ts'
import {
  resolvePredictiveOverscanCssPx,
  resolvePredictivePreloadRing,
} from '../interactionPredictiveTiles/index.ts'
import {
  ENGINE_RENDER_FALLBACK_REASON,
  type EngineRenderFallbackReason,
} from '../fallbackTaxonomy/index.ts'
import {drawEngineOverlayNodes, type EngineOverlayDrawNode} from '../../interaction/overlayCanvas.ts'

interface WebGLEngineRendererOptions {
  id?: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface']
  enableCulling?: boolean
  clearColor?: readonly [number, number, number, number]
  antialias?: boolean
  modelCompleteComposite?: boolean
  // New: LOD configuration
  lod?: EngineLodConfig
  // New: Tile caching configuration
  tileConfig?: EngineTileConfig
  // New: Initial render optimization
  initialRender?: EngineInitialRenderConfig
  // Optional: interactive affine preview from last composite frame.
  interactionPreview?: EngineInteractionPreviewConfig
}

const BYTES_PER_KIBIBYTE = 1024
const DEFAULT_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB = 24
const DEFAULT_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = DEFAULT_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE
const TILE_PRELOAD_RING_DEFAULT = 1
const TILE_SIZE_CSS_FALLBACK = 512
const TILE_CACHE_SIZE_MIN = 64
const TEXTURE_BYTES_PER_PIXEL_RGBA = 4
const HIGH_ZOOM_TEXT_SLA_SCALE = 2
const INTERACTIVE_CRITICAL_PACKET_MAX_SCREEN_AREA_PX = 48_000

const DEFAULT_FRAME_BUDGET: EngineFrameBudget = {
  drawSubmitBudgetMs: 28,
  textureUploadBudgetBytes: MAX_IMAGE_TEXTURE_UPLOAD_BYTES_PER_FRAME,
  textureUploadTotalBudgetBytes: DEFAULT_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
  imageTextureUploadMaxCount: MAX_IMAGE_TEXTURE_UPLOADS_PER_FRAME,
  textTextureUploadMaxCount: 4,
  tilePreloadBudgetMs: 10,
  tilePreloadMaxUploads: 8,
  overlayPassBudgetMs: 2,
}

/**
 * Resolve renderer-safe frame budget values from runtime-provided context data.
  * @param frame Current render frame.
*/
function resolveFrameBudget(frame: EngineRenderFrame): EngineFrameBudget {
  const budget = frame.context.frameBudget
  if (!budget) {
    return DEFAULT_FRAME_BUDGET
  }

  return {
    drawSubmitBudgetMs: Math.max(0, budget.drawSubmitBudgetMs),
    textureUploadBudgetBytes: Math.max(0, budget.textureUploadBudgetBytes),
    textureUploadTotalBudgetBytes: Math.max(0, budget.textureUploadTotalBudgetBytes),
    imageTextureUploadMaxCount: Math.max(0, budget.imageTextureUploadMaxCount),
    textTextureUploadMaxCount: Math.max(0, budget.textTextureUploadMaxCount),
    tilePreloadBudgetMs: Math.max(0, budget.tilePreloadBudgetMs),
    tilePreloadMaxUploads: Math.max(0, budget.tilePreloadMaxUploads),
    overlayPassBudgetMs: Math.max(0, budget.overlayPassBudgetMs),
  }
}

/**
 * Resolves effective visible element count, preferring layered bridge commands when available.
  * @param frame Current render frame.
*/
function resolveVisibleElementCountForLod(frame: EngineRenderFrame): number {
  const candidateIds = frame.context.framePlanCandidateIds
  if (candidateIds && candidateIds.length > 0) {
    return candidateIds.length
  }

  const layeredRender = frame.context.layeredRender
  if (!layeredRender) {
    return frame.scene.nodes.length
  }

  // Keep overlay commands out of LOD visible-count heuristics to avoid
  // inflating scene visibility with runtime UI overlays.
  return Math.max(0, layeredRender.base.length + layeredRender.active.length)
}

/**
 * Resolves whether one packet overlaps any runtime dirty region.
 * @param packetBounds Packet world bounds.
 * @param dirtyRegions Runtime dirty-region payload.
 */
function doesPacketIntersectDirtyRegions(
  packetBounds: {x: number; y: number; width: number; height: number},
  dirtyRegions: readonly {
    zoomLevel?: number
    previousBounds?: {x: number; y: number; width: number; height: number}
    bounds: {x: number; y: number; width: number; height: number}
  }[],
): boolean {
  const packetMinX = packetBounds.x
  const packetMinY = packetBounds.y
  const packetMaxX = packetBounds.x + packetBounds.width
  const packetMaxY = packetBounds.y + packetBounds.height

  for (const dirtyRegion of dirtyRegions) {
    const dirtyBounds = dirtyRegion.bounds
    const dirtyMinX = dirtyBounds.x
    const dirtyMinY = dirtyBounds.y
    const dirtyMaxX = dirtyBounds.x + dirtyBounds.width
    const dirtyMaxY = dirtyBounds.y + dirtyBounds.height
    if (
      packetMaxX >= dirtyMinX &&
      packetMinX <= dirtyMaxX &&
      packetMaxY >= dirtyMinY &&
      packetMinY <= dirtyMaxY
    ) {
      return true
    }
  }

  return false
}

/**
 * Resolves whether one packet should bypass interaction upload freeze.
 * @param frame Current render frame.
 * @param packet Packet payload from WebGL packet plan.
 * @param activeLayerPass Whether packet belongs to active interaction layer.
 */
function shouldPrioritizeInteractiveTexturePacket(
  frame: EngineRenderFrame,
  packet: {
    kind: 'shape' | 'text' | 'image'
    nodeId: string
    worldBounds: {x: number; y: number; width: number; height: number}
  },
  activeLayerPass: boolean,
): boolean {
  if (activeLayerPass) {
    return true
  }

  // Keep directly interacted/protected nodes legible during pan/zoom feedback.
  if (frame.context.interactionActiveNodeIds?.includes(packet.nodeId)) {
    return true
  }
  if (frame.context.protectedNodeIds?.includes(packet.nodeId)) {
    return true
  }

  if (packet.kind === 'text' && frame.viewport.scale >= HIGH_ZOOM_TEXT_SLA_SCALE) {
    return true
  }

  if (packet.kind === 'image') {
    const scale = Math.max(0, frame.viewport.scale)
    const area = Math.max(0, packet.worldBounds.width * scale) * Math.max(0, packet.worldBounds.height * scale)
    return area <= INTERACTIVE_CRITICAL_PACKET_MAX_SCREEN_AREA_PX
  }

  return false
}

/**
 * Built-in WebGL renderer entry for engine standalone/runtime integrations.
 *
 * Current implementation is the primary engine backend and intentionally
 * reuses shared planning/packet prep while keeping Canvas2D limited to
 * auxiliary model-complete and offscreen helper work.
  * @param options Options object for this operation.
*/
export function createWebGLEngineRenderer(
  options: WebGLEngineRendererOptions,
): EngineRenderer {
  const context = resolveWebGLContext(options.canvas, {
    antialias: options.antialias ?? true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  })
  if (!context) {
    throw new Error('webgl context is required for createWebGLEngineRenderer')
  }

  const clearColor = options.clearColor ?? [0, 0, 0, 0]
  const enableCulling = options.enableCulling ?? true
  const lodEnabled = options.lod?.enabled ?? false
  // Prefer packet path by default for runtime responsiveness. Model-complete
  // composite remains opt-in for fidelity-focused scenarios.
  const modelCompleteComposite = options.modelCompleteComposite ?? false
  const resourceBudget = createEngineWebGLResourceBudgetTracker()
  const pipeline = createWebGLQuadPipeline(context)
  const imageCache = new Map<string, CachedTextureEntry>()
  const textCache = new Map<string, CachedTextureEntry>()

  // Tile cache capability owns cache lifecycle and transition memory.
  const tileCacheCapability = createWebGLTileCacheCapability({
    tileConfig: options.tileConfig,
  })
  tileCacheCapability.create()
  const tileCache = tileCacheCapability.read({kind: 'cache'})
  const resolvedZoomPerformance = resolveEngineZoomPerformanceConfig(options.tileConfig?.zoomPerformance)
  // LOD capability centralizes interaction quality and base-scene mode resolution.
  const lodCapability = createWebGLLodCapability({
    lodEnabled,
    zoomStrategy: resolvedZoomPerformance.strategy,
  })
  lodCapability.create()
  // Tile queue capability owns scheduling lifecycle and cancel policy state.
  const tileQueueCapability = tileCache
    ? createWebGLTileQueueCapability({tileCache})
    : null
  const tileTextures = new Map<number, WebGLTexture>()
  let nextTileTextureId = 1

  // Initialize initial render controller (optional)
  const initialRenderController = options.initialRender
    ? new EngineInitialRenderController(options.initialRender)
    : null
  // Track whether the initial render sequence has been kicked off
  let initialRenderStarted = false

  const modelSurface = createModelSurface(1, 1, options.createCanvasSurface)
  if (!modelSurface) {
    throw new Error('webgl model-complete surface allocation failed')
  }
  const textCropSurface = createModelSurface(1, 1, options.createCanvasSurface)
  if (!textCropSurface) {
    throw new Error('webgl text crop surface allocation failed')
  }
  const modelRenderer = createCanvas2DEngineRenderer({
    id: `${options.id ?? 'engine.renderer.webgl'}.model-canvas2d`,
    canvas: modelSurface.canvas,
    createCanvasSurface: options.createCanvasSurface,
    enableCulling,
    clearColor: 'transparent',
    imageSmoothing: true,
    imageSmoothingQuality: 'high',
  })
  const compositeTexture = context.createTexture()
  if (!compositeTexture) {
    throw new Error('webgl composite texture allocation failed')
  }
  context.bindTexture(context.TEXTURE_2D, compositeTexture)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
  const overlaySurface = createModelSurface(1, 1, options.createCanvasSurface)
  const overlayTexture = context.createTexture()
  if (overlayTexture) {
    context.bindTexture(context.TEXTURE_2D, overlayTexture)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
  }
  const snapshotCapability = createWebGLSnapshotCapability({
    context,
    pipeline,
    texture: compositeTexture,
    initialConfig: options.interactionPreview,
  })

  return {
    id: options.id ?? 'engine.renderer.webgl',
    capabilities: {
      backend: 'webgl',
      textRuns: modelCompleteComposite,
      imageClip: modelCompleteComposite,
      culling: enableCulling,
      lod: lodEnabled,
    },
    resize: (size) => {
      // Keep main canvas ownership in the app; renderer only consumes the
      // provided output size and updates GPU state from that contract.
      modelRenderer.resize?.(size)
      context.viewport(0, 0, size.outputWidth, size.outputHeight)
    },
    setInteractionPreview: (config) => {
      snapshotCapability.update({config})
    },
    /**
     * Renders one frame through snapshot/tile/packet paths while honoring active-layer packet routing.
     * @param frame Engine frame payload.
     */
    render: async (frame: EngineRenderFrame) => {
      const startAt = performance.now()
      const visibleElementCountForLod = resolveVisibleElementCountForLod(frame)
      const tileCacheEnabled = tileCacheCapability.read({kind: 'enabled'})
      // Resolve one LOD state snapshot per frame so all return paths report consistent state.
      const lodState = lodCapability.read({
        frame,
        tileCacheEnabled,
        visibleElementCount: visibleElementCountForLod,
      })
      const activeLayerNodeIdSet = new Set(frame.context.interactionActiveNodeIds ?? [])
      const activeLayerMaskEnabled = activeLayerNodeIdSet.size > 0
      const interactiveQuality = lodState.interactiveQuality
      const interactionActive = Boolean(frame.context.interactionActive)
      const interactionRenderLane = interactiveQuality || interactionActive
      const baseSceneRenderMode = lodState.baseSceneRenderMode
      // Engine WebGL renderer composes base scene first, then applies overlay pass.
      const tileCacheBaseSceneOnly = true
      let l0PreviewHitCount = 0
      let l0PreviewMissCount = 0
      let l1CompositeHitCount = 0
      let l1CompositeMissCount = 0
      let l2TileHitCount = 0
      let l2TileMissCount = 0
      let cacheFallbackReason: EngineRenderFallbackReason = ENGINE_RENDER_FALLBACK_REASON.NONE
      // Keep WebGL pipeline timing slices explicit for frame-time attribution.
      let webglPreviewReuseMs = 0
      let webglPreviewExecutionMode: 'affine-snapshot' | 'temporal-reprojection-required' = 'affine-snapshot'
      let webglPlanBuildMs = 0
      let webglTextureUploadMs = 0
      let webglDrawSubmitMs = 0
      let webglSnapshotCaptureMs = 0
      let webglModelRenderMs = 0
      let drawSubmitBudgetExceeded = false
      let textureUploadBudgetExceeded = false
      let overlayBudgetExceeded = false
      let highZoomTextSlaChecked = false
      let highZoomTextSlaViolationCount = 0
      // Track pan-phase schedule-vs-rebuild behavior for debug checklist Step 3.
      let panScheduleRequestCount = 0
      let tileSynchronousRebuildCount = 0
      const drawOverlayPass = (overlayFrame: EngineRenderFrame) => {
        const overlayNodes = (overlayFrame.context.overlayNodes ?? []) as readonly EngineOverlayDrawNode[]
        if (overlayNodes.length === 0 || !overlaySurface?.canvas || !overlayTexture) {
          return 0
        }
        const overlayBudgetMs = resolveFrameBudget(overlayFrame).overlayPassBudgetMs
        if (overlayBudgetMs <= 0) {
          // Budget-broker may suppress overlay pass under heavy pressure.
          overlayBudgetExceeded = true
          return 0
        }

        const overlayPassStart = performance.now()

        const overlayPixelRatio = overlayFrame.context.outputPixelRatio ?? overlayFrame.context.pixelRatio ?? 1
        const overlayWidth = Math.max(1, Math.round(overlayFrame.viewport.viewportWidth * overlayPixelRatio))
        const overlayHeight = Math.max(1, Math.round(overlayFrame.viewport.viewportHeight * overlayPixelRatio))

        // Keep overlay scratch surface dimensions aligned with render target.
        if (overlaySurface.canvas.width !== overlayWidth || overlaySurface.canvas.height !== overlayHeight) {
          overlaySurface.canvas.width = overlayWidth
          overlaySurface.canvas.height = overlayHeight
        }

        const overlayContext = overlaySurface.canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
        if (!overlayContext) {
          return 0
        }

        overlayContext.setTransform(1, 0, 0, 1, 0, 0)
        overlayContext.clearRect(0, 0, overlayWidth, overlayHeight)
        overlayContext.scale(overlayPixelRatio, overlayPixelRatio)
        drawEngineOverlayNodes({
          context: overlayContext as unknown as CanvasRenderingContext2D,
          worldToScreen: [...overlayFrame.viewport.matrix],
          nodes: [...overlayNodes],
        })

        const overlayUploadStart = performance.now()
        context.bindTexture(context.TEXTURE_2D, overlayTexture)
        context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
        context.texImage2D(
          context.TEXTURE_2D,
          0,
          context.RGBA,
          context.RGBA,
          context.UNSIGNED_BYTE,
          overlaySurface.canvas as unknown as TexImageSource,
        )
        webglTextureUploadMs += performance.now() - overlayUploadStart

        const safeScale = Math.max(Number.EPSILON, Math.abs(overlayFrame.viewport.scale))
        const overlayWorldBounds = {
          x: -overlayFrame.viewport.offsetX / safeScale,
          y: -overlayFrame.viewport.offsetY / safeScale,
          width: overlayFrame.viewport.viewportWidth / safeScale,
          height: overlayFrame.viewport.viewportHeight / safeScale,
        }
        const overlayDrawCount = drawWebGLPacket(
          context,
          pipeline,
          overlayFrame,
          overlayWorldBounds,
          [1, 1, 1, 1],
          1,
          overlayTexture,
        )
        if (performance.now() - overlayPassStart > overlayBudgetMs) {
          overlayBudgetExceeded = true
        }

        return overlayDrawCount
      }

      // Apply initial render DPR optimization if configured
      let effectiveFrame = frame
      if (initialRenderController) {
        // Kick off the progressive render sequence on the very first render
        if (!initialRenderStarted) {
          initialRenderStarted = true
          initialRenderController.beginInitialRender()
        }
        const dprForPhase = initialRenderController.getDprForPhase()
        if (dprForPhase !== 1.0) {
          // Apply low-DPR for preview phase
          effectiveFrame = {
            ...frame,
            context: {
              ...frame.context,
              pixelRatio: (frame.context.pixelRatio ?? 1) * dprForPhase,
            },
          }
        }
      }

      if (tileCache) {
        tileCacheCapability.update({
          kind: 'sync-pixel-ratio',
          pixelRatio: effectiveFrame.context.pixelRatio ?? 1,
        })
      }

      // Process dirty regions for incremental tile updates
      const dirtyRegionCount = effectiveFrame.context.dirtyRegions?.length ?? 0
      let dirtyTileCount = 0
      if (tileCache && effectiveFrame.context.dirtyRegions && effectiveFrame.context.dirtyRegions.length > 0) {
        dirtyTileCount = tileCacheCapability.update({
          kind: 'mark-dirty-regions',
          frame: effectiveFrame,
        })
      }
      const frameBudget = resolveFrameBudget(effectiveFrame)
      const frameBudgetPressure = effectiveFrame.context.frameBudgetPressure ?? 'low'
      const highZoomTextSlaScale = HIGH_ZOOM_TEXT_SLA_SCALE
      const predictorState = effectiveFrame.context.interactionPredictor
      const hasDirtyRegions = (effectiveFrame.context.dirtyRegions?.length ?? 0) > 0
      const highZoomInteractionActive =
        interactionActive && effectiveFrame.viewport.scale >= HIGH_ZOOM_TEXT_SLA_SCALE
      const shouldBypassSnapshotReuseForActiveLayer =
        activeLayerMaskEnabled && hasDirtyRegions
      const shouldBypassSnapshotReuseForHighZoomInteraction = highZoomInteractionActive
      const shouldBypassSnapshotReuse =
        shouldBypassSnapshotReuseForActiveLayer || shouldBypassSnapshotReuseForHighZoomInteraction

      // Prefer O(1) snapshot reprojection first so pan frames avoid plan/raster work.
      const previewReuseStart = performance.now()
      const previewReuse = snapshotCapability.read(effectiveFrame, {
        clearColor,
      })
      webglPreviewExecutionMode = previewReuse.executionMode
      webglPreviewReuseMs += performance.now() - previewReuseStart
      if (previewReuse.reused && !shouldBypassSnapshotReuse) {
        l0PreviewHitCount += 1
        // Snapshot reprojection can expose new edge strips during pan. Cache-only
        // early return must be bypassed when those strips exist, otherwise newly
        // exposed regions stay stale/blank until a later full render.
        const edgeRedrawCount = previewReuse.edgeRedrawRegions.length
        const snapshotState = snapshotCapability.snapshot()
        if (tileQueueCapability && snapshotState.snapshot) {
          panScheduleRequestCount = tileQueueCapability.create({
            panPredictive: {
              frame: effectiveFrame,
              snapshot: snapshotState.snapshot,
            },
          })
        }
        if (edgeRedrawCount > 0) {
          // Reuse succeeded but cannot be final output for this frame because
          // exposed edge strips require fresh draws from packet/model paths.
          l0PreviewMissCount += 1
          cacheFallbackReason = ENGINE_RENDER_FALLBACK_REASON.L0_PREVIEW_MISS
        } else {
          const overlayDrawCount = drawOverlayPass(effectiveFrame)

          return {
            drawCount: 1 + edgeRedrawCount + overlayDrawCount,
            engineFrameQuality: effectiveFrame.context.quality,
            baseSceneRenderMode,
            tileCacheBaseSceneOnly,
            visibleCount: previewReuse.visibleCount,
            culledCount: previewReuse.culledCount,
            cacheHits: 1,
            cacheMisses: 0,
            frameReuseHits: 1,
            frameReuseMisses: 0,
            webglRenderPath: 'packet',
            webglCompositeUploadBytes: 0,
            webglInteractiveTextFallbackCount: 0,
            webglTextTextureUploadCount: 0,
            webglTextTextureUploadBytes: 0,
            webglTextCacheHitCount: 0,
            webglFrameReuseEdgeRedrawCount: edgeRedrawCount,
            l0PreviewHitCount,
            l0PreviewMissCount,
            l1CompositeHitCount,
            l1CompositeMissCount,
            l2TileHitCount,
            l2TileMissCount,
            cacheFallbackReason,
            webglPreviewReuseMs,
            webglPreviewExecutionMode,
            webglPlanBuildMs,
            webglTextureUploadMs,
            webglDrawSubmitMs,
            webglSnapshotCaptureMs,
            webglModelRenderMs,
            webglBudgetPressure: frameBudgetPressure,
            webglDrawSubmitBudgetMs: frameBudget.drawSubmitBudgetMs,
            webglTextureUploadBudgetBytes: frameBudget.textureUploadBudgetBytes,
            webglTextureUploadTotalBudgetBytes: frameBudget.textureUploadTotalBudgetBytes,
            webglImageTextureUploadBudgetCount: frameBudget.imageTextureUploadMaxCount,
            webglTextTextureUploadBudgetCount: frameBudget.textTextureUploadMaxCount,
            webglTilePreloadBudgetMs: frameBudget.tilePreloadBudgetMs,
            webglTilePreloadBudgetUploads: frameBudget.tilePreloadMaxUploads,
            webglOverlayPassBudgetMs: frameBudget.overlayPassBudgetMs,
            webglDrawSubmitBudgetExceeded: drawSubmitBudgetExceeded,
            webglTextureUploadBudgetExceeded: textureUploadBudgetExceeded,
            webglOverlayBudgetExceeded: overlayBudgetExceeded,
            webglPredictorDirectionX: predictorState?.directionX,
            webglPredictorDirectionY: predictorState?.directionY,
            webglPredictorSpeedPxPerSec: predictorState?.speedPxPerSec,
            webglPredictorConfidence: predictorState?.confidence,
            webglPredictorPreloadRing: 0,
            webglPredictorOverscanCssPx: 0,
            webglPredictivePreloadEnqueueCount: 0,
            webglPredictivePreloadProcessedCount: 0,
            webglPredictivePreloadPrunedCount: 0,
            webglHighZoomTextSlaChecked: false,
            webglHighZoomTextSlaScale: HIGH_ZOOM_TEXT_SLA_SCALE,
            webglHighZoomTextSlaViolationCount: 0,
            webglDeferredTextTextureCount: 0,
            tileSchedulerPendingCount: tileQueueCapability?.read().pendingCount ?? 0,
            panScheduleRequestCount,
            tileSynchronousRebuildCount,
            gpuTextureBytes: resourceBudget.getTextureBytes(),
            imageTextureBytes: resolveCachedTextureBytes(imageCache),
            frameMs: performance.now() - startAt,
          }
        }
      } else {
        l0PreviewMissCount += 1
        // High-zoom interaction should not trust affine snapshot reuse because
        // it can delay fine-detail convergence and expose edge blank strips.
        if (shouldBypassSnapshotReuseForHighZoomInteraction) {
          cacheFallbackReason = ENGINE_RENDER_FALLBACK_REASON.L0_ZOOM_ONLY_PAN_BLOCKED
        } else {
          cacheFallbackReason = previewReuse.missReason ?? ENGINE_RENDER_FALLBACK_REASON.L0_PREVIEW_MISS
        }
      }

      // Keep full-fidelity composite for settled frames, but fall back to the
      // packet pipeline during interaction so pan/zoom can keep frame pace.
      if (modelCompleteComposite && !interactionRenderLane) {
        l1CompositeHitCount += 1
        const modelSurfacePixelRatio = effectiveFrame.context.pixelRatio ?? effectiveFrame.context.outputPixelRatio ?? 1
        // Size the model-complete offscreen surface from its own DPR lane so
        // side-target degradation never rewrites the app-owned main canvas.
        modelRenderer.resize?.({
          viewportWidth: effectiveFrame.viewport.viewportWidth,
          viewportHeight: effectiveFrame.viewport.viewportHeight,
          outputWidth: Math.max(1, Math.round(effectiveFrame.viewport.viewportWidth * modelSurfacePixelRatio)),
          outputHeight: Math.max(1, Math.round(effectiveFrame.viewport.viewportHeight * modelSurfacePixelRatio)),
        })
        const modelFrame: EngineRenderFrame = {
          ...effectiveFrame,
          context: {
            ...effectiveFrame.context,
            outputPixelRatio: modelSurfacePixelRatio,
          },
        }
        const modelRenderStart = performance.now()
        const modelStats = await modelRenderer.render(modelFrame)
        webglModelRenderMs += performance.now() - modelRenderStart
        context.viewport(
          0,
          0,
          ('width' in options.canvas ? options.canvas.width : frame.viewport.viewportWidth),
          ('height' in options.canvas ? options.canvas.height : frame.viewport.viewportHeight),
        )
        context.enable(context.BLEND)
        context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA)
        const [clearR, clearG, clearB, clearA] = clearColor
        context.clearColor(clearR, clearG, clearB, clearA)
        context.clear(context.COLOR_BUFFER_BIT)

        const tileDrawStart = performance.now()
        // Resolve the active tile bucket from viewport scale so overview and
        // deep-zoom frames use their own cache layer instead of the 100% layer.
        const currentTileZoomLevel = tileCacheCapability.read({
          kind: 'active-zoom-level',
          scale: effectiveFrame.viewport.scale,
        })
        const predictivePreloadRing = baseSceneRenderMode === 'progressive-refresh'
          ? resolvePredictivePreloadRing(TILE_PRELOAD_RING_DEFAULT, predictorState)
          : 0
        const predictiveOverscanCssPx = baseSceneRenderMode === 'progressive-refresh'
          ? resolvePredictiveOverscanCssPx(
            tileCache?.getTileSizePx(currentTileZoomLevel) ?? TILE_SIZE_CSS_FALLBACK,
            predictorState,
          )
          : 0
        const shouldBypassTileCompositor = tileCache
          ? shouldBypassTileCompositorForFrame(
            effectiveFrame,
            tileCache,
            Math.max(
              TILE_CACHE_SIZE_MIN,
              options.tileConfig?.maxCacheSize ?? TILE_CACHE_SIZE_MIN,
            ),
            currentTileZoomLevel,
          )
          : false
        // Keep tile compositor availability driven by runtime tile config only.
        const tileDrawResult = tileCache && !shouldBypassTileCompositor
          ? drawModelSurfaceAsTiles({
            context,
            frame: effectiveFrame,
            tileCache,
            tileTextures,
            nextTileTextureId: () => nextTileTextureId++,
            modelSurface: modelSurface.canvas,
            pipeline,
            tileScheduler: tileQueueCapability?.getScheduler() ?? null,
            previousZoomLevel: tileCacheCapability.read({kind: 'previous-zoom-level'}),
            preloadRing: predictivePreloadRing,
            preloadOverscanCssPx: predictiveOverscanCssPx,
            preloadBudgetMs: baseSceneRenderMode === 'progressive-refresh'
              ? frameBudget.tilePreloadBudgetMs
              : 0,
            maxPreloadUploads: baseSceneRenderMode === 'progressive-refresh'
              ? frameBudget.tilePreloadMaxUploads
              : 0,
          })
          : null
        webglDrawSubmitMs += performance.now() - tileDrawStart

        if (tileDrawResult) {
          tileCacheCapability.update({
            kind: 'set-previous-zoom-level',
            zoomLevel: tileDrawResult.zoomLevel,
          })
          l2TileHitCount += tileDrawResult.tileHitCount
          l2TileMissCount += tileDrawResult.tileMissCount
          if (tileDrawResult.fallbackReason !== ENGINE_RENDER_FALLBACK_REASON.NONE) {
            cacheFallbackReason = tileDrawResult.fallbackReason
          }

          // Avoid caching frames where base scene resolved empty while only overlay
          // affordances are visible; those snapshots cause black-base reuse loops.
          const shouldSkipTileSnapshotCapture =
            effectiveFrame.scene.nodes.length > 0 &&
            modelStats.visibleCount === 0 &&
            (effectiveFrame.context.overlayNodes?.length ?? 0) > 0
          if (!shouldSkipTileSnapshotCapture) {
            const tileSnapshotCaptureStart = performance.now()
            const tileSnapshot = snapshotCapability.create({
              frame: effectiveFrame,
              visibleCount: modelStats.visibleCount,
              culledCount: modelStats.culledCount,
            })
            webglSnapshotCaptureMs += performance.now() - tileSnapshotCaptureStart
            if (!tileSnapshot) {
              // Keep previous snapshot when capture fails so interaction preview can still reuse it.
            }
          }

          const tileStats = tileCacheCapability.read({kind: 'stats'})
          const initialRenderPhase = initialRenderController?.getPhase()
          const initialRenderProgress = initialRenderController?.getDetailPassProgress()
          const imageTextureBytes = resolveCachedTextureBytes(imageCache)
          const gpuTextureBytes = (tileStats?.totalTextureBytes ?? 0) + resourceBudget.getTextureBytes()
          const overlayDrawCount = drawOverlayPass(effectiveFrame)
          tileSynchronousRebuildCount = tileDrawResult.tileRenderCount

          return {
            ...modelStats,
            drawCount: Math.max(1, tileDrawResult.drawCount) + overlayDrawCount,
            engineFrameQuality: effectiveFrame.context.quality,
            baseSceneRenderMode,
            tileCacheBaseSceneOnly,
            cacheHits: tileDrawResult.tileHitCount,
            cacheMisses: tileDrawResult.tileMissCount,
            webglRenderPath: 'model-complete',
            webglCompositeUploadBytes: 0,
            webglInteractiveTextFallbackCount: 0,
            webglTextTextureUploadCount: 0,
            webglTextTextureUploadBytes: 0,
            webglTextCacheHitCount: 0,
            l0PreviewHitCount,
            l0PreviewMissCount,
            l1CompositeHitCount,
            l1CompositeMissCount,
            l2TileHitCount,
            l2TileMissCount,
            cacheFallbackReason,
            tileCacheSize: tileStats?.tileCount,
            tileDirtyCount: tileStats?.dirtyCount,
            tileCacheTotalBytes: tileStats?.totalTextureBytes,
            tileUploadCount: tileDrawResult.tileUploadCount,
            tileRenderCount: tileDrawResult.tileRenderCount,
            visibleTileCount: tileDrawResult.visibleTileCount,
            // Report queue depth after visible/preload processing for frame-level tuning.
            tileSchedulerPendingCount: tileQueueCapability?.read().pendingCount ?? 0,
            panScheduleRequestCount,
            tileSynchronousRebuildCount,
            gpuTextureBytes,
            imageTextureBytes,
            initialRenderPhase: initialRenderPhase?.toString(),
            initialRenderProgress: initialRenderProgress,
            dirtyRegionCount,
            dirtyTileCount,
            incrementalUpdateCount: dirtyTileCount > 0 ? 1 : 0,
            webglPreviewReuseMs,
            webglPreviewExecutionMode,
            webglPlanBuildMs,
            webglTextureUploadMs,
            webglDrawSubmitMs,
            webglSnapshotCaptureMs,
            webglModelRenderMs,
            webglBudgetPressure: frameBudgetPressure,
            webglDrawSubmitBudgetMs: frameBudget.drawSubmitBudgetMs,
            webglTextureUploadBudgetBytes: frameBudget.textureUploadBudgetBytes,
            webglTextureUploadTotalBudgetBytes: frameBudget.textureUploadTotalBudgetBytes,
            webglImageTextureUploadBudgetCount: frameBudget.imageTextureUploadMaxCount,
            webglTextTextureUploadBudgetCount: frameBudget.textTextureUploadMaxCount,
            webglTilePreloadBudgetMs: frameBudget.tilePreloadBudgetMs,
            webglTilePreloadBudgetUploads: frameBudget.tilePreloadMaxUploads,
            webglOverlayPassBudgetMs: frameBudget.overlayPassBudgetMs,
            webglDrawSubmitBudgetExceeded: drawSubmitBudgetExceeded,
            webglTextureUploadBudgetExceeded: textureUploadBudgetExceeded,
            webglOverlayBudgetExceeded: overlayBudgetExceeded,
            webglPredictorDirectionX: predictorState?.directionX,
            webglPredictorDirectionY: predictorState?.directionY,
            webglPredictorSpeedPxPerSec: predictorState?.speedPxPerSec,
            webglPredictorConfidence: predictorState?.confidence,
            webglPredictorPreloadRing: predictivePreloadRing,
            webglPredictorOverscanCssPx: predictiveOverscanCssPx,
            webglPredictivePreloadEnqueueCount: tileDrawResult.predictivePreloadEnqueueCount,
            webglPredictivePreloadProcessedCount: tileDrawResult.predictivePreloadProcessedCount,
            webglPredictivePreloadPrunedCount: tileDrawResult.predictivePreloadPrunedCount,
            webglHighZoomTextSlaChecked: false,
            webglHighZoomTextSlaScale: HIGH_ZOOM_TEXT_SLA_SCALE,
            webglHighZoomTextSlaViolationCount: 0,
            webglDeferredTextTextureCount: 0,
            frameMs: performance.now() - startAt,
          }
        }

        cacheFallbackReason = tileCache
          ? (shouldBypassTileCompositor
            ? ENGINE_RENDER_FALLBACK_REASON.L2_BYPASS_VISIBLE_TILE_PRESSURE
            : ENGINE_RENDER_FALLBACK_REASON.L2_TILE_FALLBACK_TO_COMPOSITE)
          : cacheFallbackReason

        const compositeFrame: EngineRenderFrame = {
          ...effectiveFrame,
          viewport: {
            ...effectiveFrame.viewport,
            // Keep matrix aligned with override so fullscreen composite draw has no transform drift.
            matrix: createViewportMatrixForRender(1, 0, 0),
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          },
        }

        context.bindTexture(context.TEXTURE_2D, compositeTexture)
        context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
        try {
          context.texImage2D(
            context.TEXTURE_2D,
            0,
            context.RGBA,
            context.RGBA,
            context.UNSIGNED_BYTE,
            modelSurface.canvas as unknown as TexImageSource,
          )
        } catch {
          // Keep packet path as safety net when model-complete upload fails;
          // returning early here can preserve an empty frame under rare GPU failures.
          l1CompositeMissCount += 1
          cacheFallbackReason = ENGINE_RENDER_FALLBACK_REASON.L3_EMPTY_FRAME_MODEL_FALLBACK
        }

        if (cacheFallbackReason === ENGINE_RENDER_FALLBACK_REASON.L3_EMPTY_FRAME_MODEL_FALLBACK) {
          // Continue into packet path below.
        } else {
          const compositeDrawStart = performance.now()
          drawCompositeTextureFrame({
            context,
            pipeline,
            frame: compositeFrame,
            texture: compositeTexture,
            viewportWidth: frame.viewport.viewportWidth,
            viewportHeight: frame.viewport.viewportHeight,
            textureSource: 'canvas-upload',
          })
          webglDrawSubmitMs += performance.now() - compositeDrawStart

          // Avoid promoting composite uploads as reusable snapshots when base
          // visibility is empty and output is overlay-only.
          const shouldSkipCompositeSnapshotUpdate =
            effectiveFrame.scene.nodes.length > 0 &&
            modelStats.visibleCount === 0 &&
            (effectiveFrame.context.overlayNodes?.length ?? 0) > 0
          if (!shouldSkipCompositeSnapshotUpdate) {
            snapshotCapability.update({
              snapshot: {
                revision: effectiveFrame.scene.revision,
                scale: effectiveFrame.viewport.scale,
                offsetX: effectiveFrame.viewport.offsetX,
                offsetY: effectiveFrame.viewport.offsetY,
                viewportWidth: effectiveFrame.viewport.viewportWidth,
                viewportHeight: effectiveFrame.viewport.viewportHeight,
                pixelRatio: resolveCompositeSnapshotPixelRatio(effectiveFrame),
                visibleCount: modelStats.visibleCount,
                culledCount: modelStats.culledCount,
                textureSource: 'canvas-upload',
              },
            })
          }
          const overlayDrawCount = drawOverlayPass(effectiveFrame)

          return {
            ...modelStats,
            drawCount: Math.max(1, modelStats.drawCount) + overlayDrawCount,
            baseSceneRenderMode,
            tileCacheBaseSceneOnly,
            cacheHits: 0,
            cacheMisses: 0,
            webglRenderPath: 'model-complete',
            webglCompositeUploadBytes:
              Math.max(1, effectiveFrame.viewport.viewportWidth) *
              Math.max(1, effectiveFrame.viewport.viewportHeight) *
              Math.max(1, effectiveFrame.context.outputPixelRatio ?? effectiveFrame.context.pixelRatio ?? 1) *
              Math.max(1, effectiveFrame.context.outputPixelRatio ?? effectiveFrame.context.pixelRatio ?? 1) *
              TEXTURE_BYTES_PER_PIXEL_RGBA,
            webglInteractiveTextFallbackCount: 0,
            webglTextTextureUploadCount: 0,
            webglTextTextureUploadBytes: 0,
            webglTextCacheHitCount: 0,
            l0PreviewHitCount,
            l0PreviewMissCount,
            l1CompositeHitCount,
            l1CompositeMissCount,
            l2TileHitCount,
            l2TileMissCount,
            cacheFallbackReason,
            webglPreviewReuseMs,
            webglPreviewExecutionMode,
            webglPlanBuildMs,
            webglTextureUploadMs,
            webglDrawSubmitMs,
            webglSnapshotCaptureMs,
            webglModelRenderMs,
            webglBudgetPressure: frameBudgetPressure,
            webglDrawSubmitBudgetMs: frameBudget.drawSubmitBudgetMs,
            webglTextureUploadBudgetBytes: frameBudget.textureUploadBudgetBytes,
            webglTextureUploadTotalBudgetBytes: frameBudget.textureUploadTotalBudgetBytes,
            webglImageTextureUploadBudgetCount: frameBudget.imageTextureUploadMaxCount,
            webglTextTextureUploadBudgetCount: frameBudget.textTextureUploadMaxCount,
            webglTilePreloadBudgetMs: frameBudget.tilePreloadBudgetMs,
            webglTilePreloadBudgetUploads: frameBudget.tilePreloadMaxUploads,
            webglOverlayPassBudgetMs: frameBudget.overlayPassBudgetMs,
            webglDrawSubmitBudgetExceeded: drawSubmitBudgetExceeded,
            webglTextureUploadBudgetExceeded: textureUploadBudgetExceeded,
            webglOverlayBudgetExceeded: overlayBudgetExceeded,
            webglPredictorDirectionX: predictorState?.directionX,
            webglPredictorDirectionY: predictorState?.directionY,
            webglPredictorSpeedPxPerSec: predictorState?.speedPxPerSec,
            webglPredictorConfidence: predictorState?.confidence,
            webglPredictorPreloadRing: 0,
            webglPredictorOverscanCssPx: 0,
            webglPredictivePreloadEnqueueCount: 0,
            webglPredictivePreloadProcessedCount: 0,
            webglPredictivePreloadPrunedCount: 0,
            webglHighZoomTextSlaChecked: false,
            webglHighZoomTextSlaScale: HIGH_ZOOM_TEXT_SLA_SCALE,
            webglHighZoomTextSlaViolationCount: 0,
            webglDeferredTextTextureCount: 0,
            tileSchedulerPendingCount: tileQueueCapability?.read().pendingCount ?? 0,
            panScheduleRequestCount,
            tileSynchronousRebuildCount,
            gpuTextureBytes: resourceBudget.getTextureBytes(),
            imageTextureBytes: resolveCachedTextureBytes(imageCache),
            frameMs: performance.now() - startAt,
          }
        }
      }

      const planBuildStart = performance.now()
      const plan = prepareEngineRenderPlan(effectiveFrame)
      if (interactionRenderLane || !modelCompleteComposite) {
        l1CompositeMissCount += 1
        if (cacheFallbackReason === ENGINE_RENDER_FALLBACK_REASON.NONE) {
          cacheFallbackReason = interactionRenderLane
            ? ENGINE_RENDER_FALLBACK_REASON.L1_BYPASS_INTERACTIVE
            : ENGINE_RENDER_FALLBACK_REASON.L1_DISABLED
        }
      }
      // Prepare typed-array instance payload once per frame so upcoming WebGL
      // draw pipelines can focus on upload/commit without repeating traversal.
      const instanceView = prepareEngineRenderInstanceView(effectiveFrame, plan)
      const packetPlan = compileEngineWebGLPacketPlan(plan, instanceView)
      pruneTextCache(context, textCache, packetPlan.packets, resourceBudget)
      webglPlanBuildMs += performance.now() - planBuildStart

      // Estimate only not-yet-resident image textures so budget pressure does
      // not keep charging cached images as if every frame were a fresh upload.
      const frameTextureEstimate =
        resourceBudget.getTextureBytes() +
        countPendingImageTextureEstimate(packetPlan.packets, imageCache)

      const budgetState = resourceBudget.recordFrameUsage({
        bufferBytes: packetPlan.uploadBytesEstimate,
        textureBytes: frameTextureEstimate,
      })

      if (budgetState.overTextureBudget) {
        if (budgetState.textureOverflowBytes > 0) {
          const evictedTextureIds = resourceBudget.evictLeastRecentlyUsedTextures(
            budgetState.textureOverflowBytes,
          )
          disposeEvictedTextures(context, imageCache, textCache, evictedTextureIds)
        }
      }

      context.viewport(
        0,
        0,
        ('width' in options.canvas ? options.canvas.width : frame.viewport.viewportWidth),
        ('height' in options.canvas ? options.canvas.height : frame.viewport.viewportHeight),
      )
      context.enable(context.BLEND)
      context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA)

      const [clearR, clearG, clearB, clearA] = clearColor
      context.clearColor(clearR, clearG, clearB, clearA)
      context.clear(context.COLOR_BUFFER_BIT)

      // If there are text packets that require run-level fidelity, use the
      // canvas2d model renderer as a fallback compositor to produce accurate
      // text run output which we then upload to textures per-node.
      const needsModelTextComposite =
        !interactionRenderLane && packetPlan.richTextPacketCount > 0

      if (needsModelTextComposite) {
        // Render the full model into the modelSurface canvas so we can crop
        // per-node text rects. Ignore returned stats.
        try {
          const modelTextRenderStart = performance.now()
          await modelRenderer.render(effectiveFrame)
          webglModelRenderMs += performance.now() - modelTextRenderStart
        } catch {
          // If modelRenderer fails, continue without text composite fallback.
        }
      }

      let drawCount = 0
      let interactiveTextFallbackCount = 0
      let textTextureUploadCount = 0
      let textTextureUploadBytes = 0
      let textCacheHitCount = 0
      let imageTextureUploadCount = 0
      let imageTextureUploadBytes = 0
      let imageDownsampledUploadCount = 0
      let imageDownsampledUploadBytesSaved = 0
      let deferredImageTextureCount = 0
      let deferredTextTextureCount = 0
      let totalTextureUploadBytes = 0
      let remainingTextTextureUploadCount = frameBudget.textTextureUploadMaxCount
      let remainingTotalTextureUploadBytes = frameBudget.textureUploadTotalBudgetBytes
      const imageUploadBudget: ImageUploadBudgetState = {
        remainingUploads: frameBudget.imageTextureUploadMaxCount,
        remainingBytes: frameBudget.textureUploadBudgetBytes,
      }
      // Frame context can override renderer defaults, so honor per-frame LOD
      // enablement when deciding whether to apply detail degradation.
      const frameLodState = lodCapability.read({
        frame: effectiveFrame,
        tileCacheEnabled,
        visibleElementCount: visibleElementCountForLod,
      })
      const frameLodEnabled = frameLodState.frameLodEnabled
      const useTextPlaceholderMode = frameLodState.useTextPlaceholderMode
      const textureUploadBeforeLoop = webglTextureUploadMs
      const packetLoopStart = performance.now()
      const basePackets = activeLayerMaskEnabled
        ? packetPlan.packets.filter((packet) => !activeLayerNodeIdSet.has(packet.nodeId))
        : packetPlan.packets
      const activePackets = activeLayerMaskEnabled
        ? packetPlan.packets.filter((packet) => activeLayerNodeIdSet.has(packet.nodeId))
        : []
      const interactionDirtyRegions = effectiveFrame.context.dirtyRegions
      const activePacketsInDirtyRegions = activePackets.filter((packet) => {
        if (!interactionDirtyRegions || interactionDirtyRegions.length === 0) {
          return true
        }

        // Keep active redraw constrained to dirty regions so transform preview
        // stays live without forcing full active-layer replay.
        return doesPacketIntersectDirtyRegions(packet.worldBounds, interactionDirtyRegions)
      })
      const packetSubmissionSequence = activeLayerMaskEnabled
        ? [...basePackets, ...activePacketsInDirtyRegions]
        : basePackets

      for (const packet of packetSubmissionSequence) {
        const activeLayerPass = activeLayerNodeIdSet.has(packet.nodeId)
        // Break packet submission once draw budget is exceeded after at least
        // one draw, then rely on snapshot/tile/model fallback on next frame.
        if (
          !activeLayerPass &&
          drawCount > 0 &&
          performance.now() - packetLoopStart >= frameBudget.drawSubmitBudgetMs
        ) {
          drawSubmitBudgetExceeded = true
          cacheFallbackReason = cacheFallbackReason === ENGINE_RENDER_FALLBACK_REASON.NONE
            ? ENGINE_RENDER_FALLBACK_REASON.L3_BUDGET_DRAW_SUBMIT_CAP
            : cacheFallbackReason
          break
        }

        if (
          !activeLayerPass &&
          interactionRenderLane &&
          shouldSkipInteractiveTinyPacket(effectiveFrame, packet.kind, packet.worldBounds)
        ) {
          // Skip imperceptible packets in interaction fallback to preserve frame budget.
          continue
        }

        if (packet.kind === 'image' && packet.assetId) {
          if (!activeLayerPass && shouldSkipOverviewImagePacket(effectiveFrame, packet.worldBounds, frameLodEnabled)) {
            continue
          }

          const imageTexture = resolveImageTexture(
            context,
            effectiveFrame,
            packet.worldBounds,
            packet.assetId,
            imageCache,
            resourceBudget,
            imageUploadBudget,
            interactionRenderLane
              ? shouldPrioritizeInteractiveTexturePacket(effectiveFrame, packet, activeLayerPass)
              : false,
          )
          webglTextureUploadMs += imageTexture.uploadMs
          if (imageTexture.deferred) {
            deferredImageTextureCount += 1
          }
          imageTextureUploadCount += imageTexture.uploadCount
          imageTextureUploadBytes += imageTexture.uploadBytes
          totalTextureUploadBytes += imageTexture.uploadBytes
          remainingTotalTextureUploadBytes = Math.max(
            0,
            remainingTotalTextureUploadBytes - imageTexture.uploadBytes,
          )
          imageDownsampledUploadCount += imageTexture.downsampledUploadCount
          imageDownsampledUploadBytesSaved += imageTexture.downsampledBytesSaved
          drawCount += drawWebGLPacket(
            context,
            pipeline,
            effectiveFrame,
            packet.worldBounds,
            packet.color,
            packet.opacity,
            imageTexture.texture,
          )
          continue
        }

        if (packet.kind === 'text') {
          const cached = textCache.get(packet.nodeId)
          const textCacheKey = resolveTextCacheKey(packet)
          const textRasterScale = resolveTextRasterScale(effectiveFrame)

          if (useTextPlaceholderMode) {
            // Low-zoom text is not legible at glyph fidelity. Render an
            // inexpensive placeholder and skip text raster uploads.
            if (shouldSkipTextPlaceholderPacket(effectiveFrame, packet.worldBounds, frameLodEnabled)) {
              continue
            }

            interactiveTextFallbackCount += 1
            drawCount += drawInteractiveTextFallback(
              context,
              pipeline,
              effectiveFrame,
              packet.worldBounds,
              packet.color,
              packet.opacity,
            )
            continue
          }

          if (interactionRenderLane) {
            // Interactive mode prefers cached text textures when content is
            // unchanged so pan/zoom previews avoid collapsing to solid blocks.
            if (cached && canReuseInteractiveTextTexture(cached, textCacheKey)) {
              textCacheHitCount += 1
              resourceBudget.markTextureUsed(packet.nodeId)
              drawCount += drawWebGLPacket(
                context,
                pipeline,
                effectiveFrame,
                packet.worldBounds,
                packet.color,
                packet.opacity,
                cached.texture,
              )
              continue
            }

            const shouldUploadCriticalText = shouldPrioritizeInteractiveTexturePacket(
              effectiveFrame,
              packet,
              activeLayerPass,
            )
            if (!shouldUploadCriticalText) {
              // Avoid texture uploads during interaction and fall back only when
              // packet is not marked as critical in the current frame context.
              interactiveTextFallbackCount += 1
              drawCount += drawInteractiveTextFallback(
                context,
                pipeline,
                effectiveFrame,
                packet.worldBounds,
                packet.color,
                packet.opacity,
              )
              continue
            }
          }

          // Try cached text texture first
          if (cached && canReuseTextTexture(cached, textCacheKey, textRasterScale)) {
            textCacheHitCount += 1
            resourceBudget.markTextureUsed(packet.nodeId)
            drawCount += drawWebGLPacket(
              context,
              pipeline,
              effectiveFrame,
              packet.worldBounds,
              packet.color,
              packet.opacity,
              cached.texture,
            )
            continue
          }

          // If we have a modelSurface canvas from the canvas2d renderer,
          // crop the node rect and upload as texture.
          if (modelSurface && modelSurface.canvas) {
            if (remainingTextTextureUploadCount <= 0 || remainingTotalTextureUploadBytes <= 0) {
              // Defer text texture upload when this frame exhausted text/total budget.
              deferredTextTextureCount += 1
              interactiveTextFallbackCount += 1
              drawCount += drawInteractiveTextFallback(
                context,
                pipeline,
                effectiveFrame,
                packet.worldBounds,
                packet.color,
                packet.opacity,
              )
              continue
            }

            const textureSourceRect = resolvePacketTextureSourceRect(
              packet.worldBounds,
              effectiveFrame,
            )

            const textUploadBytesEstimate = textureSourceRect.width * textureSourceRect.height * TEXTURE_BYTES_PER_PIXEL_RGBA
            if (textUploadBytesEstimate > remainingTotalTextureUploadBytes) {
              // Defer oversized text uploads when combined image+text budget is exhausted.
              deferredTextTextureCount += 1
              interactiveTextFallbackCount += 1
              drawCount += drawInteractiveTextFallback(
                context,
                pipeline,
                effectiveFrame,
                packet.worldBounds,
                packet.color,
                packet.opacity,
              )
              continue
            }

            const cropped = copyCanvasRegion(
              modelSurface.canvas,
              textCropSurface.canvas,
              textureSourceRect.x,
              textureSourceRect.y,
              textureSourceRect.width,
              textureSourceRect.height,
            )
            const texture = cached?.texture ?? context.createTexture()
            if (texture) {
              const reusesCachedTexture = cached?.texture === texture
              context.bindTexture(context.TEXTURE_2D, texture)
              context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
              try {
                const textUploadStart = performance.now()
                context.texImage2D(
                  context.TEXTURE_2D,
                  0,
                  context.RGBA,
                  context.RGBA,
                  context.UNSIGNED_BYTE,
                  cropped as unknown as TexImageSource,
                )
                webglTextureUploadMs += performance.now() - textUploadStart
                textCache.set(packet.nodeId, {
                  texture,
                  width: textureSourceRect.width,
                  height: textureSourceRect.height,
                  cacheKey: textCacheKey,
                  rasterScale: textRasterScale,
                })
                resourceBudget.markTextureResident(
                  packet.nodeId,
                    textureSourceRect.width * textureSourceRect.height * TEXTURE_BYTES_PER_PIXEL_RGBA,
                )
                resourceBudget.markTextureUsed(packet.nodeId)
                textTextureUploadCount += 1
                  textTextureUploadBytes += textureSourceRect.width * textureSourceRect.height * TEXTURE_BYTES_PER_PIXEL_RGBA
                  totalTextureUploadBytes += textureSourceRect.width * textureSourceRect.height * TEXTURE_BYTES_PER_PIXEL_RGBA
                remainingTextTextureUploadCount = Math.max(0, remainingTextTextureUploadCount - 1)
                remainingTotalTextureUploadBytes = Math.max(
                  0,
                    remainingTotalTextureUploadBytes - textureSourceRect.width * textureSourceRect.height * TEXTURE_BYTES_PER_PIXEL_RGBA,
                )
                drawCount += drawWebGLPacket(
                  context,
                  pipeline,
                  effectiveFrame,
                  packet.worldBounds,
                  packet.color,
                  packet.opacity,
                  texture,
                )
                continue
              } catch {
                if (reusesCachedTexture) {
                  textCache.delete(packet.nodeId)
                  resourceBudget.releaseTexture(packet.nodeId)
                }
                context.deleteTexture(texture)
              }
            }
          }
        }

        // Fallback: draw a solid quad when no texture is available.
        drawCount += drawWebGLPacket(
          context,
          pipeline,
          effectiveFrame,
          packet.worldBounds,
          packet.color,
          packet.opacity,
          null,
        )
      }
      const packetLoopMs = performance.now() - packetLoopStart
      const textureUploadDeltaMs = webglTextureUploadMs - textureUploadBeforeLoop
      webglDrawSubmitMs += Math.max(0, packetLoopMs - textureUploadDeltaMs)
      drawSubmitBudgetExceeded = drawSubmitBudgetExceeded || webglDrawSubmitMs > frameBudget.drawSubmitBudgetMs
      textureUploadBudgetExceeded =
        imageTextureUploadBytes > frameBudget.textureUploadBudgetBytes ||
        imageTextureUploadCount > frameBudget.imageTextureUploadMaxCount ||
        totalTextureUploadBytes > frameBudget.textureUploadTotalBudgetBytes ||
        textTextureUploadCount > frameBudget.textTextureUploadMaxCount

      if (
        effectiveFrame.context.quality === 'full' &&
        effectiveFrame.viewport.scale >= highZoomTextSlaScale
      ) {
        highZoomTextSlaChecked = true
        // High-zoom text SLA fails when text remains deferred or fallback-based.
        if (interactiveTextFallbackCount > 0 || deferredTextTextureCount > 0) {
          highZoomTextSlaViolationCount = 1
        }
      }

      // Keep an explicit zero-draw fallback so shortlist/culling edge cases never present a black frame.
      if (drawCount === 0 && effectiveFrame.scene.nodes.length > 0) {
        cacheFallbackReason = cacheFallbackReason === ENGINE_RENDER_FALLBACK_REASON.NONE
          ? ENGINE_RENDER_FALLBACK_REASON.L3_EMPTY_FRAME_MODEL_FALLBACK
          : cacheFallbackReason
        const modelSurfacePixelRatio = effectiveFrame.context.pixelRatio ?? effectiveFrame.context.outputPixelRatio ?? 1
        // Force full-quality model fallback so zero-draw recovery cannot inherit
        // interaction-tier culling/placeholder decisions that produced empty output.
        const modelFallbackFrame: EngineRenderFrame = {
          ...effectiveFrame,
          context: {
            ...effectiveFrame.context,
            quality: 'full',
            lodEnabled: false,
          },
        }
        modelRenderer.resize?.({
          viewportWidth: modelFallbackFrame.viewport.viewportWidth,
          viewportHeight: modelFallbackFrame.viewport.viewportHeight,
          outputWidth: Math.max(1, Math.round(modelFallbackFrame.viewport.viewportWidth * modelSurfacePixelRatio)),
          outputHeight: Math.max(1, Math.round(modelFallbackFrame.viewport.viewportHeight * modelSurfacePixelRatio)),
        })
        const modelFrameWithOutputRatio: EngineRenderFrame = {
          ...modelFallbackFrame,
          context: {
            ...modelFallbackFrame.context,
            outputPixelRatio: modelSurfacePixelRatio,
          },
        }
        const modelFallbackRenderStart = performance.now()
        await modelRenderer.render(modelFrameWithOutputRatio)
        webglModelRenderMs += performance.now() - modelFallbackRenderStart

        context.bindTexture(context.TEXTURE_2D, compositeTexture)
        context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
        context.texImage2D(
          context.TEXTURE_2D,
          0,
          context.RGBA,
          context.RGBA,
          context.UNSIGNED_BYTE,
          modelSurface.canvas as unknown as TexImageSource,
        )

        const compositeFrame: EngineRenderFrame = {
          ...modelFallbackFrame,
          viewport: {
            ...modelFallbackFrame.viewport,
            matrix: createViewportMatrixForRender(1, 0, 0),
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          },
        }
        drawCompositeTextureFrame({
          context,
          pipeline,
          frame: compositeFrame,
          texture: compositeTexture,
          viewportWidth: effectiveFrame.viewport.viewportWidth,
          viewportHeight: effectiveFrame.viewport.viewportHeight,
          textureSource: 'canvas-upload',
        })
        drawCount = 1
      }

      // Collect tile and initial render diagnostics
      const tileStats = tileCacheCapability.read({kind: 'stats'})
      const initialRenderPhase = initialRenderController?.getPhase()
      const initialRenderProgress = initialRenderController?.getDetailPassProgress()

      const snapshotState = snapshotCapability.snapshot()
      // Guard packet-path snapshot capture under the same overlay-only condition.
      const shouldSkipPacketSnapshotCapture =
        effectiveFrame.scene.nodes.length > 0 &&
        plan.stats.visibleCount === 0 &&
        (effectiveFrame.context.overlayNodes?.length ?? 0) > 0
      const shouldCaptureSnapshot =
        !shouldSkipPacketSnapshotCapture &&
        (!snapshotState.snapshot ||
          (!interactionRenderLane && snapshotState.snapshot.revision !== effectiveFrame.scene.revision)
        )
      if (shouldCaptureSnapshot) {
        const snapshotCaptureStart = performance.now()
        const snapshot = snapshotCapability.create({
          frame: effectiveFrame,
          visibleCount: plan.stats.visibleCount,
          culledCount: plan.stats.culledCount,
        })
        webglSnapshotCaptureMs += performance.now() - snapshotCaptureStart
        if (!snapshot) {
          // Keep previous snapshot when capture fails so interaction preview can still reuse it.
        }
      }
      drawCount += drawOverlayPass(effectiveFrame)

      return {
        drawCount,
        engineFrameQuality: effectiveFrame.context.quality,
        baseSceneRenderMode,
        tileCacheBaseSceneOnly,
        visibleCount: plan.stats.visibleCount,
        culledCount: plan.stats.culledCount,
        groupCollapseCount: plan.stats.collapsedGroupCount,
        groupCollapseCulledCount: plan.stats.collapsedDescendantCulledCount,
        geometryCacheHitCount: plan.stats.geometryCacheHitCount,
        geometryCacheMissCount: plan.stats.geometryCacheMissCount,
        geometryCacheHitRate: plan.stats.geometryCacheHitRate,
        cacheHits: 0,
        cacheMisses: 0,
        frameReuseHits: 0,
        frameReuseMisses: 0,
        webglRenderPath: 'packet',
        webglCompositeUploadBytes: 0,
        webglInteractiveTextFallbackCount: interactiveTextFallbackCount,
        webglImageTextureUploadCount: imageTextureUploadCount,
        webglImageTextureUploadBytes: imageTextureUploadBytes,
        webglImageDownsampledUploadCount: imageDownsampledUploadCount,
        webglImageDownsampledUploadBytesSaved: imageDownsampledUploadBytesSaved,
        webglDeferredImageTextureCount: deferredImageTextureCount,
        webglDeferredTextTextureCount: deferredTextTextureCount,
        webglTextTextureUploadCount: textTextureUploadCount,
        webglTextTextureUploadBytes: textTextureUploadBytes,
        webglTextCacheHitCount: textCacheHitCount,
        webglFrameReuseEdgeRedrawCount: 0,
        webglPrecomputedTextCacheKeyCount: packetPlan.precomputedTextCacheKeyCount,
        webglFallbackTextCacheKeyCount: packetPlan.fallbackTextCacheKeyCount,
        l0PreviewHitCount,
        l0PreviewMissCount,
        l1CompositeHitCount,
        l1CompositeMissCount,
        l2TileHitCount,
        l2TileMissCount,
        cacheFallbackReason,
        tileCacheSize: tileStats?.tileCount,
        tileDirtyCount: tileStats?.dirtyCount,
        tileCacheTotalBytes: tileStats?.totalTextureBytes,
        tileUploadCount: 0,
        tileRenderCount: 0,
        visibleTileCount: 0,
        tileSchedulerPendingCount: tileQueueCapability?.read().pendingCount ?? 0,
        panScheduleRequestCount,
        tileSynchronousRebuildCount,
        gpuTextureBytes: (tileStats?.totalTextureBytes ?? 0) + resourceBudget.getTextureBytes(),
        imageTextureBytes: resolveCachedTextureBytes(imageCache),
        initialRenderPhase: initialRenderPhase?.toString(),
        initialRenderProgress: initialRenderProgress,
        dirtyRegionCount: dirtyRegionCount,
        dirtyTileCount: dirtyTileCount,
        incrementalUpdateCount: dirtyTileCount > 0 ? 1 : 0,
        webglPreviewReuseMs,
        webglPreviewExecutionMode,
        webglPlanBuildMs,
        webglTextureUploadMs,
        webglDrawSubmitMs,
        webglSnapshotCaptureMs,
        webglModelRenderMs,
        webglBudgetPressure: frameBudgetPressure,
        webglDrawSubmitBudgetMs: frameBudget.drawSubmitBudgetMs,
        webglTextureUploadBudgetBytes: frameBudget.textureUploadBudgetBytes,
        webglTextureUploadTotalBudgetBytes: frameBudget.textureUploadTotalBudgetBytes,
        webglImageTextureUploadBudgetCount: frameBudget.imageTextureUploadMaxCount,
        webglTextTextureUploadBudgetCount: frameBudget.textTextureUploadMaxCount,
        webglTilePreloadBudgetMs: frameBudget.tilePreloadBudgetMs,
        webglTilePreloadBudgetUploads: frameBudget.tilePreloadMaxUploads,
        webglOverlayPassBudgetMs: frameBudget.overlayPassBudgetMs,
        webglDrawSubmitBudgetExceeded: drawSubmitBudgetExceeded,
        webglTextureUploadBudgetExceeded: textureUploadBudgetExceeded,
        webglOverlayBudgetExceeded: overlayBudgetExceeded,
        webglPredictorDirectionX: predictorState?.directionX,
        webglPredictorDirectionY: predictorState?.directionY,
        webglPredictorSpeedPxPerSec: predictorState?.speedPxPerSec,
        webglPredictorConfidence: predictorState?.confidence,
        webglPredictorPreloadRing: 0,
        webglPredictorOverscanCssPx: 0,
        webglPredictivePreloadEnqueueCount: 0,
        webglPredictivePreloadProcessedCount: 0,
        webglPredictivePreloadPrunedCount: 0,
        webglHighZoomTextSlaChecked: highZoomTextSlaChecked,
        webglHighZoomTextSlaScale: highZoomTextSlaScale,
        webglHighZoomTextSlaViolationCount: highZoomTextSlaViolationCount,
        frameMs: performance.now() - startAt,
      }
    },
    dispose: () => {
      tileQueueCapability?.delete()
      tileCacheCapability.delete()
      lodCapability.delete()
      snapshotCapability.delete()
      modelRenderer.dispose?.()
      context.deleteTexture(compositeTexture)
      if (overlayTexture) {
        context.deleteTexture(overlayTexture)
      }
      for (const texture of tileTextures.values()) {
        context.deleteTexture(texture)
      }
      tileTextures.clear()
      disposeCachedTextures(context, imageCache, resourceBudget)
      disposeCachedTextures(context, textCache, resourceBudget)
      disposeWebGLQuadPipeline(context, pipeline)
      // WebGL context lifecycle is owned by the host canvas environment.
    },
  }
}

