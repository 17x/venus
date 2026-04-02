import * as React from 'react'
import CanvasKitInit from 'canvaskit-wasm/full'
import type { Canvas, CanvasKit, SkPicture, Surface } from 'canvaskit-wasm'
import canvaskitWasmUrl from 'canvaskit-wasm/bin/full/canvaskit.wasm?url'
import type { CanvasRendererProps } from '@venus/canvas-base'
import type {DocumentNode} from '@venus/document-core'
import {cubicBezier} from '@venus/document-core'

interface VisibleWorldBounds {
  left: number
  top: number
  right: number
  bottom: number
}

interface TileBounds {
  key: string
  left: number
  top: number
  right: number
  bottom: number
}

interface TileCacheEntry {
  picture: SkPicture
  signature: string
}

interface RenderSceneIndex {
  revision: number
  sourceById: Map<string, DocumentNode>
  tileShapeMap: Map<string, CanvasRendererProps['shapes']>
}

export interface SkiaRenderDiagnostics {
  tileCount: number
  visibleShapeCount: number
  staticShapeCount: number
  overlayShapeCount: number
  cacheHits: number
  cacheMisses: number
  rebuiltTiles: number
}

const TILE_WORLD_SIZE = 1024

const EMPTY_DIAGNOSTICS: SkiaRenderDiagnostics = {
  tileCount: 0,
  visibleShapeCount: 0,
  staticShapeCount: 0,
  overlayShapeCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  rebuiltTiles: 0,
}

let currentDiagnostics = EMPTY_DIAGNOSTICS
const diagnosticsListeners = new Set<VoidFunction>()

/**
 * Development trace helper for the Skia renderer adapter.
 */
function debugSkia(message: string, details?: unknown) {
  console.debug('[renderer-skia]', message, details)
}

function publishDiagnostics(nextDiagnostics: SkiaRenderDiagnostics) {
  if (areDiagnosticsEqual(currentDiagnostics, nextDiagnostics)) {
    return
  }

  currentDiagnostics = nextDiagnostics
  diagnosticsListeners.forEach((listener) => listener())
}

export function useSkiaRenderDiagnostics() {
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
  stats,
  viewport,
  renderQuality = 'full',
}: CanvasRendererProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const canvasKitRef = React.useRef<CanvasKit | null>(null)
  const surfaceRef = React.useRef<Surface | null>(null)
  const tileCacheRef = React.useRef<Map<string, TileCacheEntry>>(new Map())
  const sceneRevisionRef = React.useRef(0)
  const sceneIndex = React.useMemo(() => {
    sceneRevisionRef.current += 1
    return buildRenderSceneIndex(document, sceneRevisionRef.current)
  }, [document])

  React.useEffect(() => {
    tileCacheRef.current.forEach((entry) => {
      entry.picture.delete()
    })
    tileCacheRef.current.clear()
  }, [sceneIndex])

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
      surfaceRef.current =
        canvasKitRef.current.MakeWebGLCanvasSurface(canvasRef.current) ??
        canvasKitRef.current.MakeSWCanvasSurface(canvasRef.current)
      debugSkia('surface ready', {
        width: viewport.viewportWidth,
        height: viewport.viewportHeight,
        backend: surfaceRef.current ? 'gpu-or-sw' : 'unavailable',
      })
      drawScene(
        canvasKitRef.current,
        surfaceRef.current,
        document,
        shapes,
        stats,
        viewport,
        renderQuality,
        sceneIndex,
        tileCacheRef.current,
      )
    }

    initSurface()

    return () => {
      cancelled = true
      surfaceRef.current?.dispose()
      surfaceRef.current = null
      tileCacheRef.current.forEach((entry) => {
        entry.picture.delete()
      })
      tileCacheRef.current.clear()
    }
  }, [document.height, document.width, viewport.viewportHeight, viewport.viewportWidth])

  React.useEffect(() => {
    if (!canvasKitRef.current || !surfaceRef.current) {
      return
    }

    drawScene(
      canvasKitRef.current,
      surfaceRef.current,
      document,
      shapes,
      stats,
      viewport,
      renderQuality,
      sceneIndex,
      tileCacheRef.current,
    )
  }, [document, renderQuality, sceneIndex, shapes, stats, viewport])

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
  stats: CanvasRendererProps['stats'],
  viewport: CanvasRendererProps['viewport'],
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>,
  sceneIndex: RenderSceneIndex,
  tileCache: Map<string, TileCacheEntry>,
) {
  if (!surface) {
    return
  }

  const skCanvas = surface.getCanvas()
  const dpr = window.devicePixelRatio || 1
  const visibleBounds = getVisibleWorldBounds(viewport)
  const pathSampleCount = resolvePathSampleCount(viewport.scale, renderQuality)
  const showTextContent = resolveShowTextContent(viewport.scale, renderQuality)
  const overlayShapes = resolveOverlayShapes(shapes, stats, visibleBounds)
  const visibleTiles = getVisibleTiles(visibleBounds)
  const diagnostics = {
    tileCount: visibleTiles.length,
    visibleShapeCount: overlayShapes.length,
    staticShapeCount: 0,
    overlayShapeCount: overlayShapes.length,
    cacheHits: 0,
    cacheMisses: 0,
    rebuiltTiles: 0,
  }

  skCanvas.clear(canvasKit.Color(243, 244, 246, 1))
  skCanvas.save()
  skCanvas.scale(dpr, dpr)
  skCanvas.translate(viewport.matrix[2], viewport.matrix[5])
  skCanvas.scale(viewport.matrix[0], viewport.matrix[4])

  drawPage(canvasKit, skCanvas, document.width, document.height)
  drawVisibleTiles(
    canvasKit,
    skCanvas,
    sceneIndex,
    visibleTiles,
    tileCache,
    pathSampleCount,
    showTextContent,
    diagnostics,
  )
  drawOverlayShapes(canvasKit, skCanvas, sceneIndex, overlayShapes, pathSampleCount)
  publishDiagnostics(diagnostics)

  skCanvas.restore()
  surface.flush()
}

