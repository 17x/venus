import * as React from 'react'
import type { CanvasRendererProps } from '@venus/canvas-base'
import {resolveNodeTransform, type DocumentNode} from '@venus/document-core'
import {
  type Canvas2DLodLevel,
  defaultCanvas2DLodConfig,
  resolveImageSmoothingQuality,
  resolveImageMinRenderedExtentToDraw,
  resolvePathFallbackCurveSteps,
  resolvePathMinRenderedLengthToDraw,
  resolveShapeMinRenderedExtentToDraw,
  resolveShowTextContent,
} from './lod.ts'

export interface Canvas2DRenderDiagnostics {
  drawCount: number
  drawMs: number
  visibleShapeCount: number
}

export {defaultCanvas2DLodConfig} from './lod.ts'
export {
  imageHeavyCanvas2DLodConfig,
  performanceCanvas2DLodConfig,
} from './lod.ts'
export type {
  Canvas2DLodConfig,
  Canvas2DImageLodConfig,
  Canvas2DLodLevel,
  Canvas2DPathLodConfig,
  Canvas2DTextLodConfig,
} from './lod.ts'

const EMPTY_DIAGNOSTICS: Canvas2DRenderDiagnostics = {
  drawCount: 0,
  drawMs: 0,
  visibleShapeCount: 0,
}

const diagnosticsListeners = new Set<VoidFunction>()
let currentDiagnostics = EMPTY_DIAGNOSTICS

function publishDiagnostics(nextDiagnostics: Canvas2DRenderDiagnostics) {
  if (
    currentDiagnostics.drawCount === nextDiagnostics.drawCount &&
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
  lodLevel = 0,
  shapes,
  viewport,
  lodConfig = defaultCanvas2DLodConfig,
}: CanvasRendererProps & {lodConfig?: import('./lod.ts').Canvas2DLodConfig}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [imageVersion, setImageVersion] = React.useState(0)
  const shapeSourceById = React.useMemo(() => {
    const map = new Map<string, DocumentNode>()
    document.shapes.forEach((shape) => {
      map.set(shape.id, shape)
    })
    return map
  }, [document])
  const imageCacheRef = React.useRef(new Map<string, HTMLImageElement>())

  React.useEffect(() => {
    const cache = imageCacheRef.current
    const activeUrls = new Set<string>()

    document.shapes.forEach((shape) => {
      if (shape.type !== 'image' || !shape.assetUrl) {
        return
      }

      activeUrls.add(shape.assetUrl)
      if (cache.has(shape.assetUrl)) {
        return
      }

      const image = new Image()
      image.onload = () => {
        setImageVersion((version) => version + 1)
      }
      image.src = shape.assetUrl
      cache.set(shape.assetUrl, image)
    })

    Array.from(cache.keys()).forEach((url) => {
      if (!activeUrls.has(url)) {
        cache.delete(url)
      }
    })
  }, [document])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    drawScene2D({
      canvas,
      document,
      lodLevel,
      shapes,
      viewport,
      lodConfig,
      shapeSourceById,
      imageCache: imageCacheRef.current,
    })
  }, [document, imageVersion, lodConfig, lodLevel, shapeSourceById, shapes, viewport])

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
  lodLevel,
  shapes,
  viewport,
  lodConfig,
  shapeSourceById,
  imageCache,
}: {
  canvas: HTMLCanvasElement
  document: CanvasRendererProps['document']
  lodLevel: NonNullable<CanvasRendererProps['lodLevel']>
  shapes: CanvasRendererProps['shapes']
  viewport: CanvasRendererProps['viewport']
  lodConfig: import('./lod.ts').Canvas2DLodConfig
  shapeSourceById: Map<string, DocumentNode>
  imageCache: Map<string, HTMLImageElement>
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
  const showTextContent = resolveShowTextContent(
    viewport.scale,
    lodLevel,
    lodConfig,
  )
  const imageSmoothingQuality = resolveImageSmoothingQuality(
    lodLevel,
    lodConfig,
  )

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#f3f4f6'
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.save()
  context.scale(dpr, dpr)
  context.translate(viewport.matrix[2], viewport.matrix[5])
  context.scale(viewport.matrix[0], viewport.matrix[4])
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = imageSmoothingQuality

  context.fillStyle = '#ffffff'
  context.strokeStyle = '#d0d7de'
  context.lineWidth = 1
  context.fillRect(0, 0, document.width, document.height)
  context.strokeRect(0, 0, document.width, document.height)

  visibleShapes.forEach((shape) => {
    if (!shouldDrawShapeAtLod(shape, viewport.scale, lodLevel, lodConfig)) {
      return
    }
    const source = shapeSourceById.get(shape.id)
    drawShape(context, shape, source, shapeSourceById, showTextContent, imageCache, viewport.scale, lodConfig, lodLevel)
  })

  context.restore()

  const drawMs = performance.now() - drawStart
  publishDiagnostics({
    drawCount: currentDiagnostics.drawCount + 1,
    drawMs,
    visibleShapeCount: visibleShapes.length,
  })
}

