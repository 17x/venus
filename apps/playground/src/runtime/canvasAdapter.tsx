import * as React from 'react'
import {getNormalizedBoundsFromBox, type EditorDocument} from '@venus/document-core'
import {bindViewportGestures} from '@venus/runtime/interaction'
import type {CanvasViewportState} from '@venus/runtime'
import type {PointerState, SceneShapeSnapshot, SceneStats} from '@venus/shared-memory'

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
  viewport,
}: CanvasRendererProps & {backend?: 'canvas2d' | 'webgl'}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const drawStart = performance.now()
    const width = Math.max(1, Math.floor(viewport.viewportWidth))
    const height = Math.max(1, Math.floor(viewport.viewportHeight))
    const dpr = window.devicePixelRatio || 1
    const targetWidth = Math.max(1, Math.floor(width * dpr))
    const targetHeight = Math.max(1, Math.floor(height * dpr))

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
    }

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#f3f4f6'
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.save()
    context.scale(dpr, dpr)
    context.translate(viewport.matrix[2], viewport.matrix[5])
    context.scale(viewport.matrix[0], viewport.matrix[4])

    context.fillStyle = '#ffffff'
    context.strokeStyle = '#d0d7de'
    context.lineWidth = 1
    context.fillRect(0, 0, document.width, document.height)
    context.strokeRect(0, 0, document.width, document.height)

    const visibleBounds = {
      left: -viewport.matrix[2] / (viewport.scale || 1),
      top: -viewport.matrix[5] / (viewport.scale || 1),
      right: (-viewport.matrix[2] / (viewport.scale || 1)) + viewport.viewportWidth / (viewport.scale || 1),
      bottom: (-viewport.matrix[5] / (viewport.scale || 1)) + viewport.viewportHeight / (viewport.scale || 1),
    }
    const visibleShapes = shapes.filter((shape) => {
      const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
      return !(
        bounds.maxX < visibleBounds.left ||
        bounds.minX > visibleBounds.right ||
        bounds.maxY < visibleBounds.top ||
        bounds.minY > visibleBounds.bottom
      )
    })

    visibleShapes.forEach((shape) => {
      context.save()
      context.strokeStyle = shape.isSelected ? '#2563eb' : '#1f2937'
      context.lineWidth = shape.isSelected ? 2 : 1
      context.fillStyle = shape.isHovered ? 'rgba(37,99,235,0.12)' : 'rgba(17,24,39,0.05)'

      if (shape.type === 'ellipse') {
        const cx = shape.x + shape.width / 2
        const cy = shape.y + shape.height / 2
        context.beginPath()
        context.ellipse(cx, cy, Math.abs(shape.width) / 2, Math.abs(shape.height) / 2, 0, 0, Math.PI * 2)
        context.fill()
        context.stroke()
      } else if (shape.type === 'lineSegment') {
        context.beginPath()
        context.moveTo(shape.x, shape.y)
        context.lineTo(shape.x + shape.width, shape.y + shape.height)
        context.stroke()
      } else {
        context.beginPath()
        context.rect(shape.x, shape.y, shape.width, shape.height)
        context.fill()
        context.stroke()
      }

      context.restore()
    })

    context.restore()

    publishDiagnostics({
      drawCount: currentDiagnostics.drawCount + 1,
      drawMs: performance.now() - drawStart,
      visibleShapeCount: visibleShapes.length,
      cacheHitCount: 0,
      cacheMissCount: 0,
      cacheMode: 'none',
    })
  }, [document.height, document.width, shapes, viewport])

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