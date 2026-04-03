import * as React from 'react'
import type { CanvasRendererProps } from '@venus/canvas-base'
import type { DocumentNode } from '@venus/document-core'

export interface Canvas2DRenderDiagnostics {
  drawMs: number
  visibleShapeCount: number
}

const EMPTY_DIAGNOSTICS: Canvas2DRenderDiagnostics = {
  drawMs: 0,
  visibleShapeCount: 0,
}

const diagnosticsListeners = new Set<VoidFunction>()
let currentDiagnostics = EMPTY_DIAGNOSTICS

function publishDiagnostics(nextDiagnostics: Canvas2DRenderDiagnostics) {
  if (
    currentDiagnostics.drawMs === nextDiagnostics.drawMs &&
    currentDiagnostics.visibleShapeCount === nextDiagnostics.visibleShapeCount
  ) {
    return
  }

  currentDiagnostics = nextDiagnostics
  diagnosticsListeners.forEach((listener) => listener())
}

export function useCanvas2DRenderDiagnostics() {
  return React.useSyncExternalStore(
    (listener) => {
      diagnosticsListeners.add(listener)
      return () => {
        diagnosticsListeners.delete(listener)
      }
    },
    () => currentDiagnostics,
    () => EMPTY_DIAGNOSTICS,
  )
}

interface VisibleWorldBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export function Canvas2DRenderer({
  document,
  shapes,
  viewport,
  renderQuality = 'full',
}: CanvasRendererProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const shapeSourceById = React.useMemo(() => {
    const map = new Map<string, DocumentNode>()
    document.shapes.forEach((shape) => {
      map.set(shape.id, shape)
    })
    return map
  }, [document])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    drawScene2D({
      canvas,
      document,
      shapes,
      viewport,
      renderQuality,
      shapeSourceById,
    })
  }, [document, renderQuality, shapeSourceById, shapes, viewport])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

function drawScene2D({
  canvas,
  document,
  shapes,
  viewport,
  renderQuality,
  shapeSourceById,
}: {
  canvas: HTMLCanvasElement
  document: CanvasRendererProps['document']
  shapes: CanvasRendererProps['shapes']
  viewport: CanvasRendererProps['viewport']
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>
  shapeSourceById: Map<string, DocumentNode>
}) {
  const width = Math.max(1, Math.floor(viewport.viewportWidth))
  const height = Math.max(1, Math.floor(viewport.viewportHeight))
  const dpr = window.devicePixelRatio || 1
  const targetWidth = Math.max(1, Math.floor(width * dpr))
  const targetHeight = Math.max(1, Math.floor(height * dpr))
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
  }

  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  const drawStart = performance.now()
  const visibleBounds = getVisibleWorldBounds(viewport)
  const visibleShapes = shapes.filter((shape) => intersects(visibleBounds, shape))
  const showTextContent = renderQuality === 'full' || viewport.scale >= 0.45

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

  visibleShapes.forEach((shape) => {
    const source = shapeSourceById.get(shape.id)
    drawShape(context, shape, source, showTextContent)
  })

  context.restore()

  const drawMs = performance.now() - drawStart
  publishDiagnostics({
    drawMs,
    visibleShapeCount: visibleShapes.length,
  })
}

function drawShape(
  context: CanvasRenderingContext2D,
  shape: CanvasRendererProps['shapes'][number],
  source: DocumentNode | undefined,
  showTextContent: boolean,
) {
  const stroke = shape.isSelected ? '#2563eb' : shape.isHovered ? '#0ea5e9' : '#111827'
  const strokeWidth = shape.isSelected ? 2 : 1
  const fill = '#ffffff'

  if (shape.type === 'rectangle' || shape.type === 'frame') {
    context.fillStyle = fill
    context.strokeStyle = stroke
    context.lineWidth = strokeWidth
    context.fillRect(shape.x, shape.y, shape.width, shape.height)
    context.strokeRect(shape.x, shape.y, shape.width, shape.height)
    return
  }

  if (shape.type === 'ellipse') {
    context.beginPath()
    context.ellipse(
      shape.x + shape.width / 2,
      shape.y + shape.height / 2,
      Math.abs(shape.width) / 2,
      Math.abs(shape.height) / 2,
      0,
      0,
      Math.PI * 2,
    )
    context.fillStyle = fill
    context.fill()
    context.strokeStyle = stroke
    context.lineWidth = strokeWidth
    context.stroke()
    return
  }

  if (shape.type === 'lineSegment') {
    context.beginPath()
    context.moveTo(shape.x, shape.y)
    context.lineTo(shape.x + shape.width, shape.y + shape.height)
    context.strokeStyle = stroke
    context.lineWidth = strokeWidth
    context.stroke()
    return
  }

  if (shape.type === 'path') {
    const bezierPoints = source?.bezierPoints
    const points = source?.points
    if (bezierPoints && bezierPoints.length > 1) {
      context.beginPath()
      const first = bezierPoints[0]
      context.moveTo(first.anchor.x, first.anchor.y)

      for (let index = 0; index < bezierPoints.length - 1; index += 1) {
        const current = bezierPoints[index]
        const next = bezierPoints[index + 1]
        const cp1 = current.cp2 ?? current.anchor
        const cp2 = next.cp1 ?? next.anchor
        context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, next.anchor.x, next.anchor.y)
      }

      context.strokeStyle = stroke
      context.lineWidth = strokeWidth
      context.stroke()
      return
    }

    if (points && points.length > 1) {
      context.beginPath()
      context.moveTo(points[0].x, points[0].y)
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y)
      }
      context.strokeStyle = stroke
      context.lineWidth = strokeWidth
      context.stroke()
      return
    }

    // Fallback for paths without source points in a partial snapshot case.
    context.beginPath()
    const steps = 24
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps
      const x = shape.x + shape.width * t
      const ease = t * t * (3 - 2 * t)
      const y = shape.y + shape.height * ease
      if (step === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }
    context.strokeStyle = stroke
    context.lineWidth = strokeWidth
    context.stroke()
    return
  }

  if (shape.type === 'text') {
    if (!showTextContent) {
      return
    }

    context.fillStyle = '#111827'
    context.font = `${Math.max(12, Math.min(22, Math.round(shape.height * 0.6)))}px sans-serif`
    context.textBaseline = 'top'
    context.fillText(shape.name || 'Text', shape.x, shape.y)
  }
}

function intersects(bounds: VisibleWorldBounds, shape: CanvasRendererProps['shapes'][number]) {
  const left = shape.x
  const top = shape.y
  const right = shape.x + shape.width
  const bottom = shape.y + shape.height
  return !(right < bounds.left || left > bounds.right || bottom < bounds.top || top > bounds.bottom)
}

function getVisibleWorldBounds(viewport: CanvasRendererProps['viewport']): VisibleWorldBounds {
  const scale = viewport.scale || 1
  const left = -viewport.matrix[2] / scale
  const top = -viewport.matrix[5] / scale
  const right = left + viewport.viewportWidth / scale
  const bottom = top + viewport.viewportHeight / scale

  return { left, top, right, bottom }
}
