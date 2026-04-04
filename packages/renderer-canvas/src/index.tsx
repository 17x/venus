import * as React from 'react'
import type { CanvasRendererProps } from '@venus/canvas-base'
import type { DocumentNode } from '@venus/document-core'
import {
  defaultCanvas2DLodConfig,
  resolveImageSmoothingQuality,
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
  shapes,
  viewport,
  renderQuality = 'full',
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
      shapes,
      viewport,
      renderQuality,
      lodConfig,
      shapeSourceById,
      imageCache: imageCacheRef.current,
    })
  }, [document, imageVersion, lodConfig, renderQuality, shapeSourceById, shapes, viewport])

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
  lodConfig,
  shapeSourceById,
  imageCache,
}: {
  canvas: HTMLCanvasElement
  document: CanvasRendererProps['document']
  shapes: CanvasRendererProps['shapes']
  viewport: CanvasRendererProps['viewport']
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>
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
    renderQuality,
    lodConfig,
  )
  const imageSmoothingQuality = resolveImageSmoothingQuality(
    renderQuality,
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
    const source = shapeSourceById.get(shape.id)
    drawShape(context, shape, source, showTextContent, imageCache, viewport.scale, lodConfig)
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
  showTextContent: boolean,
  imageCache: Map<string, HTMLImageElement>,
  viewportScale: number,
  lodConfig: import('./lod.ts').Canvas2DLodConfig,
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
    const steps = lodConfig.path.fallbackCurveSteps
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
    return
  }

  if (shape.type === 'image') {
    const image = source?.assetUrl ? imageCache.get(source.assetUrl) : undefined

    context.fillStyle = '#fdf2f8'
    context.strokeStyle = stroke
    context.lineWidth = Math.max(2, strokeWidth)
    context.fillRect(shape.x, shape.y, shape.width, shape.height)
    context.strokeRect(shape.x, shape.y, shape.width, shape.height)

    if (image && image.complete) {
      context.drawImage(image, shape.x, shape.y, shape.width, shape.height)
      context.strokeRect(shape.x, shape.y, shape.width, shape.height)
      return
    }

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
    return
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
