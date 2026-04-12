import * as React from 'react'
import type {EditorDocument} from '@venus/document-core'
import {bindViewportGestures} from '@venus/runtime/interaction'
import {
  buildDocumentImageAssetUrlMap,
  createEngineSceneFromRuntimeSnapshot,
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '@venus/runtime/presets'
import type {CanvasViewportState} from '@venus/runtime'
import type {PointerState, SceneShapeSnapshot, SceneStats} from '@venus/shared-memory'
import {
  createEngine,
  createEngineRenderScheduler,
  getNormalizedBoundsFromBox,
  type Engine,
  type EngineRenderScheduler,
  type EngineReplayRenderRequest,
  type EngineReplayWorkerEvent,
} from '@venus/engine'

export interface CanvasRendererProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  renderQuality?: 'full' | 'interactive'
  lodLevel?: 0 | 1 | 2 | 3
}

export interface CanvasOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
}

export type CanvasRenderer = React.ComponentType<CanvasRendererProps>
export type CanvasOverlayRenderer = React.ComponentType<CanvasOverlayProps>

function resolveCanvasLodProfile(options: {
  shapeCount: number
  imageCount: number
  scale: number
}): {lodLevel: 0 | 1 | 2 | 3; renderQuality: 'full' | 'interactive'} {
  let lodLevel: 0 | 1 | 2 | 3 =
    options.shapeCount >= 50_000 || options.imageCount >= 1_000
      ? 2
      : options.shapeCount >= 10_000 || options.imageCount >= 250
        ? 1
        : 0

  if (options.scale < 0.35 && lodLevel < 3) {
    lodLevel = (lodLevel + 1) as 0 | 1 | 2 | 3
  }

  return {
    lodLevel,
    renderQuality: lodLevel >= 2 ? 'interactive' : 'full',
  }
}

export interface Canvas2DRenderDiagnostics {
  drawCount: number
  drawMs: number
  visibleShapeCount: number
  cacheHitCount: number
  cacheMissCount: number
  frameReuseHitCount: number
  frameReuseMissCount: number
  cacheMode: 'none' | 'frame'
}

const EMPTY_DIAGNOSTICS: Canvas2DRenderDiagnostics = {
  drawCount: 0,
  drawMs: 0,
  visibleShapeCount: 0,
  cacheHitCount: 0,
  cacheMissCount: 0,
  frameReuseHitCount: 0,
  frameReuseMissCount: 0,
  cacheMode: 'none',
}

const diagnosticsListeners = new Set<VoidFunction>()
let currentDiagnostics = EMPTY_DIAGNOSTICS

function publishDiagnostics(next: Canvas2DRenderDiagnostics) {
  currentDiagnostics = next
  diagnosticsListeners.forEach((listener) => listener())
}

export function useCanvas2DRenderDiagnostics() {
  return React.useSyncExternalStore(
    (listener) => {
      diagnosticsListeners.add(listener)
      return () => diagnosticsListeners.delete(listener)
    },
    () => currentDiagnostics,
    () => EMPTY_DIAGNOSTICS,
  )
}

interface CanvasViewportProps {
  document: EditorDocument
  renderer?: CanvasRenderer
  overlayRenderer?: CanvasOverlayRenderer
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  onPointerMove?: (pointer: PointerState) => void
  onPointerDown?: (
    pointer: PointerState,
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ) => void
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onViewportChange?: (viewport: CanvasViewportState) => void
  onViewportPan?: (deltaX: number, deltaY: number) => void
  onViewportResize?: (width: number, height: number) => void
  onViewportZoom?: (nextScale: number, anchor?: {x: number; y: number}) => void
  onRenderLodChange?: (state: {
    level: 0 | 1 | 2 | 3
    renderQuality: 'full' | 'interactive'
    shapeCount: number
    imageCount: number
    scale: number
  }) => void
}