function drawShape(
  context: CanvasRenderingContext2D,
  shape: CanvasRendererProps['shapes'][number],
  source: DocumentNode | undefined,
  shapeSourceById: Map<string, DocumentNode>,
  showTextContent: boolean,
  imageCache: Map<string, HTMLImageElement>,
  viewportScale: number,
  lodConfig: import('./lod.ts').Canvas2DLodConfig,
  lodLevel: Canvas2DLodLevel,
) {
  const baseFillColor = source?.fill?.color ?? '#ffffff'
  const defaultFillEnabled = shape.type !== 'text' && shape.type !== 'lineSegment' && shape.type !== 'path'
  const hasExplicitFillStyle = Boolean(source?.fill)
  const baseFillEnabled =
    (source?.fill?.enabled !== false) &&
    (hasExplicitFillStyle || defaultFillEnabled) &&
    hasVisibleColorAlpha(baseFillColor)
  const baseStrokeEnabled = source?.stroke?.enabled ?? true
  const baseStrokeColor = source?.stroke?.color ?? '#111827'
  const baseStrokeWidth = Math.max(0, source?.stroke?.weight ?? 1)
  const strokeColor = baseStrokeColor
  const strokeWidth = baseStrokeWidth
  const shadowEnabled = source?.shadow?.enabled ?? false
  const transform = resolveNodeTransform({
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rotation: source?.rotation,
    flipX: source?.flipX,
    flipY: source?.flipY,
  })
  const needsTransform =
    (Math.abs(transform.rotation) > 0.0001 || transform.flipX || transform.flipY) &&
    shape.type !== 'group'
  if (needsTransform) {
    applyShapeTransform(context, transform.matrix)
  }
  const finish = () => {
    if (needsTransform) {
      context.restore()
    }
  }

  if (shape.type === 'group') {
    // Group chrome belongs to the interaction overlay layer, not renderer.
    finish()
    return
  }

  if (shape.type === 'rectangle' || shape.type === 'frame') {
    beginRoundedRectPath(context, shape, source)
    if (shadowEnabled) {
      applyShapeShadow(context, source)
    }
    if (baseFillEnabled) {
      context.fillStyle = baseFillColor
      context.fill()
    }
    if (baseStrokeEnabled && strokeWidth > 0) {
      context.strokeStyle = strokeColor
      context.lineWidth = strokeWidth
      context.stroke()
    }
    if (shadowEnabled) {
      clearShapeShadow(context)
    }
    finish()
    return
  }

  if (shape.type === 'ellipse') {
    beginEllipsePath(context, shape, source)
    if (shadowEnabled) {
      applyShapeShadow(context, source)
    }
    if (baseFillEnabled) {
      context.fillStyle = baseFillColor
      context.fill()
    }
    if (baseStrokeEnabled && strokeWidth > 0) {
      context.strokeStyle = strokeColor
      context.lineWidth = strokeWidth
      context.stroke()
    }
    if (shadowEnabled) {
      clearShapeShadow(context)
    }
    finish()
    return
  }

  if (shape.type === 'lineSegment') {
    const start = {x: shape.x, y: shape.y}
    const end = {x: shape.x + shape.width, y: shape.y + shape.height}
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
    if (shadowEnabled) {
      applyShapeShadow(context, source)
    }
    if (baseStrokeEnabled && strokeWidth > 0) {
      context.strokeStyle = strokeColor
      context.lineWidth = strokeWidth
      context.stroke()
      drawStrokeArrowheads(context, {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        start,
        end,
        startTangent: {x: end.x - start.x, y: end.y - start.y},
        endTangent: {x: end.x - start.x, y: end.y - start.y},
        startArrowhead: source?.strokeStartArrowhead,
        endArrowhead: source?.strokeEndArrowhead,
      })
    }
    if (shadowEnabled) {
      clearShapeShadow(context)
    }
    finish()
    return
  }

  if (shape.type === 'polygon' || shape.type === 'star') {
    const points = source?.points
    if (points && points.length >= 3) {
      // Polygon-like primitives share the same closed-point rendering path so
      // new parametric shapes can stay aligned with the VECTOR feature.
      context.beginPath()
      context.moveTo(points[0].x, points[0].y)
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y)
      }
      context.closePath()
      if (shadowEnabled) {
        applyShapeShadow(context, source)
      }
      if (baseFillEnabled) {
        context.fillStyle = baseFillColor
        context.fill()
      }
      if (baseStrokeEnabled && strokeWidth > 0) {
        context.strokeStyle = strokeColor
        context.lineWidth = strokeWidth
        context.stroke()
      }
      if (shadowEnabled) {
        clearShapeShadow(context)
      }
      finish()
      return
    }

    beginRoundedRectPath(context, shape, source)
    if (shadowEnabled) {
      applyShapeShadow(context, source)
    }
    if (baseFillEnabled) {
      context.fillStyle = baseFillColor
      context.fill()
    }
    if (baseStrokeEnabled && strokeWidth > 0) {
      context.strokeStyle = strokeColor
      context.lineWidth = strokeWidth
      context.stroke()
    }
    if (shadowEnabled) {
      clearShapeShadow(context)
    }
    finish()
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

      if (shadowEnabled) {
        applyShapeShadow(context, source)
      }
      if (baseFillEnabled && isClosedBezierPath(bezierPoints)) {
        context.closePath()
        context.fillStyle = baseFillColor
        context.fill()
      }
      if (baseStrokeEnabled && strokeWidth > 0) {
        context.strokeStyle = strokeColor
        context.lineWidth = strokeWidth
        context.stroke()
        const start = bezierPoints[0].anchor
        const end = bezierPoints[bezierPoints.length - 1].anchor
        const firstPoint = bezierPoints[0]
        const second = bezierPoints[1]
        const preLast = bezierPoints[bezierPoints.length - 2]
        const last = bezierPoints[bezierPoints.length - 1]
        drawStrokeArrowheads(context, {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          start,
          end,
          startTangent: resolveBezierStartTangent(firstPoint, second),
          endTangent: resolveBezierEndTangent(preLast, last),
          startArrowhead: source?.strokeStartArrowhead,
          endArrowhead: source?.strokeEndArrowhead,
        })
      }
      if (shadowEnabled) {
        clearShapeShadow(context)
      }
      finish()
      return
    }

    if (points && points.length > 1) {
      context.beginPath()
      context.moveTo(points[0].x, points[0].y)
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y)
      }
      if (shadowEnabled) {
        applyShapeShadow(context, source)
      }
      if (baseFillEnabled && isClosedPolyline(points)) {
        context.closePath()
        context.fillStyle = baseFillColor
        context.fill()
      }
      if (baseStrokeEnabled && strokeWidth > 0) {
        context.strokeStyle = strokeColor
        context.lineWidth = strokeWidth
        context.stroke()
        drawStrokeArrowheads(context, {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          start: points[0],
          end: points[points.length - 1],
          startTangent: {
            x: points[1].x - points[0].x,
            y: points[1].y - points[0].y,
          },
          endTangent: {
            x: points[points.length - 1].x - points[points.length - 2].x,
            y: points[points.length - 1].y - points[points.length - 2].y,
          },
          startArrowhead: source?.strokeStartArrowhead,
          endArrowhead: source?.strokeEndArrowhead,
        })
      }
      if (shadowEnabled) {
        clearShapeShadow(context)
      }
      finish()
      return
    }

    // Fallback for paths without source points in a partial snapshot case.
    context.beginPath()
    const steps = resolvePathFallbackCurveSteps(lodLevel, lodConfig)
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
    if (shadowEnabled) {
      applyShapeShadow(context, source)
    }
    if (baseStrokeEnabled && strokeWidth > 0) {
      context.strokeStyle = strokeColor
      context.lineWidth = strokeWidth
      context.stroke()
    }
    if (shadowEnabled) {
      clearShapeShadow(context)
    }
    finish()
    return
  }

  if (shape.type === 'text') {
    if (!showTextContent) {
      finish()
      return
    }

    const text = source?.text || shape.name || 'Text'
    const textRun = source?.textRuns?.[0]
    const fontSize = Math.max(
      12,
      Math.min(22, Math.round(textRun?.style?.fontSize ?? shape.height * 0.6)),
    )

    context.fillStyle = source?.fill?.color ?? '#111827'
    context.font = `${fontSize}px ${textRun?.style?.fontFamily || 'sans-serif'}`
    context.textBaseline = 'top'
    context.fillText(text, shape.x, shape.y)
    finish()
    return
  }

  if (shape.type === 'image') {
    const image = source?.assetUrl ? imageCache.get(source.assetUrl) : undefined
    const clipSource = source?.clipPathId ? shapeSourceById.get(source.clipPathId) : undefined
    const hasClip = clipSource ? canUseClipPath(clipSource) : false

    if (hasClip) {
      context.save()
      beginClipPath(context, clipSource!)
      context.clip(source?.clipRule === 'evenodd' ? 'evenodd' : 'nonzero')
    }

    if (shadowEnabled) {
      applyShapeShadow(context, source)
    }
    context.fillStyle = baseFillColor
    context.strokeStyle = strokeColor
    context.lineWidth = Math.max(1, strokeWidth)
    context.fillRect(shape.x, shape.y, shape.width, shape.height)
    if (baseStrokeEnabled) {
      context.strokeRect(shape.x, shape.y, shape.width, shape.height)
    }

    if (image && image.complete) {
      context.drawImage(image, shape.x, shape.y, shape.width, shape.height)
      if (baseStrokeEnabled) {
        context.strokeRect(shape.x, shape.y, shape.width, shape.height)
      }
    } else {
      context.strokeStyle = '#ec4899'
      context.setLineDash([10, 6])
      context.strokeRect(shape.x + 4, shape.y + 4, Math.max(0, shape.width - 8), Math.max(0, shape.height - 8))
      context.setLineDash([])

      const renderedWidth = Math.abs(shape.width * viewportScale)
      const renderedHeight = Math.abs(shape.height * viewportScale)
      if (
        renderedWidth >= lodConfig.image.minRenderedSizeForPlaceholderLabel.width &&
        renderedHeight >= lodConfig.image.minRenderedSizeForPlaceholderLabel.height
      ) {
        context.fillStyle = '#9d174d'
        context.font = 'bold 14px sans-serif'
        context.textBaseline = 'middle'
        context.fillText('Image placeholder', shape.x + 12, shape.y + Math.min(shape.height / 2, 24))
        context.font = '12px sans-serif'
        context.fillText(source?.name || 'Image', shape.x + 12, shape.y + Math.min(shape.height / 2, 48))
      }
    }
    if (shadowEnabled) {
      clearShapeShadow(context)
    }

    if (hasClip) {
      context.restore()
    }
    finish()
    return
  }

  finish()
}

