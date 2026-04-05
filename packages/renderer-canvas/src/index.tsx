import * as React from 'react'
import type { CanvasRendererProps } from '@venus/canvas-base'
import type { DocumentNode } from '@venus/document-core'
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
  const stroke = shape.isSelected ? '#2563eb' : shape.isHovered ? '#0ea5e9' : '#111827'
  const strokeWidth = shape.isSelected ? 2 : 1
  const fill = '#ffffff'
  const rotation = source?.rotation ?? 0
  const needsRotation = Math.abs(rotation) > 0.0001 && shape.type !== 'group'
  if (needsRotation) {
    applyShapeRotationTransform(context, shape, rotation)
  }
  const finish = () => {
    if (needsRotation) {
      context.restore()
    }
  }

  if (shape.type === 'group') {
    if (!shape.isHovered && !shape.isSelected) {
      finish()
      return
    }

    context.strokeStyle = stroke
    context.lineWidth = strokeWidth
    context.setLineDash([8, 6])
    context.strokeRect(shape.x, shape.y, shape.width, shape.height)
    context.setLineDash([])
    finish()
    return
  }

  if (shape.type === 'rectangle' || shape.type === 'frame') {
    context.fillStyle = fill
    context.strokeStyle = stroke
    context.lineWidth = strokeWidth
    context.fillRect(shape.x, shape.y, shape.width, shape.height)
    context.strokeRect(shape.x, shape.y, shape.width, shape.height)
    finish()
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
    finish()
    return
  }

  if (shape.type === 'lineSegment') {
    const start = {x: shape.x, y: shape.y}
    const end = {x: shape.x + shape.width, y: shape.y + shape.height}
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
    context.strokeStyle = stroke
    context.lineWidth = strokeWidth
    context.stroke()
    drawStrokeArrowheads(context, {
      stroke,
      strokeWidth,
      start,
      end,
      startTangent: {x: end.x - start.x, y: end.y - start.y},
      endTangent: {x: end.x - start.x, y: end.y - start.y},
      startArrowhead: source?.strokeStartArrowhead,
      endArrowhead: source?.strokeEndArrowhead,
    })
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
      context.fillStyle = fill
      context.fill()
      context.strokeStyle = stroke
      context.lineWidth = strokeWidth
      context.stroke()
      finish()
      return
    }

    context.fillStyle = fill
    context.strokeStyle = stroke
    context.lineWidth = strokeWidth
    context.fillRect(shape.x, shape.y, shape.width, shape.height)
    context.strokeRect(shape.x, shape.y, shape.width, shape.height)
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

      context.strokeStyle = stroke
      context.lineWidth = strokeWidth
      context.stroke()
      const start = bezierPoints[0].anchor
      const end = bezierPoints[bezierPoints.length - 1].anchor
      const firstPoint = bezierPoints[0]
      const second = bezierPoints[1]
      const preLast = bezierPoints[bezierPoints.length - 2]
      const last = bezierPoints[bezierPoints.length - 1]
      drawStrokeArrowheads(context, {
        stroke,
        strokeWidth,
        start,
        end,
        startTangent: resolveBezierStartTangent(firstPoint, second),
        endTangent: resolveBezierEndTangent(preLast, last),
        startArrowhead: source?.strokeStartArrowhead,
        endArrowhead: source?.strokeEndArrowhead,
      })
      finish()
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
      drawStrokeArrowheads(context, {
        stroke,
        strokeWidth,
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
    context.strokeStyle = stroke
    context.lineWidth = strokeWidth
    context.stroke()
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

    context.fillStyle = '#111827'
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

    context.fillStyle = '#fdf2f8'
    context.strokeStyle = stroke
    context.lineWidth = Math.max(2, strokeWidth)
    context.fillRect(shape.x, shape.y, shape.width, shape.height)
    context.strokeRect(shape.x, shape.y, shape.width, shape.height)

    if (image && image.complete) {
      context.drawImage(image, shape.x, shape.y, shape.width, shape.height)
      context.strokeRect(shape.x, shape.y, shape.width, shape.height)
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

    if (hasClip) {
      context.restore()
    }
    finish()
    return
  }

  finish()
}

function applyShapeRotationTransform(
  context: CanvasRenderingContext2D,
  shape: CanvasRendererProps['shapes'][number],
  rotation: number,
) {
  const bounds = {
    minX: Math.min(shape.x, shape.x + shape.width),
    maxX: Math.max(shape.x, shape.x + shape.width),
    minY: Math.min(shape.y, shape.y + shape.height),
    maxY: Math.max(shape.y, shape.y + shape.height),
  }
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }

  context.save()
  context.translate(center.x, center.y)
  context.rotate((rotation * Math.PI) / 180)
  context.translate(-center.x, -center.y)
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
  if (clipSource.type === 'rectangle' || clipSource.type === 'frame' || clipSource.type === 'group') {
    context.beginPath()
    context.rect(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    return true
  }

  if (clipSource.type === 'ellipse') {
    context.beginPath()
    context.ellipse(
      clipSource.x + clipSource.width / 2,
      clipSource.y + clipSource.height / 2,
      Math.abs(clipSource.width) / 2,
      Math.abs(clipSource.height) / 2,
      0,
      0,
      Math.PI * 2,
    )
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
  if (shape.isHovered || shape.isSelected) {
    return true
  }

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