export function CanvasViewport({
  document,
  renderer: Renderer,
  overlayRenderer: OverlayRenderer,
  shapes,
  stats,
  viewport,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onViewportChange,
  onViewportPan,
  onViewportResize,
  onViewportZoom,
  onRenderLodChange,
}: CanvasViewportProps) {
  const imageCount = React.useMemo(
    () => document.shapes.reduce((count, shape) => count + (shape.type === 'image' ? 1 : 0), 0),
    [document.shapes],
  )
  const lodProfile = React.useMemo(
    () => resolveCanvasLodProfile({
      shapeCount: stats.shapeCount,
      imageCount,
      scale: viewport.scale,
    }),
    [imageCount, stats.shapeCount, viewport.scale],
  )

  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const viewportStateRef = React.useRef(viewport)
  const onViewportChangeRef = React.useRef(onViewportChange)
  const onViewportPanRef = React.useRef(onViewportPan)
  const onViewportZoomRef = React.useRef(onViewportZoom)
  const onPointerMoveRef = React.useRef(onPointerMove)
  const onPointerDownRef = React.useRef(onPointerDown)
  const onPointerUpRef = React.useRef(onPointerUp)
  const onPointerLeaveRef = React.useRef(onPointerLeave)

  viewportStateRef.current = viewport
  onViewportChangeRef.current = onViewportChange
  onViewportPanRef.current = onViewportPan
  onViewportZoomRef.current = onViewportZoom
  onPointerMoveRef.current = onPointerMove
  onPointerDownRef.current = onPointerDown
  onPointerUpRef.current = onPointerUp
  onPointerLeaveRef.current = onPointerLeave

  React.useEffect(() => {
    onRenderLodChange?.({
      level: lodProfile.lodLevel,
      renderQuality: lodProfile.renderQuality,
      shapeCount: stats.shapeCount,
      imageCount,
      scale: viewport.scale,
    })
  }, [imageCount, lodProfile.lodLevel, lodProfile.renderQuality, onRenderLodChange, stats.shapeCount, viewport.scale])

  React.useEffect(() => {
    if (!viewportRef.current || !onViewportResize || typeof ResizeObserver === 'undefined') {
      return
    }

    const node = viewportRef.current
    // Ensure runtime gets a usable viewport size before the first observer tick.
    onViewportResize(node.clientWidth, node.clientHeight)
    const observer = new ResizeObserver(([entry]) => {
      onViewportResize(entry.contentRect.width, entry.contentRect.height)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [onViewportResize])

  React.useEffect(() => {
    const node = viewportRef.current
    if (!node) {
      return
    }

    return bindViewportGestures({
      element: node,
      getViewportState: () => viewportStateRef.current,
      onPointerMove: (pointer) => onPointerMoveRef.current?.(pointer),
      onPointerDown: (pointer, modifiers) => onPointerDownRef.current?.(pointer, modifiers),
      onPointerUp: () => onPointerUpRef.current?.(),
      onPointerLeave: () => onPointerLeaveRef.current?.(),
      onZoomCommitViewport: (targetViewport) => {
        if (onViewportChangeRef.current) {
          onViewportChangeRef.current(targetViewport)
          return
        }

        const current = viewportStateRef.current
        if (current.scale !== targetViewport.scale) {
          onViewportZoomRef.current?.(targetViewport.scale)
        }
        const deltaX = targetViewport.offsetX - current.offsetX
        const deltaY = targetViewport.offsetY - current.offsetY
        if (deltaX !== 0 || deltaY !== 0) {
          onViewportPanRef.current?.(deltaX, deltaY)
        }
      },
      onPanCommit: (deltaX, deltaY) => {
        onViewportPanRef.current?.(deltaX, deltaY)
      },
    })
  }, [])

  return (
    <section className="stage-shell" style={{width: '100%', height: '100%'}}>
      <div
        ref={viewportRef}
        className="stage-viewport"
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          height: '100%',
          touchAction: 'none',
          overscrollBehavior: 'none',
        }}
      >
        {Renderer && (
          <Renderer
            document={document}
            shapes={shapes}
            stats={stats}
            viewport={viewport}
            renderQuality={lodProfile.renderQuality}
            lodLevel={lodProfile.lodLevel}
          />
        )}
        {OverlayRenderer && (
          <OverlayRenderer
            document={document}
            shapes={shapes}
            stats={stats}
            viewport={viewport}
          />
        )}
      </div>
    </section>
  )
}

export function Canvas2DRenderer({
  document,
  shapes,
  stats,
  viewport,
  renderQuality = 'full',
  lodLevel = 0,
  backend = 'webgl',
}: CanvasRendererProps & {backend?: 'canvas2d' | 'webgl'}) {
  const INTERACTION_SETTLE_MS = 120
  const INTERACTIVE_RENDER_INTERVAL_MS = 20
  const FULL_REDRAW_QUIET_WINDOW_MS = 140
  const FULL_REDRAW_IDLE_TIMEOUT_MS = 80
  const FULL_REDRAW_DEFER_MS = 32
  const REPLAY_TILE_SIZE = 384
  const ENABLE_WORKER_REPLAY = false
  const REPLAY_MIN_SHAPE_COUNT = 10_000
  const OVERSCAN_PX = 240
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const engineRef = React.useRef<Engine | null>(null)
  const replayWorkerRef = React.useRef<Worker | null>(null)
  const replayActiveRequestIdRef = React.useRef<number | null>(null)
  const replayRequestSeqRef = React.useRef(0)
  const replayFrameSizeRef = React.useRef<{width: number; height: number} | null>(null)
  const replayCompositorRef = React.useRef<{
    canvas: OffscreenCanvas | HTMLCanvasElement
    context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D
  } | null>(null)
  const replayPresentRafRef = React.useRef<number | null>(null)
  const [renderError, setRenderError] = React.useState<string | null>(null)
  const assetUrlByIdRef = React.useRef<Map<string, string>>(new Map())
  const imageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map())
  const appliedQualityRef = React.useRef<'full' | 'interactive' | null>(null)
  const appliedRenderSizeRef = React.useRef<{width: number; height: number} | null>(null)
  const drawSerialRef = React.useRef(0)
  const [isInteracting, setIsInteracting] = React.useState(false)
  const isInteractingRef = React.useRef(isInteracting)
  const lastInteractionAtRef = React.useRef(0)
  const previousScaleRef = React.useRef(viewport.scale)
  const interactionSettleTimerRef = React.useRef<number | null>(null)
  const deferredFullRedrawHandleRef = React.useRef<number | null>(null)
  const deferredFullRedrawTokenRef = React.useRef(0)
  const renderSchedulerRef = React.useRef<EngineRenderScheduler | null>(null)
  const replayScenePayload = React.useMemo<CreateEngineSceneFromRuntimeSnapshotOptions>(
    () => ({
      document,
      shapes,
      revision: stats.version,
      backgroundFill: '#ffffff',
      backgroundStroke: '#d0d7de',
    }),
    [document, shapes, stats.version],
  )
  const engineScene = React.useMemo(
    () => createEngineSceneFromRuntimeSnapshot(replayScenePayload),
    [replayScenePayload],
  )
  const shouldUseWorkerReplay = ENABLE_WORKER_REPLAY && stats.shapeCount >= REPLAY_MIN_SHAPE_COUNT

  isInteractingRef.current = isInteracting

  const cancelDeferredFullRedraw = React.useCallback(() => {
    if (deferredFullRedrawHandleRef.current === null) {
      return
    }

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (idleApi.cancelIdleCallback) {
      idleApi.cancelIdleCallback(deferredFullRedrawHandleRef.current)
    } else {
      window.clearTimeout(deferredFullRedrawHandleRef.current)
    }

    deferredFullRedrawHandleRef.current = null
  }, [])

  const cancelScheduledRender = React.useCallback(() => {
    renderSchedulerRef.current?.cancel()
  }, [])

  const requestEngineRender = React.useCallback((mode: 'interactive' | 'normal' = 'normal') => {
    renderSchedulerRef.current?.request(mode)
  }, [])

  const cancelWorkerReplay = React.useCallback(() => {
    const requestId = replayActiveRequestIdRef.current
    if (!replayWorkerRef.current || requestId === null) {
      return
    }

    replayWorkerRef.current.postMessage({
      type: 'cancel',
      requestId,
    })
    if (replayPresentRafRef.current !== null) {
      window.cancelAnimationFrame(replayPresentRafRef.current)
      replayPresentRafRef.current = null
    }
    replayActiveRequestIdRef.current = null
    replayFrameSizeRef.current = null
  }, [])

  const presentReplayCompositor = React.useCallback(() => {
    replayPresentRafRef.current = null
    const canvas = canvasRef.current
    const compositor = replayCompositorRef.current
    const frameSize = replayFrameSizeRef.current
    if (!canvas || !compositor || !frameSize) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.drawImage(
      compositor.canvas as CanvasImageSource,
      0,
      0,
      frameSize.width,
      frameSize.height,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    context.restore()
  }, [])

  const scheduleReplayPresent = React.useCallback(() => {
    if (replayPresentRafRef.current !== null) {
      return
    }
    replayPresentRafRef.current = window.requestAnimationFrame(() => {
      presentReplayCompositor()
    })
  }, [presentReplayCompositor])

  const ensureReplayCompositor = React.useCallback((width: number, height: number) => {
    const current = replayCompositorRef.current
    if (current && current.canvas.width === width && current.canvas.height === height) {
      return current
    }

    let canvas: OffscreenCanvas | HTMLCanvasElement | null = null
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height)
    } else if (typeof globalThis.document !== 'undefined') {
      const element = globalThis.document.createElement('canvas')
      element.width = width
      element.height = height
      canvas = element
    }

    if (!canvas) {
      replayCompositorRef.current = null
      return null
    }

    const context = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
    if (!context) {
      replayCompositorRef.current = null
      return null
    }

    replayCompositorRef.current = {
      canvas,
      context,
    }
    return replayCompositorRef.current
  }, [])

  React.useEffect(() => {
    assetUrlByIdRef.current = buildDocumentImageAssetUrlMap(document)
  }, [document])

  React.useEffect(() => {
    if (typeof Worker === 'undefined') {
      return
    }

    const worker = new Worker(new URL('./bitmapReplay.worker.ts', import.meta.url), {type: 'module'})
    replayWorkerRef.current = worker
    worker.onmessage = (event: MessageEvent<EngineReplayWorkerEvent>) => {
      const message = event.data
      const activeRequestId = replayActiveRequestIdRef.current

      if (message.type === 'tile' && message.requestId !== activeRequestId) {
        message.bitmap.close()
        return
      }
      if (message.requestId !== activeRequestId) {
        return
      }

      if (message.type === 'start') {
        replayFrameSizeRef.current = {
          width: message.width,
          height: message.height,
        }
        const compositor = ensureReplayCompositor(message.width, message.height)
        compositor?.context.clearRect(0, 0, message.width, message.height)
        return
      }

      if (message.type === 'tile') {
        const canvas = canvasRef.current
        const frameSize = replayFrameSizeRef.current
        const compositor = ensureReplayCompositor(message.width, message.height)
        if (!canvas || !frameSize || !compositor) {
          message.bitmap.close()
          return
        }

        compositor.context.drawImage(
          message.bitmap,
          0,
          0,
          message.width,
          message.height,
          message.x,
          message.y,
          message.width,
          message.height,
        )
        message.bitmap.close()
        return
      }

      if (message.type === 'done') {
        scheduleReplayPresent()
      }
      replayActiveRequestIdRef.current = null
      replayFrameSizeRef.current = null
      if (message.type === 'error') {
        setRenderError(message.error)
        void engineRef.current?.renderFrame().catch((error: unknown) => {
          setRenderError(error instanceof Error ? error.message : 'Failed to render engine frame')
        })
      }
    }

    return () => {
      if (replayPresentRafRef.current !== null) {
        window.cancelAnimationFrame(replayPresentRafRef.current)
        replayPresentRafRef.current = null
      }
      replayActiveRequestIdRef.current = null
      replayFrameSizeRef.current = null
      replayWorkerRef.current = null
      worker.terminate()
    }
  }, [ensureReplayCompositor, scheduleReplayPresent])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    setRenderError(null)

    // WebGL renderer is currently a plan/instance skeleton and does not commit
    // actual draw calls yet, so app surfaces should stay on Canvas2D for now.
    const resolvedBackend = backend === 'webgl'
      ? 'canvas2d'
      : backend
    let engine: Engine
    try {
      engine = createEngine({
        canvas,
        backend: resolvedBackend,
        performance: {
          culling: true,
        },
        render: {
          quality: 'full',
          canvasClearColor: '#f3f4f6',
        },
        resource: {
          loader: {
            resolveImage: (assetId) => {
              const src = assetUrlByIdRef.current.get(assetId)
              if (!src) {
                return null
              }

              const cached = imageCacheRef.current.get(src)
              if (cached) {
                return cached.complete && cached.naturalWidth > 0
                  ? cached
                  : null
              }

              const image = new Image()
              image.decoding = 'async'
              image.src = src
              imageCacheRef.current.set(src, image)
              return null
            },
          },
        },
        debug: {
          onStats: (nextStats) => {
            drawSerialRef.current += 1
            publishDiagnostics({
              drawCount: drawSerialRef.current,
              drawMs: nextStats.frameMs,
              visibleShapeCount: nextStats.visibleCount,
              cacheHitCount: nextStats.cacheHits,
              cacheMissCount: nextStats.cacheMisses,
              frameReuseHitCount: nextStats.frameReuseHits,
              frameReuseMissCount: nextStats.frameReuseMisses,
              cacheMode: nextStats.frameReuseHits > 0 ? 'frame' : 'none',
            })
          },
        },
      })
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : 'Failed to initialize engine renderer')
      return
    }
    engineRef.current = engine
    renderSchedulerRef.current = createEngineRenderScheduler({
      render: () => engine.renderFrame(),
      interactiveIntervalMs: INTERACTIVE_RENDER_INTERVAL_MS,
      onError: (error) => {
        setRenderError(error instanceof Error ? error.message : 'Failed to render engine frame')
      },
    })

    return () => {
      cancelDeferredFullRedraw()
      cancelWorkerReplay()
      cancelScheduledRender()
      if (interactionSettleTimerRef.current !== null) {
        window.clearTimeout(interactionSettleTimerRef.current)
        interactionSettleTimerRef.current = null
      }
      renderSchedulerRef.current?.dispose()
      renderSchedulerRef.current = null
      appliedQualityRef.current = null
      appliedRenderSizeRef.current = null
      engineRef.current = null
      engine.dispose()
    }
  }, [backend, cancelDeferredFullRedraw, cancelScheduledRender, cancelWorkerReplay])

  React.useEffect(() => {
    lastInteractionAtRef.current = performance.now()
    previousScaleRef.current = viewport.scale
    setIsInteracting(true)
    if (interactionSettleTimerRef.current !== null) {
      window.clearTimeout(interactionSettleTimerRef.current)
    }
    interactionSettleTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false)
      interactionSettleTimerRef.current = null
    }, INTERACTION_SETTLE_MS)
  }, [INTERACTION_SETTLE_MS, viewport.offsetX, viewport.offsetY, viewport.scale])

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine) {
      return
    }

    try {
      engine.loadScene(engineScene)
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : 'Failed to load engine scene')
      return
    }

    requestEngineRender('normal')
  }, [engineScene, requestEngineRender])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (!canvas || !engine) {
      return
    }

    // Avoid mutating DPR/quality every frame; `setDpr` triggers renderer resize.
    const nextQuality: 'full' | 'interactive' =
      isInteracting || renderQuality === 'interactive' || lodLevel >= 2
        ? 'interactive'
        : 'full'
    if (appliedQualityRef.current !== nextQuality) {
      engine.setQuality(nextQuality)
      appliedQualityRef.current = nextQuality
    }

    const fallbackWidth = canvas.clientWidth || canvas.parentElement?.clientWidth || 0
    const fallbackHeight = canvas.clientHeight || canvas.parentElement?.clientHeight || 0
    const width = Math.max(1, Math.floor(viewport.viewportWidth > 1 ? viewport.viewportWidth : fallbackWidth))
    const height = Math.max(1, Math.floor(viewport.viewportHeight > 1 ? viewport.viewportHeight : fallbackHeight))

    const renderWidth = width + OVERSCAN_PX * 2
    const renderHeight = height + OVERSCAN_PX * 2
    if (
      !appliedRenderSizeRef.current ||
      appliedRenderSizeRef.current.width !== renderWidth ||
      appliedRenderSizeRef.current.height !== renderHeight
    ) {
      engine.resize(renderWidth, renderHeight)
      appliedRenderSizeRef.current = {width: renderWidth, height: renderHeight}
    }
    engine.setViewport({
      viewportWidth: renderWidth,
      viewportHeight: renderHeight,
      offsetX: viewport.offsetX + OVERSCAN_PX,
      offsetY: viewport.offsetY + OVERSCAN_PX,
      scale: viewport.scale,
    })

    if (isInteracting) {
      cancelDeferredFullRedraw()
      cancelWorkerReplay()
      cancelScheduledRender()
      requestEngineRender('interactive')
      return
    }

    // Defer full-quality redraw so a quick next pan can cancel it and keep
    // interaction input responsive on very large scenes.
    cancelDeferredFullRedraw()
    const redrawToken = ++deferredFullRedrawTokenRef.current
    const runDeferredFullRedraw = () => {
      if (deferredFullRedrawTokenRef.current !== redrawToken || isInteractingRef.current) {
        return
      }

      const quietForMs = performance.now() - lastInteractionAtRef.current
      if (quietForMs < FULL_REDRAW_QUIET_WINDOW_MS) {
        deferredFullRedrawHandleRef.current = window.setTimeout(() => {
          deferredFullRedrawHandleRef.current = null
          runDeferredFullRedraw()
        }, Math.max(0, FULL_REDRAW_QUIET_WINDOW_MS - quietForMs))
        return
      }

      if (!shouldUseWorkerReplay || !replayWorkerRef.current) {
        requestEngineRender('normal')
        return
      }

      const requestId = ++replayRequestSeqRef.current
      replayActiveRequestIdRef.current = requestId
      replayFrameSizeRef.current = {
        width: renderWidth,
        height: renderHeight,
      }
      const request: EngineReplayRenderRequest<CreateEngineSceneFromRuntimeSnapshotOptions> = {
        type: 'render',
        requestId,
        width: renderWidth,
        height: renderHeight,
        tileSize: REPLAY_TILE_SIZE,
        viewport: {
          viewportWidth: renderWidth,
          viewportHeight: renderHeight,
          offsetX: viewport.offsetX + OVERSCAN_PX,
          offsetY: viewport.offsetY + OVERSCAN_PX,
          scale: viewport.scale,
        },
        scene: replayScenePayload,
      }
      replayWorkerRef.current.postMessage(request)
    }

    const idleApi = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    }
    if (idleApi.requestIdleCallback) {
      deferredFullRedrawHandleRef.current = idleApi.requestIdleCallback(() => {
        deferredFullRedrawHandleRef.current = null
        runDeferredFullRedraw()
      }, {timeout: FULL_REDRAW_IDLE_TIMEOUT_MS})
      return
    }

    deferredFullRedrawHandleRef.current = window.setTimeout(() => {
      deferredFullRedrawHandleRef.current = null
      runDeferredFullRedraw()
    }, FULL_REDRAW_DEFER_MS)
  }, [
    FULL_REDRAW_DEFER_MS,
    FULL_REDRAW_IDLE_TIMEOUT_MS,
    FULL_REDRAW_QUIET_WINDOW_MS,
    cancelDeferredFullRedraw,
    cancelScheduledRender,
    cancelWorkerReplay,
    isInteracting,
    replayScenePayload,
    shouldUseWorkerReplay,
    viewport,
    requestEngineRender,
  ])

  React.useEffect(() => {
    imageCacheRef.current.clear()
  }, [document.id])

  return <>
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'absolute',
        left: -OVERSCAN_PX,
        top: -OVERSCAN_PX,
        width: `calc(100% + ${OVERSCAN_PX * 2}px)`,
        height: `calc(100% + ${OVERSCAN_PX * 2}px)`,
        pointerEvents: 'none',
      }}
    />
    {renderError && <div
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        borderRadius: 12,
        border: '1px solid rgba(248,113,113,0.45)',
        background: 'rgba(127,29,29,0.86)',
        color: '#fee2e2',
        padding: '10px 12px',
        fontSize: 12,
        lineHeight: 1.5,
        pointerEvents: 'none',
        backdropFilter: 'blur(2px)',
      }}
    >
      Engine renderer error: {renderError}
    </div>}
  </>
}