function hasVisibleColorAlpha(color: string) {
  const normalized = color.trim().toLowerCase()
  if (normalized.length === 0 || normalized === 'transparent') {
    return false
  }

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1)
    if (hex.length === 4) {
      const alpha = Number.parseInt(hex[3] + hex[3], 16)
      return Number.isFinite(alpha) ? alpha > 0 : true
    }
    if (hex.length === 8) {
      const alpha = Number.parseInt(hex.slice(6, 8), 16)
      return Number.isFinite(alpha) ? alpha > 0 : true
    }
    return true
  }

  const alphaMatch = normalized.match(/^(rgba|hsla)\((.+)\)$/)
  if (!alphaMatch) {
    return true
  }

  const segments = alphaMatch[2].split(',').map((part) => part.trim())
  if (segments.length < 4) {
    return true
  }

  const rawAlpha = segments[3].replace('%', '')
  const parsedAlpha = Number.parseFloat(rawAlpha)
  if (!Number.isFinite(parsedAlpha)) {
    return true
  }

  return segments[3].includes('%')
    ? parsedAlpha > 0
    : parsedAlpha > 0
}

function applyShapeShadow(context: CanvasRenderingContext2D, source: DocumentNode | undefined) {
  context.shadowColor = source?.shadow?.color ?? 'rgba(17, 24, 39, 0.25)'
  context.shadowBlur = Math.max(0, source?.shadow?.blur ?? 8)
  context.shadowOffsetX = source?.shadow?.offsetX ?? 0
  context.shadowOffsetY = source?.shadow?.offsetY ?? 2
}

