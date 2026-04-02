import * as React from 'react'
import CanvasKitInit from 'canvaskit-wasm/full'
import type { Canvas, CanvasKit, Surface } from 'canvaskit-wasm'
import canvaskitWasmUrl from 'canvaskit-wasm/bin/full/canvaskit.wasm?url'
import type { CanvasRendererProps } from '@venus/canvas-base'
import {cubicBezier} from '@venus/document-core'

/**
 * Development trace helper for the Skia renderer adapter.
 */
function debugSkia(message: string, details?: unknown) {
  console.debug('[renderer-skia]', message, details)
}

/**
 * Minimal CanvasKit-backed renderer.
 *
 * Scope of this first implementation:
 * - initialize Skia/CanvasKit WASM
 * - render the page background
 * - render basic frame/rectangle/ellipse/line/text shapes
 * - preserve existing pointer bridge semantics
 *
 * The goal is to move rendering onto Skia without changing the surrounding
 * runtime contract yet.
 */
export function SkiaRenderer({
  document,
  shapes,
  viewport,
}: CanvasRendererProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const canvasKitRef = React.useRef<CanvasKit | null>(null)
  const surfaceRef = React.useRef<Surface | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function initSurface() {
      if (!canvasRef.current) {
        return
      }

      if (!canvasKitRef.current) {
        debugSkia('init canvaskit')
        canvasKitRef.current = await CanvasKitInit({
          locateFile: (file) => (file.endsWith('.wasm') ? canvaskitWasmUrl : file),
        })
      }

      if (cancelled || !canvasRef.current || !canvasKitRef.current) {
        return
      }

      surfaceRef.current?.dispose()
      configureCanvasDimensions(
        canvasRef.current,
        Math.max(1, viewport.viewportWidth),
        Math.max(1, viewport.viewportHeight),
      )
      surfaceRef.current = canvasKitRef.current.MakeSWCanvasSurface(canvasRef.current)
      debugSkia('surface ready', {
        width: viewport.viewportWidth,
        height: viewport.viewportHeight,
      })
      drawScene(canvasKitRef.current, surfaceRef.current, document, shapes, viewport)
    }

    initSurface()

    return () => {
      cancelled = true
      surfaceRef.current?.dispose()
      surfaceRef.current = null
    }
  }, [document.height, document.width, viewport.viewportHeight, viewport.viewportWidth])

  React.useEffect(() => {
    if (!canvasKitRef.current || !surfaceRef.current) {
      return
    }

    drawScene(canvasKitRef.current, surfaceRef.current, document, shapes, viewport)
  }, [document, shapes, viewport])

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

function configureCanvasDimensions(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.floor(width * dpr))
  canvas.height = Math.max(1, Math.floor(height * dpr))
}

function drawScene(
  canvasKit: CanvasKit,
  surface: Surface | null,
  document: CanvasRendererProps['document'],
  shapes: CanvasRendererProps['shapes'],
  viewport: CanvasRendererProps['viewport'],
) {
  if (!surface) {
    return
  }

  const skCanvas = surface.getCanvas()
  const dpr = window.devicePixelRatio || 1

  skCanvas.clear(canvasKit.Color(243, 244, 246, 1))
  skCanvas.save()
  skCanvas.scale(dpr, dpr)
  skCanvas.translate(viewport.matrix[2], viewport.matrix[5])
  skCanvas.scale(viewport.matrix[0], viewport.matrix[4])

  drawPage(canvasKit, skCanvas, document.width, document.height)

  shapes.forEach((shape) => {
    if (shape.type === 'rectangle' || shape.type === 'frame') {
      drawRectangle(canvasKit, skCanvas, shape)
      return
    }

    if (shape.type === 'ellipse') {
      drawEllipse(canvasKit, skCanvas, shape)
      return
    }

    if (shape.type === 'lineSegment') {
      drawLineSegment(canvasKit, skCanvas, shape)
      return
    }

    if (shape.type === 'path') {
      const source = document.shapes.find((item) => item.id === shape.id)
      drawPathShape(canvasKit, skCanvas, shape, source?.bezierPoints, source?.points)
      return
    }

    if (shape.type === 'text') {
      drawText(canvasKit, skCanvas, shape)
    }
  })

  skCanvas.restore()
  surface.flush()
}

function drawPage(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  width: number,
  height: number,
) {
  const pagePaint = new canvasKit.Paint()
  pagePaint.setAntiAlias(true)
  pagePaint.setStyle(canvasKit.PaintStyle.Fill)
  pagePaint.setColor(canvasKit.Color(255, 255, 255, 1))
  skCanvas.drawRect(canvasKit.XYWHRect(0, 0, width, height), pagePaint)
  pagePaint.delete()

  const pageStroke = new canvasKit.Paint()
  pageStroke.setAntiAlias(true)
  pageStroke.setStyle(canvasKit.PaintStyle.Stroke)
  pageStroke.setStrokeWidth(1)
  pageStroke.setColor(canvasKit.Color(15, 23, 42, 0.28))
  skCanvas.drawRect(canvasKit.XYWHRect(0, 0, width, height), pageStroke)
  pageStroke.delete()
}

