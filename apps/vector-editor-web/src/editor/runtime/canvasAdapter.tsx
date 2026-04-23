import * as React from 'react'
import {type EditorDocument} from '@venus/document-core'
import type {CanvasViewportState} from '@vector/runtime'
import type {
  Engine,
  EngineRenderScheduler,
} from '@vector/runtime/engine'
import {
  createEngine,
  createEngineRenderScheduler,
} from '@vector/runtime/engine'
import {
  bindViewportGestures,
  resolveCanvasLodProfile,
  type ViewportGestureBindingOptions,
} from '../../runtime/interaction/index.ts'
import {
  publishRuntimeRenderDiagnostics,
  publishRuntimeViewportSnapshot,
} from '../../runtime/events/index.ts'
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
  targetDpr?: number | 'auto'
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

const MAX_DIRTY_REGION_MARK_NODES = 256

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
  const VIEWPORT_VELOCITY_SETTLE_MS = 110
  const VIEWPORT_ZOOM_VELOCITY_WEIGHT = 520
  const imageCount = React.useMemo(
    () => document.shapes.reduce((count, shape) => count + (shape.type === 'image' ? 1 : 0), 0),
    [document.shapes],
  )
  const [viewportVelocity, setViewportVelocity] = React.useState(0)
  const previousLodLevelRef = React.useRef<0 | 1 | 2 | 3>(0)
  const velocitySettleHandleRef = React.useRef<number | null>(null)
  const viewportMotionRef = React.useRef({
    offsetX: viewport.offsetX,
    offsetY: viewport.offsetY,
    scale: viewport.scale,
    at: performance.now(),
  })

  const lodProfile = React.useMemo(
    () => resolveCanvasLodProfile({
      shapeCount: stats.shapeCount,
      imageCount,
      scale: viewport.scale,
      isInteracting: viewportVelocity > 1,
      interactionVelocity: viewportVelocity,
      previousLodLevel: previousLodLevelRef.current,
    }),
    [imageCount, stats.shapeCount, viewport.scale, viewportVelocity],
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
    const now = performance.now()
    const previous = viewportMotionRef.current
    const elapsedMs = Math.max(1, now - previous.at)
    const deltaX = viewport.offsetX - previous.offsetX
    const deltaY = viewport.offsetY - previous.offsetY
    const panDistance = Math.hypot(deltaX, deltaY)
    const zoomDelta = Math.abs(Math.log2(Math.max(0.0001, viewport.scale / previous.scale)))
    const zoomDistance = zoomDelta * VIEWPORT_ZOOM_VELOCITY_WEIGHT
    const nextVelocity = ((panDistance + zoomDistance) / elapsedMs) * 1000

    setViewportVelocity((current) =>
      Math.abs(current - nextVelocity) < 24
        ? current
        : nextVelocity,
    )

    viewportMotionRef.current = {
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
      scale: viewport.scale,
      at: now,
    }

    if (velocitySettleHandleRef.current !== null) {
      window.clearTimeout(velocitySettleHandleRef.current)
    }

    velocitySettleHandleRef.current = window.setTimeout(() => {
      velocitySettleHandleRef.current = null
      setViewportVelocity(0)
    }, VIEWPORT_VELOCITY_SETTLE_MS)

    return () => {
      if (velocitySettleHandleRef.current !== null) {
        window.clearTimeout(velocitySettleHandleRef.current)
        velocitySettleHandleRef.current = null
      }
    }
  }, [
    VIEWPORT_VELOCITY_SETTLE_MS,
    VIEWPORT_ZOOM_VELOCITY_WEIGHT,
    viewport.offsetX,
    viewport.offsetY,
    viewport.scale,
  ])

  previousLodLevelRef.current = lodProfile.lodLevel

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
    publishRuntimeViewportSnapshot({
      scale: viewport.scale,
    })
  }, [viewport.scale])

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
            targetDpr={lodProfile.targetDpr}
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
  targetDpr = 'auto',
  backend = 'webgl',
}: CanvasRendererProps & {backend?: 'canvas2d' | 'webgl'}) {
  const INTERACTION_SETTLE_MS = 120
    // 12ms keeps interaction cadence near display refresh without saturating CPU.
    const INTERACTIVE_RENDER_INTERVAL_MS = 12
  const FULL_REDRAW_QUIET_WINDOW_MS = 140
  const FULL_REDRAW_IDLE_TIMEOUT_MS = 80
  const FULL_REDRAW_DEFER_MS = 32
  const OVERSCAN_PX = 240
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const engineRef = React.useRef<Engine | null>(null)
  const drawSerialRef = React.useRef(0)
  const assetUrlByIdRef = React.useRef<Map<string, string>>(new Map())
  const imageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map())
  const appliedQualityRef = React.useRef<'full' | 'interactive' | null>(null)
  const appliedDprRef = React.useRef<number | 'auto' | null>(null)
  const appliedRenderSizeRef = React.useRef<{width: number; height: number} | null>(null)
  const [isInteracting, setIsInteracting] = React.useState(false)
  const isInteractingRef = React.useRef(isInteracting)
  const lastInteractionAtRef = React.useRef(0)
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

  React.useEffect(() => {
    assetUrlByIdRef.current = buildDocumentImageAssetUrlMap(document)
  }, [document])

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
        // Enable LOD (level-of-detail) for performance with large scenes
        lod: {
          enabled: true,
          options: {
            mode: 'conservative', // conservative | moderate | aggressive
          },
        },
        // Enable tile-based caching with multiple zoom levels
        tileConfig: {
          enabled: true,
          tileSizePx: 512,
          maxCacheSize: 64,
        },
        // Enable initial render optimization with low-DPR preview
        initialRender: {
          enabled: true,
          lowDprPreview: 0.5, // Keep preview readable while still reducing startup cost
          previewDelayMs: 50,  // Show preview after 50ms
          detailPassDelayMs: 200,  // Start detail pass after 200ms
        },
        interactionPreview: {
          enabled: true,
          mode: 'zoom-only',
          maxScaleStep: 1.2,
          maxTranslatePx: 220,
        },
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
          const webglStats = nextStats as typeof nextStats & {
            webglRenderPath?: 'model-complete' | 'packet'
            webglInteractiveTextFallbackCount?: number
            webglTextTextureUploadCount?: number
            webglTextTextureUploadBytes?: number
            webglTextCacheHitCount?: number
            webglCompositeUploadBytes?: number
          }

          drawSerialRef.current += 1
          publishRuntimeRenderDiagnostics({
            drawCount: drawSerialRef.current,
            drawMs: nextStats.frameMs,
            fpsInstantaneous: 0,
            fpsEstimate: 0,
            visibleShapeCount: nextStats.visibleCount,
            cacheHitCount: nextStats.cacheHits,
            cacheMissCount: nextStats.cacheMisses,
            frameReuseHitCount: nextStats.frameReuseHits,
            frameReuseMissCount: nextStats.frameReuseMisses,
            cacheMode: nextStats.frameReuseHits > 0 ? 'frame' : 'none',
            webglRenderPath: webglStats.webglRenderPath ?? 'none',
            webglInteractiveTextFallbackCount:
              webglStats.webglInteractiveTextFallbackCount ?? 0,
            webglTextTextureUploadCount:
              webglStats.webglTextTextureUploadCount ?? 0,
            webglTextTextureUploadBytes:
              webglStats.webglTextTextureUploadBytes ?? 0,
            webglTextCacheHitCount:
              webglStats.webglTextCacheHitCount ?? 0,
            webglCompositeUploadBytes:
              webglStats.webglCompositeUploadBytes ?? 0,
          })
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
      cancelScheduledRender()
      if (interactionSettleTimerRef.current !== null) {
        window.clearTimeout(interactionSettleTimerRef.current)
        interactionSettleTimerRef.current = null
      }
      renderSchedulerRef.current?.dispose()
      renderSchedulerRef.current = null
      appliedQualityRef.current = null
      appliedDprRef.current = null
      appliedRenderSizeRef.current = null
      engineRef.current = null
      engine.dispose()
    }
  }, [backend, cancelDeferredFullRedraw, cancelScheduledRender])

  React.useEffect(() => {
    lastInteractionAtRef.current = performance.now()
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
      if (preparedFrame.dirtyState.sceneStructureDirty || !previous) {
        const nextEngineScene = createEngineSceneFromRuntimeSnapshot(replayScenePayload)
        engine.loadScene(nextEngineScene)
      } else {
        const changedIds = resolveExpandedChangedIds(preparedFrame.dirtyState.sceneInstanceIds, document)
        const incrementalScene = createEngineSceneFromRuntimeSnapshot({
          ...replayScenePayload,
          includeShapeIds: changedIds,
          includeDocumentBackground: false,
        })
        const upsertNodes = incrementalScene.nodes

        if (upsertNodes.length > 0) {
          engine.applyScenePatchBatch({
            patches: [{
              revision: stats.version,
              upsertNodes,
            }],
          })
          // Coalesce dirty marks to one merged region for large patch bursts.
          if (upsertNodes.length <= MAX_DIRTY_REGION_MARK_NODES) {
            const mergedDirtyBounds = resolveMergedNodeBounds(upsertNodes)
            if (mergedDirtyBounds) {
              engine.markDirtyBounds(mergedDirtyBounds)
            }
          }
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

    const nextDpr = isInteracting ? targetDpr : 'auto'
    if (appliedDprRef.current !== nextDpr) {
      engine.setDpr(nextDpr, {maxDpr: 2})
      appliedDprRef.current = nextDpr
    }

    // Avoid mutating render quality every frame.
    const nextQuality: 'full' | 'interactive' =
      renderQuality === 'interactive' || (isInteracting && lodLevel >= 2)
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

      requestEngineRender('normal')
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
    isInteracting,
    targetDpr,
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

function resolveMergedNodeBounds(nodes: ReadonlyArray<Record<string, unknown>>) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const node of nodes) {
    const x = typeof node.x === 'number' ? node.x : null
    const y = typeof node.y === 'number' ? node.y : null
    const width = typeof node.width === 'number' ? node.width : null
    const height = typeof node.height === 'number' ? node.height : null
    if (x === null || y === null || width === null || height === null) {
      continue
    }

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

function resolveExpandedChangedIds(
  changedIds: readonly string[],
  document: EditorDocument,
) {
  if (changedIds.length === 0) {
    return []
  }

  const changedIdSet = new Set(changedIds)
  const expanded = new Set(changedIds)

  // If a clip source changed, clipped images also need refresh.
  // If a clipped image changed, keep its clip source in the patch set too.
  for (const shape of document.shapes) {
    if (!shape.clipPathId) {
      continue
    }

    if (changedIdSet.has(shape.clipPathId)) {
      expanded.add(shape.id)
    }
    if (changedIdSet.has(shape.id)) {
      expanded.add(shape.clipPathId)
    }
  }

  return Array.from(expanded)
}