function resolveOverlayShapes(
  shapes: CanvasRendererProps['shapes'],
  stats: CanvasRendererProps['stats'],
  visibleBounds: VisibleWorldBounds,
) {
  const overlayMap = new Map<string, CanvasRendererProps['shapes'][number]>()

  if (stats.hoveredIndex >= 0) {
    const hoveredShape = shapes[stats.hoveredIndex]
    if (hoveredShape && intersectsVisibleBounds(hoveredShape, visibleBounds)) {
      overlayMap.set(hoveredShape.id, hoveredShape)
    }
  }

  if (stats.selectedIndex >= 0) {
    const selectedShape = shapes[stats.selectedIndex]
    if (selectedShape && intersectsVisibleBounds(selectedShape, visibleBounds)) {
      overlayMap.set(selectedShape.id, selectedShape)
    }
  }

  return Array.from(overlayMap.values())
}

function drawVisibleTiles(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  sceneIndex: RenderSceneIndex,
  visibleTiles: TileBounds[],
  tileCache: Map<string, TileCacheEntry>,
  pathSampleCount: number,
  showTextContent: boolean,
  diagnostics: SkiaRenderDiagnostics,
) {
  const visibleTileKeys = new Set(visibleTiles.map((tile) => tile.key))
  const visibleShapeIds = new Set<string>()

  tileCache.forEach((entry, key) => {
    if (visibleTileKeys.has(key)) {
      return
    }

    entry.picture.delete()
    tileCache.delete(key)
  })

  visibleTiles.forEach((tile) => {
    const tileShapes = sceneIndex.tileShapeMap.get(tile.key) ?? []
    tileShapes.forEach((shape) => {
      visibleShapeIds.add(shape.id)
    })
    const signature = createTileSignature(sceneIndex.revision, tile.key, pathSampleCount, showTextContent)
    const cached = tileCache.get(tile.key)

    if (cached && cached.signature === signature) {
      diagnostics.cacheHits += 1
    } else {
      diagnostics.cacheMisses += 1

      cached?.picture.delete()
      tileCache.set(tile.key, {
        picture: recordTilePicture(
          canvasKit,
          sceneIndex,
          tile,
          tileShapes,
          pathSampleCount,
          showTextContent,
        ),
        signature,
      })
      diagnostics.rebuiltTiles += 1
    }

    const entry = tileCache.get(tile.key)
    if (entry) {
      skCanvas.drawPicture(entry.picture)
    }
  })

  diagnostics.staticShapeCount = visibleShapeIds.size
  diagnostics.visibleShapeCount = diagnostics.staticShapeCount + diagnostics.overlayShapeCount
}