function drawRectangle(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
) {
  const fill = new canvasKit.Paint()
  fill.setAntiAlias(true)
  fill.setStyle(canvasKit.PaintStyle.Fill)
  fill.setColor(shape.type === 'frame'
    ? canvasKit.Color(250, 250, 252, 1)
    : canvasKit.Color(255, 245, 247, 1))
  skCanvas.drawRect(canvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height), fill)
  fill.delete()

  const stroke = new canvasKit.Paint()
  stroke.setAntiAlias(true)
  stroke.setStyle(canvasKit.PaintStyle.Stroke)
  stroke.setStrokeWidth(shape.isSelected ? 3 : 1.25)
  stroke.setColor(resolveStrokeColor(canvasKit, shape))
  skCanvas.drawRect(canvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height), stroke)
  stroke.delete()
}

function drawEllipse(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
) {
  const fill = new canvasKit.Paint()
  fill.setAntiAlias(true)
  fill.setStyle(canvasKit.PaintStyle.Fill)
  fill.setColor(canvasKit.Color(239, 246, 255, 1))
  skCanvas.drawOval(
    canvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height),
    fill,
  )
  fill.delete()

  const stroke = new canvasKit.Paint()
  stroke.setAntiAlias(true)
  stroke.setStyle(canvasKit.PaintStyle.Stroke)
  stroke.setStrokeWidth(shape.isSelected ? 3 : 1.25)
  stroke.setColor(resolveStrokeColor(canvasKit, shape))
  skCanvas.drawOval(
    canvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height),
    stroke,
  )
  stroke.delete()
}

function drawText(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
) {
  const border = new canvasKit.Paint()
  border.setAntiAlias(true)
  border.setStyle(canvasKit.PaintStyle.Stroke)
  border.setStrokeWidth(shape.isSelected ? 2.5 : 1)
  border.setColor(resolveStrokeColor(canvasKit, shape))
  skCanvas.drawRect(canvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height), border)
  border.delete()

  const textPaint = new canvasKit.Paint()
  textPaint.setAntiAlias(true)
  textPaint.setStyle(canvasKit.PaintStyle.Fill)
  textPaint.setColor(canvasKit.Color(15, 23, 42, 1))

  const font = new canvasKit.Font(null, 16)
  skCanvas.drawText(shape.name, shape.x + 10, shape.y + 28, textPaint, font)
  font.delete()
  textPaint.delete()
}

function drawLineSegment(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
) {
  const stroke = new canvasKit.Paint()
  stroke.setAntiAlias(true)
  stroke.setStyle(canvasKit.PaintStyle.Stroke)
  stroke.setStrokeWidth(shape.isSelected ? 4 : 2)
  stroke.setColor(resolveStrokeColor(canvasKit, shape))
  skCanvas.drawLine(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height, stroke)
  stroke.delete()
}

function drawPathShape(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
  bezierPoints?: Array<{
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }>,
  points?: Array<{x: number; y: number}>,
) {
  if ((!bezierPoints || bezierPoints.length < 2) && (!points || points.length < 2)) {
    return
  }

  const stroke = new canvasKit.Paint()
  stroke.setAntiAlias(true)
  stroke.setStyle(canvasKit.PaintStyle.Stroke)
  stroke.setStrokeWidth(shape.isSelected ? 4 : 2)
  stroke.setColor(resolveStrokeColor(canvasKit, shape))

  if (bezierPoints && bezierPoints.length >= 2) {
    for (let index = 1; index < bezierPoints.length; index += 1) {
      const previous = bezierPoints[index - 1]
      const current = bezierPoints[index]
      const p0 = previous.anchor
      const p1 = previous.cp2 ?? previous.anchor
      const p2 = current.cp1 ?? current.anchor
      const p3 = current.anchor
      let previousSample = p0

      for (let step = 1; step <= 20; step += 1) {
        const sample = cubicBezier(step / 20, p0, p1, p2, p3)
        skCanvas.drawLine(
          previousSample.x,
          previousSample.y,
          sample.x,
          sample.y,
          stroke,
        )
        previousSample = sample
      }
    }
  } else if (points) {
    for (let index = 1; index < points.length; index += 1) {
      skCanvas.drawLine(
        points[index - 1].x,
        points[index - 1].y,
        points[index].x,
        points[index].y,
        stroke,
      )
    }
  }

  stroke.delete()
}

function resolveStrokeColor(
  canvasKit: CanvasKit,
  shape: CanvasRendererProps['shapes'][number],
) {
  if (shape.isSelected) {
    return canvasKit.Color(14, 165, 233, 1)
  }

  if (shape.isHovered) {
    return canvasKit.Color(251, 191, 36, 1)
  }

  return canvasKit.Color(15, 23, 42, 0.82)
}
