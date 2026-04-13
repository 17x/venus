import * as React from 'react'
import {
  applyMatrixToPoint,
  DEFAULT_CANVAS_PRESENTATION_CONFIG,
  type CanvasPresentationConfig,
} from '@venus/runtime'
import type {CanvasViewportState} from '@venus/runtime'
import type {EditorDocument} from '@venus/document-core'
import {
  buildEngineSelectionHandlesFromBounds,
  createAffineMatrixAroundPoint,
  createEngine,
  createEngineRenderScheduler,
  getNormalizedBoundsFromBox,
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
  type Engine,
  type EngineRenderScheduler,
  type EngineReplayRenderRequest,
  type EngineReplayWorkerEvent,
} from '@venus/runtime/engine'
import {bindViewportGestures, resolveCanvasLodProfile} from '@venus/runtime/interaction'
import type {PointerState, SceneShapeSnapshot, SceneStats} from '@venus/shared-memory'
import {
  buildDocumentImageAssetUrlMap,
  createEngineSceneFromRuntimeSnapshot,
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '@venus/runtime/presets'

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
  hoveredShapeId?: string | null
  presentation?: CanvasPresentationConfig
}

export type CanvasRenderer = React.ComponentType<CanvasRendererProps>
export type CanvasOverlayRenderer = React.ComponentType<CanvasOverlayProps>

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
      coalescePointerMove: false,
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
  document,
  shapes,
  viewport,
  hoveredShapeId,
  presentation = DEFAULT_CANVAS_PRESENTATION_CONFIG,
}: CanvasOverlayProps) {
  const selectionState = React.useMemo(
    () => buildPlaygroundSelectionState(shapes),
    [shapes],
  )
  const selectedShapes = React.useMemo(
    () => selectionState.selectedIds
      .map((id) => document.shapes.find((shape) => shape.id === id))
      .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape)),
    [document.shapes, selectionState.selectedIds],
  )
  const singleSelectedShape = React.useMemo(
    () => selectedShapes.length === 1 ? selectedShapes[0] : null,
    [selectedShapes],
  )
  const hoveredShape = React.useMemo(() => {
    if (!hoveredShapeId) {
      return null
    }

    const shape = document.shapes.find((item) => item.id === hoveredShapeId) ?? null
    if (!shape || selectionState.selectedIds.includes(shape.id)) {
      return null
    }
    return shape
  }, [document.shapes, hoveredShapeId, selectionState.selectedIds])
  const selectedPolygon = React.useMemo(() => {
    if (!selectionState.selectedBounds) {
      return null
    }

    const rotation = singleSelectedShape?.rotation ?? 0
    return buildRectPolygon(selectionState.selectedBounds, rotation)
  }, [selectionState.selectedBounds, singleSelectedShape?.rotation])
  const handles = React.useMemo(() => {
    if (!selectionState.selectedBounds) {
      return []
    }

    return buildEngineSelectionHandlesFromBounds(selectionState.selectedBounds, {
      rotateDegrees: singleSelectedShape?.rotation ?? 0,
      rotateOffset: 28,
    })
  }, [selectionState.selectedBounds, singleSelectedShape?.rotation])
  const screenHandles = React.useMemo(
    () => handles.map((handle) => ({
      ...handle,
      ...applyMatrixToPoint(viewport.matrix, handle),
    })),
    [handles, viewport.matrix],
  )
  const handleSize = presentation.overlay.handleSize
  const halfHandleSize = handleSize / 2

  return (
    <div
      role="region"
      aria-label="playground-overlay-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        role="img"
        aria-label="playground-overlay-svg"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <g
          role="group"
          aria-label="playground-overlay-world-group"
          transform={`matrix(${viewport.matrix[0]}, ${viewport.matrix[3]}, ${viewport.matrix[1]}, ${viewport.matrix[4]}, ${viewport.matrix[2]}, ${viewport.matrix[5]})`}
        >
          {hoveredShape && renderPlaygroundShapeStroke(hoveredShape, 'hover', presentation)}
          {selectedShapes.map((shape) => renderPlaygroundShapeStroke(shape, 'selected', presentation))}

          {selectedPolygon && (
            <polygon
              role="presentation"
              points={toSvgPoints(selectedPolygon)}
              fill="none"
              stroke={presentation.overlay.selectionStroke}
              strokeWidth={presentation.overlay.selectionStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>

        {screenHandles.map((handle) => (
          <rect
            role="presentation"
            key={handle.id}
            x={handle.x - halfHandleSize}
            y={handle.y - halfHandleSize}
            width={handleSize}
            height={handleSize}
            rx={handle.kind === 'rotate' ? handleSize / 2 : 2}
            ry={handle.kind === 'rotate' ? handleSize / 2 : 2}
            fill={presentation.overlay.handleFill}
            stroke={presentation.overlay.handleStroke}
            strokeWidth={presentation.overlay.selectionStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  )
}

function buildPlaygroundSelectionState(snapshots: SceneShapeSnapshot[]) {
  const selectedIds = snapshots.filter((shape) => shape.isSelected).map((shape) => shape.id)
  const selectedSnapshots = snapshots.filter((shape) => shape.isSelected)

  let selectedBounds: {minX: number; minY: number; maxX: number; maxY: number} | null = null
  selectedSnapshots.forEach((snapshot) => {
    const bounds = getNormalizedBoundsFromBox(snapshot.x, snapshot.y, snapshot.width, snapshot.height)

    selectedBounds = selectedBounds
      ? {
          minX: Math.min(selectedBounds.minX, bounds.minX),
          minY: Math.min(selectedBounds.minY, bounds.minY),
          maxX: Math.max(selectedBounds.maxX, bounds.maxX),
          maxY: Math.max(selectedBounds.maxY, bounds.maxY),
        }
      : {
          minX: bounds.minX,
          minY: bounds.minY,
          maxX: bounds.maxX,
          maxY: bounds.maxY,
        }
  })

  return {
    selectedIds,
    selectedBounds,
  }
}

function renderPlaygroundShapeStroke(
  shape: EditorDocument['shapes'][number],
  tone: 'selected' | 'hover',
  presentation: CanvasPresentationConfig,
) {
  if (shape.type === 'group') {
    return null
  }

  const common = {
    role: 'presentation' as const,
    fill: 'none',
    stroke: tone === 'selected'
      ? presentation.overlay.selectionStroke
      : presentation.overlay.hoverStroke,
    strokeWidth: presentation.overlay.selectionStrokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }
  const key = `${tone}-stroke:${shape.id}`
  const transformState = resolveNodeTransform(shape)
  const transform = toResolvedNodeSvgTransform(transformState)

  if (shape.type === 'ellipse') {
    return (
      <ellipse
        key={key}
        cx={transformState.center.x}
        cy={transformState.center.y}
        rx={transformState.bounds.width / 2}
        ry={transformState.bounds.height / 2}
        transform={transform}
        {...common}
      />
    )
  }

  if ((shape.type === 'polygon' || shape.type === 'star') && shape.points && shape.points.length >= 3) {
    return (
      <polygon
        key={key}
        points={shape.points.map((point) => `${point.x},${point.y}`).join(' ')}
        transform={transform}
        {...common}
      />
    )
  }

  if (shape.type === 'lineSegment') {
    return (
      <line
        key={key}
        x1={shape.x}
        y1={shape.y}
        x2={shape.x + shape.width}
        y2={shape.y + shape.height}
        transform={transform}
        {...common}
      />
    )
  }

  if (shape.type === 'path') {
    const d = buildPlaygroundPathStrokeD(shape)
    if (!d) {
      return null
    }
    return (
      <path
        key={key}
        d={d}
        transform={transform}
        {...common}
      />
    )
  }

  if (shape.type === 'rectangle' || shape.type === 'frame') {
    const roundedRectD = buildPlaygroundRoundedRectStrokeD(shape)
    if (roundedRectD) {
      return (
        <path
          key={key}
          d={roundedRectD}
          transform={transform}
          {...common}
        />
      )
    }
  }

  return (
    <rect
      key={key}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      transform={transform}
      {...common}
    />
  )
}

function buildPlaygroundPathStrokeD(shape: EditorDocument['shapes'][number]) {
  if (shape.bezierPoints && shape.bezierPoints.length > 1) {
    const first = shape.bezierPoints[0]
    let d = `M ${first.anchor.x} ${first.anchor.y}`
    for (let index = 0; index < shape.bezierPoints.length - 1; index += 1) {
      const current = shape.bezierPoints[index]
      const next = shape.bezierPoints[index + 1]
      const cp1 = current.cp2 ?? current.anchor
      const cp2 = next.cp1 ?? next.anchor
      d += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.anchor.x} ${next.anchor.y}`
    }
    return d
  }

  if (shape.points && shape.points.length > 1) {
    const [first, ...rest] = shape.points
    return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(' ')}`
  }

  return null
}

function buildPlaygroundRoundedRectStrokeD(shape: EditorDocument['shapes'][number]) {
  const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
  const width = Math.max(0, bounds.width)
  const height = Math.max(0, bounds.height)
  if (width <= 0 || height <= 0) {
    return null
  }

  const radii = resolvePlaygroundRoundedRectCornerRadii(shape, bounds)
  const hasRoundedCorners = radii.topLeft > 0 || radii.topRight > 0 || radii.bottomRight > 0 || radii.bottomLeft > 0
  if (!hasRoundedCorners) {
    return null
  }

  const minX = bounds.minX
  const minY = bounds.minY
  const maxX = bounds.maxX
  const maxY = bounds.maxY

  return [
    `M ${minX + radii.topLeft} ${minY}`,
    `L ${maxX - radii.topRight} ${minY}`,
    `A ${radii.topRight} ${radii.topRight} 0 0 1 ${maxX} ${minY + radii.topRight}`,
    `L ${maxX} ${maxY - radii.bottomRight}`,
    `A ${radii.bottomRight} ${radii.bottomRight} 0 0 1 ${maxX - radii.bottomRight} ${maxY}`,
    `L ${minX + radii.bottomLeft} ${maxY}`,
    `A ${radii.bottomLeft} ${radii.bottomLeft} 0 0 1 ${minX} ${maxY - radii.bottomLeft}`,
    `L ${minX} ${minY + radii.topLeft}`,
    `A ${radii.topLeft} ${radii.topLeft} 0 0 1 ${minX + radii.topLeft} ${minY}`,
    'Z',
  ].join(' ')
}

interface PlaygroundRoundedRectCornerRadii {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

function resolvePlaygroundRoundedRectCornerRadii(
  shape: Pick<EditorDocument['shapes'][number], 'cornerRadius' | 'cornerRadii'>,
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
): PlaygroundRoundedRectCornerRadii {
  const width = Math.max(0, bounds.maxX - bounds.minX)
  const height = Math.max(0, bounds.maxY - bounds.minY)
  const fallback = Math.max(0, shape.cornerRadius ?? 0)
  const requested: PlaygroundRoundedRectCornerRadii = {
    topLeft: Math.max(0, shape.cornerRadii?.topLeft ?? fallback),
    topRight: Math.max(0, shape.cornerRadii?.topRight ?? fallback),
    bottomRight: Math.max(0, shape.cornerRadii?.bottomRight ?? fallback),
    bottomLeft: Math.max(0, shape.cornerRadii?.bottomLeft ?? fallback),
  }

  if (width <= 0 || height <= 0) {
    return {
      topLeft: 0,
      topRight: 0,
      bottomRight: 0,
      bottomLeft: 0,
    }
  }

  const horizontalTop = requested.topLeft + requested.topRight
  const horizontalBottom = requested.bottomLeft + requested.bottomRight
  const verticalLeft = requested.topLeft + requested.bottomLeft
  const verticalRight = requested.topRight + requested.bottomRight
  const scale = Math.min(
    1,
    horizontalTop > 0 ? width / horizontalTop : 1,
    horizontalBottom > 0 ? width / horizontalBottom : 1,
    verticalLeft > 0 ? height / verticalLeft : 1,
    verticalRight > 0 ? height / verticalRight : 1,
  )

  return {
    topLeft: requested.topLeft * scale,
    topRight: requested.topRight * scale,
    bottomRight: requested.bottomRight * scale,
    bottomLeft: requested.bottomLeft * scale,
  }
}

function buildRectPolygon(
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
  rotationDegrees: number,
) {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const corners = [
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
  ]
  if (Math.abs(rotationDegrees) <= 0.0001) {
    return corners
  }

  const matrix = createAffineMatrixAroundPoint(
    {x: centerX, y: centerY},
    {rotationDegrees},
  )

  return corners.map((point) => ({
    x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
    y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
  }))
}

function toSvgPoints(points: Array<{x: number; y: number}>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}