function clearShapeShadow(context: CanvasRenderingContext2D) {
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
}

function beginRoundedRectPath(
  context: CanvasRenderingContext2D,
  shape: CanvasRendererProps['shapes'][number],
  source: DocumentNode | undefined,
) {
  const cornerRadii = resolveCornerRadii(source, shape)
  const left = Math.min(shape.x, shape.x + shape.width)
  const right = Math.max(shape.x, shape.x + shape.width)
  const top = Math.min(shape.y, shape.y + shape.height)
  const bottom = Math.max(shape.y, shape.y + shape.height)
  const width = right - left
  const height = bottom - top
  const maxRadius = Math.max(0, Math.min(width, height) / 2)
  const tl = Math.min(maxRadius, Math.max(0, cornerRadii.topLeft))
  const tr = Math.min(maxRadius, Math.max(0, cornerRadii.topRight))
  const br = Math.min(maxRadius, Math.max(0, cornerRadii.bottomRight))
  const bl = Math.min(maxRadius, Math.max(0, cornerRadii.bottomLeft))

  context.beginPath()
  context.moveTo(left + tl, top)
  context.lineTo(right - tr, top)
  if (tr > 0) {
    context.arcTo(right, top, right, top + tr, tr)
  }
  context.lineTo(right, bottom - br)
  if (br > 0) {
    context.arcTo(right, bottom, right - br, bottom, br)
  }
  context.lineTo(left + bl, bottom)
  if (bl > 0) {
    context.arcTo(left, bottom, left, bottom - bl, bl)
  }
  context.lineTo(left, top + tl)
  if (tl > 0) {
    context.arcTo(left, top, left + tl, top, tl)
  }
  context.closePath()
}

