import * as React from 'react'
import type {EditorDocument} from '@venus/document-core'
import {bindViewportGestures, type ViewportGestureBindingOptions} from '@venus/runtime/interaction'
import type {CanvasViewportState} from '@venus/runtime'
import type {SceneShapeSnapshot, SceneStats} from '@venus/shared-memory'

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

    shapes.forEach((shape) => {
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