function recordTilePicture(
  canvasKit: CanvasKit,
  sceneIndex: RenderSceneIndex,
  tile: TileBounds,
  shapes: CanvasRendererProps['shapes'],
  pathSampleCount: number,
  showTextContent: boolean,
) {
  const recorder = new canvasKit.PictureRecorder()
  const tileCanvas = recorder.beginRecording(
    canvasKit.XYWHRect(tile.left, tile.top, tile.right - tile.left, tile.bottom - tile.top),
    false,
  )

  tileCanvas.save()
  tileCanvas.clipRect(
    canvasKit.XYWHRect(tile.left, tile.top, tile.right - tile.left, tile.bottom - tile.top),
    canvasKit.ClipOp.Intersect,
    true,
  )
  drawShapes(canvasKit, tileCanvas, sceneIndex, shapes, pathSampleCount, showTextContent)
  tileCanvas.restore()

  const picture = recorder.finishRecordingAsPicture()
  recorder.delete()
  return picture
}

function drawShapes(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  sceneIndex: RenderSceneIndex,
  shapes: CanvasRendererProps['shapes'],
  pathSampleCount: number,
  showTextContent: boolean,
) {
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
      const source = sceneIndex.sourceById.get(shape.id)
      drawPathShape(canvasKit, skCanvas, shape, source?.bezierPoints, source?.points, pathSampleCount)
      return
    }

    if (shape.type === 'text') {
      drawText(canvasKit, skCanvas, shape, showTextContent)
    }
  })
}

function drawOverlayShapes(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  sceneIndex: RenderSceneIndex,
  shapes: CanvasRendererProps['shapes'],
  pathSampleCount: number,
) {
  shapes.forEach((shape) => {
    if (shape.type === 'rectangle' || shape.type === 'frame') {
      drawRectangleOverlay(canvasKit, skCanvas, shape)
      return
    }

    if (shape.type === 'ellipse') {
      drawEllipseOverlay(canvasKit, skCanvas, shape)
      return
    }

    if (shape.type === 'lineSegment') {
      drawLineSegmentOverlay(canvasKit, skCanvas, shape)
      return
    }

    if (shape.type === 'path') {
      const source = sceneIndex.sourceById.get(shape.id)
      drawPathOverlay(canvasKit, skCanvas, shape, source?.bezierPoints, source?.points, pathSampleCount)
      return
    }

    if (shape.type === 'text') {
      drawTextOverlay(canvasKit, skCanvas, shape)
    }
  })
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

function drawRectangleOverlay(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
) {
  const stroke = new canvasKit.Paint()
  stroke.setAntiAlias(true)
  stroke.setStyle(canvasKit.PaintStyle.Stroke)
  stroke.setStrokeWidth(shape.isSelected ? 3 : 2)
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

function drawEllipseOverlay(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
) {
  const stroke = new canvasKit.Paint()
  stroke.setAntiAlias(true)
  stroke.setStyle(canvasKit.PaintStyle.Stroke)
  stroke.setStrokeWidth(shape.isSelected ? 3 : 2)
  stroke.setColor(resolveStrokeColor(canvasKit, shape))
  skCanvas.drawOval(canvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height), stroke)
  stroke.delete()
}

function drawText(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
  showTextContent: boolean,
) {
  const border = new canvasKit.Paint()
  border.setAntiAlias(true)
  border.setStyle(canvasKit.PaintStyle.Stroke)
  border.setStrokeWidth(shape.isSelected ? 2.5 : 1)
  border.setColor(resolveStrokeColor(canvasKit, shape))
  skCanvas.drawRect(canvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height), border)
  border.delete()

  if (showTextContent) {
    const textPaint = new canvasKit.Paint()
    textPaint.setAntiAlias(true)
    textPaint.setStyle(canvasKit.PaintStyle.Fill)
    textPaint.setColor(canvasKit.Color(15, 23, 42, 1))

    const font = new canvasKit.Font(null, 16)
    skCanvas.drawText(shape.name, shape.x + 10, shape.y + 28, textPaint, font)
    font.delete()
    textPaint.delete()
  }
}