function beginEllipsePath(
  context: CanvasRenderingContext2D,
  shape: CanvasRendererProps['shapes'][number],
  source: DocumentNode | undefined,
) {
  const centerX = shape.x + shape.width / 2
  const centerY = shape.y + shape.height / 2
  const radiusX = Math.abs(shape.width) / 2
  const radiusY = Math.abs(shape.height) / 2
  const startAngle = normalizeAngleDegrees(source?.ellipseStartAngle ?? 0)
  const endAngle = normalizeAngleDegrees(source?.ellipseEndAngle ?? 360)
  const delta = normalizeAngleDelta(startAngle, endAngle)
  const isFullEllipse = Math.abs(delta - Math.PI * 2) <= 0.001

  context.beginPath()
  if (isFullEllipse) {
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
    context.closePath()
    return
  }

  // Partial ellipse is rendered as a sector so both fill and stroke stay
  // consistent with vector-editor arc controls.
  context.moveTo(centerX, centerY)
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, startAngle, startAngle + delta)
  context.closePath()
}

function normalizeAngleDegrees(value: number) {
  return (value * Math.PI) / 180
}

function normalizeAngleDelta(start: number, end: number) {
  const full = Math.PI * 2
  let delta = end - start
  while (delta <= 0) {
    delta += full
  }
  while (delta > full) {
    delta -= full
  }
  return delta
}