export function CanvasSelectionOverlay({
  shapes,
  viewport,
}: CanvasOverlayProps) {
  const selectedShapes = React.useMemo(
    () => shapes.filter((shape) => shape.isSelected),
    [shapes],
  )
  const hoveredShape = React.useMemo(
    () => shapes.find((shape) => shape.isHovered) ?? null,
    [shapes],
  )

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {selectedShapes.map((shape) => {
        const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
        const x = bounds.minX * viewport.matrix[0] + viewport.matrix[2]
        const y = bounds.minY * viewport.matrix[4] + viewport.matrix[5]
        const width = (bounds.maxX - bounds.minX) * viewport.matrix[0]
        const height = (bounds.maxY - bounds.minY) * viewport.matrix[4]
        return (
          <rect
            key={`selected:${shape.id}`}
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      {hoveredShape && !hoveredShape.isSelected && (() => {
        const bounds = getNormalizedBoundsFromBox(hoveredShape.x, hoveredShape.y, hoveredShape.width, hoveredShape.height)
        const x = bounds.minX * viewport.matrix[0] + viewport.matrix[2]
        const y = bounds.minY * viewport.matrix[4] + viewport.matrix[5]
        const width = (bounds.maxX - bounds.minX) * viewport.matrix[0]
        const height = (bounds.maxY - bounds.minY) * viewport.matrix[4]
        return (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke="rgba(14,165,233,0.9)"
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )
      })()}
    </svg>
  )
}