function drawTextOverlay(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
) {
  const border = new canvasKit.Paint()
  border.setAntiAlias(true)
  border.setStyle(canvasKit.PaintStyle.Stroke)
  border.setStrokeWidth(shape.isSelected ? 2.5 : 1.75)
  border.setColor(resolveStrokeColor(canvasKit, shape))
  skCanvas.drawRect(canvasKit.XYWHRect(shape.x, shape.y, shape.width, shape.height), border)
  border.delete()
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

function drawLineSegmentOverlay(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
) {
  const stroke = new canvasKit.Paint()
  stroke.setAntiAlias(true)
  stroke.setStyle(canvasKit.PaintStyle.Stroke)
  stroke.setStrokeWidth(shape.isSelected ? 4 : 3)
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
  sampleCount = 20,
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

      for (let step = 1; step <= sampleCount; step += 1) {
        const sample = cubicBezier(step / sampleCount, p0, p1, p2, p3)
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

function drawPathOverlay(
  canvasKit: CanvasKit,
  skCanvas: Canvas,
  shape: CanvasRendererProps['shapes'][number],
  bezierPoints?: Array<{
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }>,
  points?: Array<{x: number; y: number}>,
  sampleCount = 20,
) {
  drawPathShape(
    canvasKit,
    skCanvas,
    shape,
    bezierPoints,
    points,
    sampleCount,
  )
}

function getVisibleWorldBounds(viewport: CanvasRendererProps['viewport']): VisibleWorldBounds {
  const left = -viewport.matrix[2] / viewport.scale
  const top = -viewport.matrix[5] / viewport.scale
  const right = left + viewport.viewportWidth / viewport.scale
  const bottom = top + viewport.viewportHeight / viewport.scale

  return {
    left,
    top,
    right,
    bottom,
  }
}

function intersectsVisibleBounds(
  shape: CanvasRendererProps['shapes'][number],
  bounds: VisibleWorldBounds,
) {
  return !(
    shape.x + shape.width < bounds.left ||
    shape.x > bounds.right ||
    shape.y + shape.height < bounds.top ||
    shape.y > bounds.bottom
  )
}

function resolvePathSampleCount(
  scale: number,
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>,
) {
  if (renderQuality === 'interactive') {
    if (scale < 0.2) {
      return 2
    }

    if (scale < 0.5) {
      return 3
    }

    if (scale < 1) {
      return 4
    }

    return 6
  }

  if (scale < 0.2) {
    return 4
  }

  if (scale < 0.5) {
    return 8
  }

  if (scale < 1) {
    return 12
  }

  return 20
}

function resolveShowTextContent(
  scale: number,
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>,
) {
  if (renderQuality === 'interactive') {
    return scale >= 1.1
  }

  return scale >= 0.45
}

function getVisibleTiles(bounds: VisibleWorldBounds) {
  const startColumn = Math.floor(bounds.left / TILE_WORLD_SIZE)
  const endColumn = Math.floor(bounds.right / TILE_WORLD_SIZE)
  const startRow = Math.floor(bounds.top / TILE_WORLD_SIZE)
  const endRow = Math.floor(bounds.bottom / TILE_WORLD_SIZE)
  const tiles: TileBounds[] = []

  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const left = column * TILE_WORLD_SIZE
      const top = row * TILE_WORLD_SIZE

      tiles.push({
        key: `${column}:${row}`,
        left,
        top,
        right: left + TILE_WORLD_SIZE,
        bottom: top + TILE_WORLD_SIZE,
      })
    }
  }

  return tiles
}

function buildRenderSceneIndex(
  document: CanvasRendererProps['document'],
  revision: number,
): RenderSceneIndex {
  const sourceById = new Map<string, DocumentNode>()
  const tileMap = new Map<string, CanvasRendererProps['shapes']>()
  document.shapes.forEach((shape) => {
    sourceById.set(shape.id, shape)
    const neutralShape = {
      ...shape,
      isHovered: false,
      isSelected: false,
    }
    const startColumn = Math.floor(shape.x / TILE_WORLD_SIZE)
    const endColumn = Math.floor((shape.x + shape.width) / TILE_WORLD_SIZE)
    const startRow = Math.floor(shape.y / TILE_WORLD_SIZE)
    const endRow = Math.floor((shape.y + shape.height) / TILE_WORLD_SIZE)

    for (let row = startRow; row <= endRow; row += 1) {
      for (let column = startColumn; column <= endColumn; column += 1) {
        const key = `${column}:${row}`
        let items = tileMap.get(key)
        if (!items) {
          items = []
          tileMap.set(key, items)
        }
        items.push(neutralShape)
      }
    }
  })

  return {
    revision,
    sourceById,
    tileShapeMap: tileMap,
  }
}

function createTileSignature(
  revision: number,
  tileKey: string,
  pathSampleCount: number,
  showTextContent: boolean,
) {
  return `${revision}:${tileKey}:${pathSampleCount}:${showTextContent ? 1 : 0}`
}

function areDiagnosticsEqual(
  left: SkiaRenderDiagnostics,
  right: SkiaRenderDiagnostics,
) {
  return (
    left.tileCount === right.tileCount &&
    left.visibleShapeCount === right.visibleShapeCount &&
    left.staticShapeCount === right.staticShapeCount &&
    left.overlayShapeCount === right.overlayShapeCount &&
    left.cacheHits === right.cacheHits &&
    left.cacheMisses === right.cacheMisses &&
    left.rebuiltTiles === right.rebuiltTiles
  )
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