function resolveCornerRadii(
  source: DocumentNode | undefined,
  shape: CanvasRendererProps['shapes'][number],
) {
  const fallback = source?.cornerRadius ?? 0
  if (shape.type !== 'rectangle' && shape.type !== 'frame') {
    return {
      topLeft: fallback,
      topRight: fallback,
      bottomRight: fallback,
      bottomLeft: fallback,
    }
  }
  return {
    topLeft: source?.cornerRadii?.topLeft ?? fallback,
    topRight: source?.cornerRadii?.topRight ?? fallback,
    bottomRight: source?.cornerRadii?.bottomRight ?? fallback,
    bottomLeft: source?.cornerRadii?.bottomLeft ?? fallback,
  }
}

function isClosedPolyline(points: Array<{x: number; y: number}>) {
  if (points.length < 3) {
    return false
  }
  const first = points[0]
  const last = points[points.length - 1]
  return Math.hypot(first.x - last.x, first.y - last.y) <= 1e-3
}

function isClosedBezierPath(points: NonNullable<DocumentNode['bezierPoints']>) {
  if (points.length < 3) {
    return false
  }
  const first = points[0].anchor
  const last = points[points.length - 1].anchor
  return Math.hypot(first.x - last.x, first.y - last.y) <= 1e-3
}

function applyShapeTransform(context: CanvasRenderingContext2D, matrix: [number, number, number, number, number, number]) {
  context.save()
  context.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5])
}

function drawStrokeArrowheads(
  context: CanvasRenderingContext2D,
  options: {
    stroke: string
    strokeWidth: number
    start: {x: number; y: number}
    end: {x: number; y: number}
    startTangent: {x: number; y: number}
    endTangent: {x: number; y: number}
    startArrowhead?: DocumentNode['strokeStartArrowhead']
    endArrowhead?: DocumentNode['strokeEndArrowhead']
  },
) {
  const {
    stroke,
    strokeWidth,
    start,
    end,
    startTangent,
    endTangent,
    startArrowhead,
    endArrowhead,
  } = options

  if (startArrowhead && startArrowhead !== 'none') {
    drawArrowhead(context, {
      arrowhead: startArrowhead,
      tip: start,
      direction: {
        x: -startTangent.x,
        y: -startTangent.y,
      },
      stroke,
      strokeWidth,
    })
  }

  if (endArrowhead && endArrowhead !== 'none') {
    drawArrowhead(context, {
      arrowhead: endArrowhead,
      tip: end,
      direction: endTangent,
      stroke,
      strokeWidth,
    })
  }
}

