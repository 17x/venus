import * as React from 'react'
import {getNormalizedBoundsFromBox, type EditorDocument} from '@venus/document-core'
import {bindViewportGestures} from '@venus/runtime/interaction'
import {
  buildDocumentImageAssetUrlMap,
  createEngineSceneFromRuntimeSnapshot,
} from '@venus/runtime/presets'
import type {CanvasViewportState} from '@venus/runtime'
import type {PointerState, SceneShapeSnapshot, SceneStats} from '@venus/shared-memory'
import {createEngine, type Engine} from '@venus/engine'

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

export interface Canvas2DRenderDiagnostics {
  drawCount: number
  drawMs: number
  visibleShapeCount: number
  cacheHitCount: number
  cacheMissCount: number
  cacheMode: 'none' | 'frame'
}

const EMPTY_DIAGNOSTICS: Canvas2DRenderDiagnostics = {
  drawCount: 0,
  drawMs: 0,
  visibleShapeCount: 0,
  cacheHitCount: 0,
  cacheMissCount: 0,
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
    const imageCount = document.shapes.reduce((count, shape) => count + (shape.type === 'image' ? 1 : 0), 0)
    const level: 0 | 1 | 2 | 3 =
      stats.shapeCount >= 50_000 || imageCount >= 1_000
        ? 2
        : stats.shapeCount >= 10_000 || imageCount >= 250
          ? 1
          : 0
    onRenderLodChange?.({
      level,
      renderQuality: 'full',
      shapeCount: stats.shapeCount,
      imageCount,
      scale: viewport.scale,
    })
  }, [document.shapes, onRenderLodChange, stats.shapeCount, viewport.scale])

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
    <section className="stage-shell" style={{width: '100%', height: '100%'}}>
      <div
        ref={viewportRef}
        className="stage-viewport"
        style={{
          position: 'relative',
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
            renderQuality={'full'}
            lodLevel={0}
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
  backend = 'canvas2d',
}: CanvasRendererProps & {backend?: 'canvas2d' | 'webgl'}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const engineRef = React.useRef<Engine | null>(null)
  const assetUrlByIdRef = React.useRef<Map<string, string>>(new Map())
  const imageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map())
  const drawSerialRef = React.useRef(0)
  const engineScene = React.useMemo(
    () => createEngineSceneFromRuntimeSnapshot({
      document,
      shapes,
      revision: stats.version,
      backgroundFill: '#ffffff',
      backgroundStroke: '#d0d7de',
    }),
    [document, shapes, stats.version],
  )

  React.useEffect(() => {
    assetUrlByIdRef.current = buildDocumentImageAssetUrlMap(document)
  }, [document])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    // WebGL renderer is currently a plan/instance skeleton and does not commit
    // actual draw calls yet, so app surfaces should stay on Canvas2D for now.
    const resolvedBackend = backend === 'webgl'
      ? 'canvas2d'
      : backend
    const engine = createEngine({
      canvas,
      backend: resolvedBackend,
      performance: {
        culling: false,
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
            cacheMode: 'none',
          })
        },
      },
    })
    engineRef.current = engine

    return () => {
      engineRef.current = null
      engine.dispose()
    }
  }, [backend])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (!canvas || !engine) {
      return
    }

    const width = Math.max(1, Math.floor(viewport.viewportWidth))
    const height = Math.max(1, Math.floor(viewport.viewportHeight))
    engine.resize(width, height)
    engine.setViewport({
      viewportWidth: width,
      viewportHeight: height,
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
      scale: viewport.scale,
    })
    engine.loadScene(engineScene)
    void engine.renderFrame()
  }, [engineScene, viewport])

  React.useEffect(() => {
    imageCacheRef.current.clear()
  }, [document.id])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
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
