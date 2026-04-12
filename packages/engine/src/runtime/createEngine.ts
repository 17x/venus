import {
  DEFAULT_ENGINE_VIEWPORT,
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
  type EngineCanvasViewportState,
} from '../interaction/viewport.ts'
import { createCanvas2DEngineRenderer } from '../renderer/canvas2d.ts'
import { createWebGLEngineRenderer } from '../renderer/webgl.ts'
import type {
  EngineBackend,
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

interface EnginePerformanceOptions {
  culling?: boolean
  lod?: boolean
}

interface EngineRenderOptions {
  quality?: EngineRenderQuality
  canvasClearColor?: string
  webglClearColor?: readonly [number, number, number, number]
  // Short alias for pixel ratio config.
  dpr?: number | 'auto'
  // `auto` resolves from `window.devicePixelRatio` when available.
  pixelRatio?: number | 'auto'
  maxPixelRatio?: number
  imageSmoothing?: boolean
  imageSmoothingQuality?: ImageSmoothingQuality
  webglAntialias?: boolean
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
  backend?: EngineBackend
  initialScene?: EngineSceneSnapshot
  viewport?: EngineViewportOptions
  performance?: EnginePerformanceOptions
  render?: EngineRenderOptions
  resource?: EngineResourceOptions
  debug?: EngineDebugOptions
  clock?: EngineClock
}

export interface EngineRuntimeDiagnostics {
  backend: EngineBackend
  renderStats: EngineRenderStats | null
  pixelRatio: number
  scene: EngineSceneStoreDiagnostics
  viewport: Pick<EngineCanvasViewportState, 'scale' | 'offsetX' | 'offsetY' | 'viewportWidth' | 'viewportHeight'>
}

export interface Engine {
  loadScene(scene: EngineSceneSnapshot): EngineScenePatchApplyResult
  applyScenePatchBatch(batch: EngineScenePatchBatch): EngineScenePatchApplyResult
  transaction(
    run: (transaction: EngineSceneStoreTransaction) => void,
    options?: {revision?: string | number},
  ): EngineScenePatchApplyResult | null
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
  setResourceLoader(loader?: EngineResourceLoader): void
  setTextShaper(textShaper?: EngineTextShaper): void
  renderFrame(): Promise<EngineRenderStats>
  start(): void
  stop(): void
  isRunning(): boolean
  getDiagnostics(): EngineRuntimeDiagnostics
  dispose(): void
}

/**
 * High-level engine facade with:
 * - one default renderer entry (`canvas2d` or `webgl`)
 * - batch-first scene mutation APIs
 * - optional render/resource/debug tuning grouped by concern
 */
export function createEngine(options: CreateEngineOptions): Engine {
  const backend = options.backend ?? 'canvas2d'
  let maxPixelRatio = options.render?.maxPixelRatio ?? 2
  let pixelRatio = resolveEnginePixelRatio(
    options.render?.dpr ?? options.render?.pixelRatio,
    maxPixelRatio,
  )
  const store = createEngineSceneStore({
    initialScene: options.initialScene,
  })
  const renderer = backend === 'webgl'
    ? createWebGLEngineRenderer({
      canvas: options.canvas,
      enableCulling: options.performance?.culling,
      clearColor: options.render?.webglClearColor,
      antialias: options.render?.webglAntialias ?? true,
    })
    : createCanvas2DEngineRenderer({
      canvas: options.canvas,
      enableCulling: options.performance?.culling,
      clearColor: options.render?.canvasClearColor,
      imageSmoothing: options.render?.imageSmoothing ?? true,
      imageSmoothingQuality: options.render?.imageSmoothingQuality ?? 'high',
    })
  const renderContext: {
    quality: EngineRenderQuality
    pixelRatio: number
    loader?: EngineResourceLoader
    textShaper?: EngineTextShaper
  } = {
    quality: options.render?.quality ?? 'full',
    pixelRatio,
    loader: options.resource?.loader,
    textShaper: options.resource?.textShaper,
  }
  const clock = options.clock ?? createSystemEngineClock()
  let viewport = resolveInitialViewport(options.canvas, options.viewport)
  let latestRenderStats: EngineRenderStats | null = null

  const loop: EngineLoopController = createEngineLoop({
    clock,
    renderer,
    resolveFrame: () => ({
      scene: store.getSnapshot(),
      viewport,
      context: renderContext,
    }),
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
    query(bounds) {
      return store.query(bounds)
    },
    hitTest(point, tolerance) {
      return store.hitTest(point, tolerance)
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
    setResourceLoader(loader) {
      renderContext.loader = loader
    },
    setTextShaper(textShaper) {
      renderContext.textShaper = textShaper
    },
    renderFrame: async () => {
      const stats = await loop.renderOnce()
      latestRenderStats = stats
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
        backend,
        renderStats: latestRenderStats,
        pixelRatio,
        scene: store.getDiagnostics(),
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