function drawArrowhead(
  context: CanvasRenderingContext2D,
  options: {
    arrowhead: Exclude<DocumentNode['strokeStartArrowhead'], undefined>
    tip: {x: number; y: number}
    direction: {x: number; y: number}
    stroke: string
    strokeWidth: number
  },
) {
  const {arrowhead, tip, direction, stroke, strokeWidth} = options
  const normalized = normalizeVector(direction)
  if (!normalized) {
    return
  }

  const size = Math.max(8, strokeWidth * 6)
  const halfWidth = size * 0.38
  const base = {
    x: tip.x - normalized.x * size,
    y: tip.y - normalized.y * size,
  }
  const perpendicular = {
    x: -normalized.y,
    y: normalized.x,
  }
  const left = {
    x: base.x + perpendicular.x * halfWidth,
    y: base.y + perpendicular.y * halfWidth,
  }
  const right = {
    x: base.x - perpendicular.x * halfWidth,
    y: base.y - perpendicular.y * halfWidth,
  }

  context.save()
  context.strokeStyle = stroke
  context.fillStyle = stroke
  context.lineWidth = Math.max(1, strokeWidth)

  if (arrowhead === 'triangle') {
    context.beginPath()
    context.moveTo(tip.x, tip.y)
    context.lineTo(left.x, left.y)
    context.lineTo(right.x, right.y)
    context.closePath()
    context.fill()
    context.restore()
    return
  }

  if (arrowhead === 'diamond') {
    const rear = {
      x: tip.x - normalized.x * size * 1.7,
      y: tip.y - normalized.y * size * 1.7,
    }
    context.beginPath()
    context.moveTo(tip.x, tip.y)
    context.lineTo(left.x, left.y)
    context.lineTo(rear.x, rear.y)
    context.lineTo(right.x, right.y)
    context.closePath()
    context.fill()
    context.restore()
    return
  }

  if (arrowhead === 'circle') {
    const center = {
      x: tip.x - normalized.x * size * 0.5,
      y: tip.y - normalized.y * size * 0.5,
    }
    context.beginPath()
    context.arc(center.x, center.y, size * 0.34, 0, Math.PI * 2)
    context.fill()
    context.restore()
    return
  }

  if (arrowhead === 'bar') {
    const center = {
      x: tip.x - normalized.x * size * 0.5,
      y: tip.y - normalized.y * size * 0.5,
    }
    const barHalf = size * 0.42
    context.beginPath()
    context.moveTo(center.x + perpendicular.x * barHalf, center.y + perpendicular.y * barHalf)
    context.lineTo(center.x - perpendicular.x * barHalf, center.y - perpendicular.y * barHalf)
    context.stroke()
    context.restore()
    return
  }

  context.restore()
}

