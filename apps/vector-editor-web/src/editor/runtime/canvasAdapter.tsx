import * as React from 'react'
import {type EditorDocument} from '@venus/document-core'
import type {CanvasViewportState} from '@vector/runtime'
import type {
  Engine,
  EngineRenderScheduler,
  EngineReplayRenderRequest,
  EngineReplayWorkerEvent,
} from '@vector/runtime/engine'
import {
  createEngine,
  createEngineRenderScheduler,
} from '@vector/runtime/engine'
import {
  bindViewportGestures,
  resolveCanvasLodProfile,
  type ViewportGestureBindingOptions,
} from '../interaction/runtime/index.ts'
import {
  buildDocumentImageAssetUrlMap,
  createEngineSceneFromRuntimeSnapshot,
  type CreateEngineSceneFromRuntimeSnapshotOptions,
} from '@vector/runtime/presets'
import type {SceneShapeSnapshot, SceneStats} from '@vector/runtime/shared-memory'
import {prepareRenderFrame} from '../render-prep/prepareFrame.ts'

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

interface CanvasViewportProps {
  document: EditorDocument
  renderer?: CanvasRenderer
  overlayRenderer?: CanvasOverlayRenderer
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  onPointerMove?: ViewportGestureBindingOptions['onPointerMove']
  onPointerDown?: ViewportGestureBindingOptions['onPointerDown']
  onPointerUp?: VoidFunction
  onPointerLeave?: VoidFunction
  onViewportChange?: (viewport: CanvasViewportState) => void
  onViewportPan?: (deltaX: number, deltaY: number) => void
  onViewportResize?: (width: number, height: number) => void
  onViewportZoom?: (nextScale: number, anchor?: {x: number; y: number}) => void
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
    if (!viewportRef.current || !onViewportResize || typeof ResizeObserver === 'undefined') {
      return
    }

    const node = viewportRef.current
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
    <section className={'flex h-full w-full min-h-0 min-w-0'}>
      <div
        ref={viewportRef}
        className={'relative h-full w-full min-h-0 min-w-0 overflow-hidden'}
        style={{
          background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.8), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)',
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
  const assetUrlByIdRef = React.useRef<Map<string, string>>(new Map())
  const imageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map())
  const appliedQualityRef = React.useRef<'full' | 'interactive' | null>(null)
  const appliedRenderSizeRef = React.useRef<{width: number; height: number} | null>(null)
  const [isInteracting, setIsInteracting] = React.useState(false)
  const isInteractingRef = React.useRef(isInteracting)
  const lastInteractionAtRef = React.useRef(0)
  const previousScaleRef = React.useRef(viewport.scale)
  const interactionSettleTimerRef = React.useRef<number | null>(null)
  const deferredFullRedrawHandleRef = React.useRef<number | null>(null)
  const deferredFullRedrawTokenRef = React.useRef(0)
  const renderSchedulerRef = React.useRef<EngineRenderScheduler | null>(null)
  const previousRenderPrepRef = React.useRef<{
    document: EditorDocument
    shapes: SceneShapeSnapshot[]
    viewport: CanvasViewportState
  } | null>(null)
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
        void engineRef.current?.renderFrame()
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

    const resolvedBackend = backend
    const engine = createEngine({
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
    })
    engineRef.current = engine
    renderSchedulerRef.current = createEngineRenderScheduler({
      render: () => engine.renderFrame(),
      interactiveIntervalMs: INTERACTIVE_RENDER_INTERVAL_MS,
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

    const previous = previousRenderPrepRef.current
    const preparedFrame = prepareRenderFrame({
      revision: stats.version,
      document,
      previousDocument: previous?.document ?? null,
      shapes,
      previousShapes: previous?.shapes ?? [],
      overlay: {
        selectedShapeIds: shapes.filter((shape) => shape.isSelected).map((shape) => shape.id),
        hoveredShapeId: shapes.find((shape) => shape.isHovered)?.id ?? null,
        marqueeActive: false,
        snapGuideCount: 0,
      },
      includePicking: false,
      cameraDirty:
        !previous ||
        previous.viewport.scale !== viewport.scale ||
        previous.viewport.offsetX !== viewport.offsetX ||
        previous.viewport.offsetY !== viewport.offsetY ||
        previous.viewport.viewportWidth !== viewport.viewportWidth ||
        previous.viewport.viewportHeight !== viewport.viewportHeight,
    })

    if (preparedFrame.scene.dirty) {
      const nextEngineScene = createEngineSceneFromRuntimeSnapshot(replayScenePayload)
      if (preparedFrame.dirtyState.sceneStructureDirty || !previous) {
        engine.loadScene(nextEngineScene)
      } else {
        const changedIdSet = new Set(preparedFrame.dirtyState.sceneInstanceIds)
        const upsertNodes = nextEngineScene.nodes.filter((node) => changedIdSet.has(node.id))

        if (upsertNodes.length > 0) {
          engine.applyScenePatchBatch({
            patches: [{
              revision: stats.version,
              upsertNodes,
            }],
          })
        }
      }
      requestEngineRender('normal')
    }

    previousRenderPrepRef.current = {
      document,
      shapes,
      viewport,
    }
  }, [
    document,
    replayScenePayload,
    requestEngineRender,
    shapes,
    stats.version,
    viewport,
  ])

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

    const width = Math.max(1, Math.floor(viewport.viewportWidth))
    const height = Math.max(1, Math.floor(viewport.viewportHeight))
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

  return (
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
  )
}
