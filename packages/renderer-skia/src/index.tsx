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
  drawMs: number
  recordMs: number
}

const TILE_WORLD_SIZE = 1024
const SLOW_DRAW_THRESHOLD_MS = 12
const SLOW_RECORD_THRESHOLD_MS = 6
const PREWARM_SCENE_THRESHOLD = 20_000

let sharedCanvasKitPromise: Promise<CanvasKit> | null = null

const EMPTY_DIAGNOSTICS: SkiaRenderDiagnostics = {
  tileCount: 0,
  visibleShapeCount: 0,
  staticShapeCount: 0,
  overlayShapeCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  rebuiltTiles: 0,
  drawMs: 0,
  recordMs: 0,
}

let currentDiagnostics = EMPTY_DIAGNOSTICS
const diagnosticsListeners = new Set<VoidFunction>()

/**
 * Development trace helper for the Skia renderer adapter.
 */
function debugSkia(message: string, details?: unknown) {
  console.debug('[renderer-skia]', message, details)
}

function getSharedCanvasKit() {
  if (!sharedCanvasKitPromise) {
    debugSkia('init canvaskit')
    sharedCanvasKitPromise = CanvasKitInit({
      locateFile: (file) => (file.endsWith('.wasm') ? canvaskitWasmUrl : file),
    })
  }

  return sharedCanvasKitPromise
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
  const prewarmKeyRef = React.useRef<string | null>(null)
  const lastDrawKeyRef = React.useRef<string | null>(null)
  const sceneIndex = React.useMemo(() => {
    return buildRenderSceneIndex(document, computeSceneRevision(document))
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
        canvasKitRef.current = await getSharedCanvasKit()
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
      drawSceneOnce(
        canvasKitRef.current,
        surfaceRef.current,
        document,
        shapes,
        stats,
        viewport,
        renderQuality,
        sceneIndex,
        tileCacheRef.current,
        lastDrawKeyRef,
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

      drawSceneOnce(
      canvasKitRef.current,
      surfaceRef.current,
      document,
      shapes,
      stats,
      viewport,
      renderQuality,
      sceneIndex,
      tileCacheRef.current,
      lastDrawKeyRef,
    )
  }, [document, renderQuality, sceneIndex, shapes, stats, viewport])

  React.useEffect(() => {
    if (
      !canvasKitRef.current ||
      !surfaceRef.current ||
      renderQuality !== 'full' ||
      stats.shapeCount < PREWARM_SCENE_THRESHOLD
    ) {
      return
    }

    const prewarmKey = `${sceneIndex.revision}:${viewport.scale.toFixed(3)}:${Math.round(viewport.matrix[2])}:${Math.round(viewport.matrix[5])}:${viewport.viewportWidth}:${viewport.viewportHeight}`
    if (prewarmKeyRef.current === prewarmKey) {
      return
    }
    prewarmKeyRef.current = prewarmKey

    const run = () => {
      if (!canvasKitRef.current) {
        return
      }

      prewarmVisibleTileBuffer(
        canvasKitRef.current,
        sceneIndex,
        viewport,
        document,
        tileCacheRef.current,
      )
    }

    const idleHandle = schedulePrewarm(run)
    return () => cancelScheduledPrewarm(idleHandle)
  }, [renderQuality, sceneIndex, stats.shapeCount, viewport])

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
  const visibleDocumentBounds = clampBoundsToDocument(
    visibleBounds,
    document.width,
    document.height,
  )
  const pathSampleCount = resolvePathSampleCount(viewport.scale, renderQuality)
  const showTextContent = resolveShowTextContent(viewport.scale, renderQuality)
  const overlayShapes = resolveOverlayShapes(shapes, stats, visibleBounds)
  const visibleTiles = visibleDocumentBounds ? getVisibleTiles(visibleDocumentBounds) : []
  const needsBootstrapPrewarm =
    renderQuality === 'full' &&
    stats.shapeCount >= PREWARM_SCENE_THRESHOLD &&
    tileCache.size === 0
  const diagnostics = {
    tileCount: visibleTiles.length,
    visibleShapeCount: overlayShapes.length,
    staticShapeCount: 0,
    overlayShapeCount: overlayShapes.length,
    cacheHits: 0,
    cacheMisses: 0,
    rebuiltTiles: 0,
    drawMs: 0,
    recordMs: 0,
  }
  const drawStart = performance.now()

  skCanvas.clear(canvasKit.Color(243, 244, 246, 1))
  skCanvas.save()
  skCanvas.scale(dpr, dpr)
  skCanvas.translate(viewport.matrix[2], viewport.matrix[5])
  skCanvas.scale(viewport.matrix[0], viewport.matrix[4])

  drawPage(canvasKit, skCanvas, document.width, document.height)
  if (needsBootstrapPrewarm) {
    // Warm a wider ring on the first draw after scene replacement so the first
    // pan does not need to record edge tiles on the critical path.
    prewarmVisibleTileBuffer(
      canvasKit,
      sceneIndex,
      viewport,
      document,
      tileCache,
      2,
    )
  }
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
  diagnostics.drawMs = performance.now() - drawStart
  if (
    diagnostics.drawMs >= SLOW_DRAW_THRESHOLD_MS ||
    diagnostics.recordMs >= SLOW_RECORD_THRESHOLD_MS
  ) {
    debugSkia('slow frame', {
      drawMs: Number(diagnostics.drawMs.toFixed(2)),
      recordMs: Number(diagnostics.recordMs.toFixed(2)),
      tileCount: diagnostics.tileCount,
      cacheMisses: diagnostics.cacheMisses,
      rebuiltTiles: diagnostics.rebuiltTiles,
      renderQuality,
    })
  }
  publishDiagnostics(diagnostics)

  skCanvas.restore()
  surface.flush()
}

function drawSceneOnce(
  canvasKit: CanvasKit,
  surface: Surface | null,
  document: CanvasRendererProps['document'],
  shapes: CanvasRendererProps['shapes'],
  stats: CanvasRendererProps['stats'],
  viewport: CanvasRendererProps['viewport'],
  renderQuality: NonNullable<CanvasRendererProps['renderQuality']>,
  sceneIndex: RenderSceneIndex,
  tileCache: Map<string, TileCacheEntry>,
  lastDrawKeyRef: React.MutableRefObject<string | null>,
) {
  const drawKey = [
    sceneIndex.revision,
    stats.version,
    stats.hoveredIndex,
    stats.selectedIndex,
    renderQuality,
    viewport.scale.toFixed(4),
    Math.round(viewport.matrix[2]),
    Math.round(viewport.matrix[5]),
    viewport.viewportWidth,
    viewport.viewportHeight,
  ].join(':')

  if (lastDrawKeyRef.current === drawKey) {
    return
  }

  lastDrawKeyRef.current = drawKey
  drawScene(
    canvasKit,
    surface,
    document,
    shapes,
    stats,
    viewport,
    renderQuality,
    sceneIndex,
    tileCache,
  )
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
          diagnostics,
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

function prewarmVisibleTileBuffer(
  canvasKit: CanvasKit,
  sceneIndex: RenderSceneIndex,
  viewport: CanvasRendererProps['viewport'],
  document: CanvasRendererProps['document'],
  tileCache: Map<string, TileCacheEntry>,
  marginTiles = 1,
) {
  const visibleBounds = getVisibleWorldBounds(viewport)
  const visibleDocumentBounds = clampBoundsToDocument(
    visibleBounds,
    document.width,
    document.height,
  )
  if (!visibleDocumentBounds) {
    return
  }
  const bufferedTiles = getBufferedTiles(visibleDocumentBounds, marginTiles)
  const pathSampleCount = resolvePathSampleCount(viewport.scale, 'full')
  const showTextContent = resolveShowTextContent(viewport.scale, 'full')

  bufferedTiles.forEach((tile) => {
    const signature = createTileSignature(sceneIndex.revision, tile.key, pathSampleCount, showTextContent)
    const cached = tileCache.get(tile.key)
    if (cached && cached.signature === signature) {
      return
    }

    const tileShapes = sceneIndex.tileShapeMap.get(tile.key) ?? []
    if (tileShapes.length === 0) {
      return
    }

    cached?.picture.delete()
    tileCache.set(tile.key, {
      picture: recordTilePicture(
        canvasKit,
        sceneIndex,
        tile,
        tileShapes,
        pathSampleCount,
        showTextContent,
        undefined,
      ),
      signature,
    })
  })
}

function recordTilePicture(
  canvasKit: CanvasKit,
  sceneIndex: RenderSceneIndex,
  tile: TileBounds,
  shapes: CanvasRendererProps['shapes'],
  pathSampleCount: number,
  showTextContent: boolean,
  diagnostics?: SkiaRenderDiagnostics,
) {
  const recordStart = performance.now()
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
  if (diagnostics) {
    diagnostics.recordMs += performance.now() - recordStart
  }
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
      const source = sceneIndex.sourceById.get(shape.id)
      drawText(canvasKit, skCanvas, shape, source, showTextContent)
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
  source: DocumentNode | undefined,
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
    const text = source?.text || shape.name
    const primaryRun = source?.textRuns?.[0]
    const textPaint = new canvasKit.Paint()
    textPaint.setAntiAlias(true)
    textPaint.setStyle(canvasKit.PaintStyle.Fill)
    textPaint.setColor(canvasKit.Color(15, 23, 42, 1))

    const font = new canvasKit.Font(null, primaryRun?.style?.fontSize ?? 16)
    skCanvas.drawText(text, shape.x + 10, shape.y + 28, textPaint, font)
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
  return getBufferedTiles(bounds, 0)
}

function clampBoundsToDocument(
  bounds: VisibleWorldBounds,
  documentWidth: number,
  documentHeight: number,
) {
  const left = Math.max(0, bounds.left)
  const top = Math.max(0, bounds.top)
  const right = Math.min(documentWidth, bounds.right)
  const bottom = Math.min(documentHeight, bounds.bottom)

  if (right <= left || bottom <= top) {
    return null
  }

  return {left, top, right, bottom}
}

function getBufferedTiles(bounds: VisibleWorldBounds, marginTiles: number) {
  const startColumn = Math.floor(bounds.left / TILE_WORLD_SIZE)
  const endColumn = Math.floor(bounds.right / TILE_WORLD_SIZE)
  const startRow = Math.floor(bounds.top / TILE_WORLD_SIZE)
  const endRow = Math.floor(bounds.bottom / TILE_WORLD_SIZE)
  const tiles: TileBounds[] = []

  for (let row = startRow - marginTiles; row <= endRow + marginTiles; row += 1) {
    for (let column = startColumn - marginTiles; column <= endColumn + marginTiles; column += 1) {
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

function schedulePrewarm(callback: VoidFunction) {
  const runtimeWindow = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    cancelIdleCallback?: (id: number) => void
    setTimeout: typeof setTimeout
    clearTimeout: typeof clearTimeout
  }

  if (typeof runtimeWindow.requestIdleCallback === 'function') {
    const idleId = runtimeWindow.requestIdleCallback(() => callback(), {timeout: 120})
    return {kind: 'idle' as const, id: idleId}
  }

  const timeoutId = runtimeWindow.setTimeout(callback, 16)
  return {kind: 'timeout' as const, id: timeoutId}
}

function cancelScheduledPrewarm(handle: {kind: 'idle' | 'timeout'; id: number}) {
  const runtimeWindow = globalThis as typeof globalThis & {
    cancelIdleCallback?: (id: number) => void
    clearTimeout: typeof clearTimeout
  }

  if (handle.kind === 'idle' && typeof runtimeWindow.cancelIdleCallback === 'function') {
    runtimeWindow.cancelIdleCallback(handle.id)
    return
  }

  runtimeWindow.clearTimeout(handle.id)
}

function computeSceneRevision(document: CanvasRendererProps['document']) {
  let hash = 2166136261 >>> 0

  document.shapes.forEach((shape) => {
    hash = fnv1aHashString(hash, shape.id)
    hash = fnv1aHashNumber(hash, shape.x)
    hash = fnv1aHashNumber(hash, shape.y)
    hash = fnv1aHashNumber(hash, shape.width)
    hash = fnv1aHashNumber(hash, shape.height)
    hash = fnv1aHashNumber(hash, shape.rotation ?? 0)
    hash = fnv1aHashNumber(hash, shape.flipX ? 1 : 0)
    hash = fnv1aHashNumber(hash, shape.flipY ? 1 : 0)
  })

  return hash
}

function fnv1aHashString(seed: number, value: string) {
  let hash = seed >>> 0
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function fnv1aHashNumber(seed: number, value: number) {
  return fnv1aHashString(seed, String(value))
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