function normalizeVector(vector: {x: number; y: number}) {
  const length = Math.hypot(vector.x, vector.y)
  if (length <= 1e-6) {
    return null
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

function resolveBezierStartTangent(
  first: NonNullable<DocumentNode['bezierPoints']>[number],
  second: NonNullable<DocumentNode['bezierPoints']>[number],
) {
  const candidates = [
    vectorBetween(first.cp2 ?? null, first.anchor),
    vectorBetween(second.cp1 ?? null, first.anchor),
    vectorBetween(second.anchor, first.anchor),
  ]

  return candidates.find((candidate) => candidate !== null) ?? {x: 0, y: 0}
}

function resolveBezierEndTangent(
  previous: NonNullable<DocumentNode['bezierPoints']>[number],
  last: NonNullable<DocumentNode['bezierPoints']>[number],
) {
  const candidates = [
    vectorBetween(last.anchor, last.cp1 ?? null),
    vectorBetween(last.anchor, previous.cp2 ?? null),
    vectorBetween(last.anchor, previous.anchor),
  ]

  return candidates.find((candidate) => candidate !== null) ?? {x: 0, y: 0}
}

function vectorBetween(
  to: {x: number; y: number} | null,
  from: {x: number; y: number} | null,
) {
  if (!to || !from) {
    return null
  }

  const x = to.x - from.x
  const y = to.y - from.y

  if (Math.hypot(x, y) <= 1e-6) {
    return null
  }

  return {x, y}
}

function beginClipPath(
  context: CanvasRenderingContext2D,
  clipSource: DocumentNode,
) {
  if (clipSource.type === 'rectangle' || clipSource.type === 'frame') {
    beginRoundedRectPath(context, {
      id: clipSource.id,
      type: clipSource.type,
      x: clipSource.x,
      y: clipSource.y,
      width: clipSource.width,
      height: clipSource.height,
    } as CanvasRendererProps['shapes'][number], clipSource)
    return true
  }

  if (clipSource.type === 'group') {
    context.beginPath()
    context.rect(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    return true
  }

  if (clipSource.type === 'ellipse') {
    beginEllipsePath(context, {
      id: clipSource.id,
      type: clipSource.type,
      x: clipSource.x,
      y: clipSource.y,
      width: clipSource.width,
      height: clipSource.height,
    } as CanvasRendererProps['shapes'][number], clipSource)
    return true
  }

  if (clipSource.type === 'polygon' || clipSource.type === 'star') {
    const points = clipSource.points
    context.beginPath()
    if (points && points.length > 2) {
      context.moveTo(points[0].x, points[0].y)
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y)
      }
      context.closePath()
      return true
    }
  }

  if (clipSource.type === 'path') {
    const bezierPoints = clipSource.bezierPoints
    const points = clipSource.points
    context.beginPath()

    if (bezierPoints && bezierPoints.length > 1) {
      const first = bezierPoints[0]
      context.moveTo(first.anchor.x, first.anchor.y)

      for (let index = 0; index < bezierPoints.length - 1; index += 1) {
        const current = bezierPoints[index]
        const next = bezierPoints[index + 1]
        const cp1 = current.cp2 ?? current.anchor
        const cp2 = next.cp1 ?? next.anchor
        context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, next.anchor.x, next.anchor.y)
      }

      context.closePath()
      return true
    }

    if (points && points.length > 1) {
      context.moveTo(points[0].x, points[0].y)
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y)
      }
      context.closePath()
      return true
    }
  }

  return false
}

function canUseClipPath(clipSource: DocumentNode) {
  if (clipSource.type === 'rectangle' || clipSource.type === 'frame' || clipSource.type === 'group' || clipSource.type === 'ellipse') {
    return true
  }

  if (clipSource.type === 'polygon' || clipSource.type === 'star') {
    return Boolean(clipSource.points && clipSource.points.length > 2)
  }

  if (clipSource.type === 'path') {
    return Boolean(
      (clipSource.bezierPoints && clipSource.bezierPoints.length > 1) ||
      (clipSource.points && clipSource.points.length > 1),
    )
  }

  return false
}

function shouldDrawShapeAtLod(
  shape: CanvasRendererProps['shapes'][number],
  viewportScale: number,
  lodLevel: Canvas2DLodLevel,
  lodConfig: import('./lod.ts').Canvas2DLodConfig,
) {
  if (shape.type === 'frame' || shape.type === 'group') {
    return true
  }

  const renderedWidth = Math.abs(shape.width * viewportScale)
  const renderedHeight = Math.abs(shape.height * viewportScale)
  const renderedExtent = Math.max(renderedWidth, renderedHeight)

  if (shape.type === 'lineSegment' || shape.type === 'path' || shape.type === 'polygon' || shape.type === 'star') {
    const renderedLength = Math.hypot(renderedWidth, renderedHeight)
    return renderedLength >= resolvePathMinRenderedLengthToDraw(lodLevel, lodConfig)
  }

  if (shape.type === 'image') {
    return renderedExtent >= resolveImageMinRenderedExtentToDraw(lodLevel, lodConfig)
  }

  return renderedExtent >= resolveShapeMinRenderedExtentToDraw(lodLevel, lodConfig)
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
