import * as React from 'react'
import {CanvasViewport, useCanvasRuntime} from '@venus/canvas-base'
import {nid} from '@venus/document-core'
import {SkiaRenderer, useSkiaRenderDiagnostics} from '@venus/renderer-skia'
import {
  Canvas2DRenderer,
  defaultCanvas2DLodConfig,
  imageHeavyCanvas2DLodConfig,
  performanceCanvas2DLodConfig,
  useCanvas2DRenderDiagnostics,
  type Canvas2DLodConfig,
} from '@venus/renderer-canvas'
import type {EditorRuntimeCommand} from '@venus/editor-worker'
import type {HistorySummary} from '@venus/editor-worker'
import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot, SceneStats} from '@venus/shared-memory'
import type {CanvasRenderer, CanvasViewportState} from '@venus/canvas-base'
import {MOCK_DOCUMENT} from './mockDocument.ts'
import {createStressDocument} from './sceneGenerator.ts'
import './index.css'

const STRESS_SHAPE_COUNT = 100_000
const LARGE_STRESS_SHAPE_COUNT = 50_000
const MEDIUM_STRESS_SHAPE_COUNT = 10_000
const EXTREME_STRESS_SHAPE_COUNT = 1_000_000
const SHAPE_TYPE_ORDER = ['frame', 'rectangle', 'ellipse', 'lineSegment', 'path', 'text', 'image'] as const
const CANVAS_LOD_PRESETS = {
  balanced: defaultCanvas2DLodConfig,
  performance: performanceCanvas2DLodConfig,
  imageHeavy: imageHeavyCanvas2DLodConfig,
} satisfies Record<'balanced' | 'performance' | 'imageHeavy', Canvas2DLodConfig>

function createGeneratedImageDataUrl(label: string, width: number, height: number) {
  const hue = Math.floor(Math.random() * 360)
  const accentHue = (hue + 42) % 360
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue} 78% 72%)" />
          <stop offset="100%" stop-color="hsl(${accentHue} 82% 58%)" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="28" fill="url(#bg)" />
      <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.28)}" r="${Math.round(Math.min(width, height) * 0.18)}" fill="rgba(255,255,255,0.28)" />
      <path d="M0 ${Math.round(height * 0.7)} C ${Math.round(width * 0.22)} ${Math.round(height * 0.48)}, ${Math.round(width * 0.48)} ${Math.round(height * 0.95)}, ${width} ${Math.round(height * 0.62)} L ${width} ${height} L 0 ${height} Z" fill="rgba(15,23,42,0.14)" />
      <text x="28" y="${Math.round(height * 0.45)}" font-family="Arial, sans-serif" font-size="${Math.max(18, Math.round(width * 0.12))}" font-weight="700" fill="white">${label}</text>
      <text x="28" y="${Math.round(height * 0.68)}" font-family="Arial, sans-serif" font-size="${Math.max(12, Math.round(width * 0.06))}" fill="rgba(255,255,255,0.88)">Generated in playground</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createRandomMockShape() {
  const x = 80 + Math.round(Math.random() * 720)
  const y = 80 + Math.round(Math.random() * 420)
  const width = 120 + Math.round(Math.random() * 100)
  const height = 90 + Math.round(Math.random() * 80)

  if (Math.random() < 0.35) {
    const imageWidth = 180 + Math.round(Math.random() * 140)
    const imageHeight = 120 + Math.round(Math.random() * 100)
    const label = `Mock ${Math.floor(Math.random() * 100)}`

    return {
      id: nid(),
      type: 'image' as const,
      name: label,
      assetUrl: createGeneratedImageDataUrl(label, imageWidth, imageHeight),
      x,
      y,
      width: imageWidth,
      height: imageHeight,
    }
  }

  return {
    id: nid(),
    type: 'rectangle' as const,
    name: `Rect ${Math.floor(Math.random() * 100)}`,
    x,
    y,
    width,
    height,
  }
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function summarizeShapeTypes(document: EditorDocument) {
  const counts = new Map<string, number>()
  document.shapes.forEach((shape) => {
    counts.set(shape.type, (counts.get(shape.type) ?? 0) + 1)
  })

  return SHAPE_TYPE_ORDER
    .map((type) => ({
      type,
      count: counts.get(type) ?? 0,
    }))
    .filter((item) => item.count > 0)
}

function App() {
  const [documentMode, setDocumentMode] = React.useState<'demo' | 'medium-stress' | 'large-stress' | 'stress' | 'extreme-stress' | 'image-heavy' | 'image-heavy-large'>('demo')
  const [rendererBackend, setRendererBackend] = React.useState<'skia' | 'canvas2d'>('canvas2d')
  const [canvasLodPreset, setCanvasLodPreset] = React.useState<'balanced' | 'performance' | 'imageHeavy'>('balanced')
  const [mediumStressRevision, setMediumStressRevision] = React.useState(0)
  const [largeStressRevision, setLargeStressRevision] = React.useState(0)
  const [stressRevision, setStressRevision] = React.useState(0)
  const [extremeStressRevision, setExtremeStressRevision] = React.useState(0)
  const [imageHeavyRevision, setImageHeavyRevision] = React.useState(0)
  const [imageHeavyLargeRevision, setImageHeavyLargeRevision] = React.useState(0)
  const mediumStressDocument = React.useMemo(
    () => createStressDocument(MEDIUM_STRESS_SHAPE_COUNT),
    [mediumStressRevision],
  )
  const largeStressDocument = React.useMemo(
    () => createStressDocument(LARGE_STRESS_SHAPE_COUNT),
    [largeStressRevision],
  )
  const stressDocument = React.useMemo(
    () => createStressDocument(STRESS_SHAPE_COUNT),
    [stressRevision],
  )
  const extremeStressDocument = React.useMemo(
    () => createStressDocument(EXTREME_STRESS_SHAPE_COUNT),
    [extremeStressRevision],
  )
  const imageHeavyDocument = React.useMemo(
    () => createStressDocument(MEDIUM_STRESS_SHAPE_COUNT, {imageDensity: 'high'}),
    [imageHeavyRevision],
  )
  const imageHeavyLargeDocument = React.useMemo(
    () => createStressDocument(LARGE_STRESS_SHAPE_COUNT, {imageDensity: 'high'}),
    [imageHeavyLargeRevision],
  )
  const activeDocument =
    documentMode === 'extreme-stress'
      ? extremeStressDocument
      : documentMode === 'image-heavy-large'
      ? imageHeavyLargeDocument
      : documentMode === 'image-heavy'
      ? imageHeavyDocument
      : documentMode === 'stress'
      ? stressDocument
      : documentMode === 'large-stress'
        ? largeStressDocument
      : documentMode === 'medium-stress'
        ? mediumStressDocument
        : MOCK_DOCUMENT
  const createWorker = React.useCallback(
    () => new Worker(new URL('./editor.worker.ts', import.meta.url), {type: 'module'}),
    [],
  )
  const runtimeOptions = React.useMemo(
    () => ({
      capacity: activeDocument.shapes.length + 16,
      createWorker,
      document: activeDocument,
    }),
    [activeDocument, createWorker],
  )
  const runtime = useCanvasRuntime(runtimeOptions)

  const selectedShape = runtime.stats.selectedIndex >= 0
    ? runtime.shapes[runtime.stats.selectedIndex] ?? null
    : null
  const selectedNode = selectedShape
    ? runtime.document.shapes.find((shape) => shape.id === selectedShape.id) ?? null
    : null

  const dispatch = React.useCallback((command: EditorRuntimeCommand) => {
    runtime.dispatchCommand(command)
  }, [runtime.dispatchCommand])
  const handleLoadDemo = React.useCallback(() => {
    setDocumentMode('demo')
  }, [])
  const handleLoadStress = React.useCallback(() => {
    setStressRevision((current) => current + 1)
    setDocumentMode('stress')
  }, [])
  const handleLoadExtremeStress = React.useCallback(() => {
    setExtremeStressRevision((current) => current + 1)
    setDocumentMode('extreme-stress')
  }, [])
  const handleLoadMediumStress = React.useCallback(() => {
    setMediumStressRevision((current) => current + 1)
    setDocumentMode('medium-stress')
  }, [])
  const handleLoadLargeStress = React.useCallback(() => {
    setLargeStressRevision((current) => current + 1)
    setDocumentMode('large-stress')
  }, [])
  const handleLoadImageHeavy = React.useCallback(() => {
    setImageHeavyRevision((current) => current + 1)
    setDocumentMode('image-heavy')
  }, [])
  const handleLoadImageHeavyLarge = React.useCallback(() => {
    setImageHeavyLargeRevision((current) => current + 1)
    setDocumentMode('image-heavy-large')
  }, [])
  const handlePointerMove = React.useCallback((pointer: { x: number; y: number }) => {
    runtime.postPointer('pointermove', pointer)
  }, [runtime.postPointer])
  const handlePointerDown = React.useCallback((pointer: { x: number; y: number }) => {
    runtime.postPointer('pointerdown', pointer)
  }, [runtime.postPointer])

  const selectedLabel = selectedShape ? `${selectedShape.name} (${selectedShape.type})` : 'None'
  const typeSummary = React.useMemo(() => summarizeShapeTypes(runtime.document), [runtime.document])

  return (
    <main className="playground-shell">
      <PlaygroundSidebar
        documentMode={documentMode}
        rendererBackend={rendererBackend}
        canvasLodPreset={canvasLodPreset}
        document={runtime.document}
        stats={runtime.stats}
        history={runtime.history}
        viewport={runtime.viewport}
        ready={runtime.ready}
        sabSupported={runtime.sabSupported}
        scaleLabel={runtime.viewport.scale.toFixed(2)}
        selectedLabel={selectedLabel}
        selectedShape={selectedShape}
        selectedNode={selectedNode}
        typeSummary={typeSummary}
        onLoadDemo={handleLoadDemo}
        onLoadMediumStress={handleLoadMediumStress}
        onLoadLargeStress={handleLoadLargeStress}
        onLoadStress={handleLoadStress}
        onLoadExtremeStress={handleLoadExtremeStress}
        onLoadImageHeavy={handleLoadImageHeavy}
        onLoadImageHeavyLarge={handleLoadImageHeavyLarge}
        onUseSkiaRenderer={() => setRendererBackend('skia')}
        onUseCanvas2DRenderer={() => setRendererBackend('canvas2d')}
        onUseBalancedLod={() => setCanvasLodPreset('balanced')}
        onUsePerformanceLod={() => setCanvasLodPreset('performance')}
        onUseImageHeavyLod={() => setCanvasLodPreset('imageHeavy')}
        onDispatch={dispatch}
      />

      <PlaygroundStage
        rendererBackend={rendererBackend}
        canvasLodConfig={CANVAS_LOD_PRESETS[canvasLodPreset]}
        document={runtime.document}
        shapes={runtime.shapes}
        stats={runtime.stats}
        viewport={runtime.viewport}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerLeave={runtime.clearHover}
        onViewportPan={runtime.panViewport}
        onViewportResize={runtime.resizeViewport}
        onViewportZoom={runtime.zoomViewport}
      />
    </main>
  )
}

const PlaygroundSidebar = React.memo(function PlaygroundSidebar({
  documentMode,
  rendererBackend,
  canvasLodPreset,
  document,
  stats,
  history,
  viewport,
  ready,
  sabSupported,
  scaleLabel,
  selectedLabel,
  selectedShape,
  selectedNode,
  typeSummary,
  onLoadDemo,
  onLoadMediumStress,
  onLoadLargeStress,
  onLoadStress,
  onLoadExtremeStress,
  onLoadImageHeavy,
  onLoadImageHeavyLarge,
  onUseSkiaRenderer,
  onUseCanvas2DRenderer,
  onUseBalancedLod,
  onUsePerformanceLod,
  onUseImageHeavyLod,
  onDispatch,
}: {
  documentMode: 'demo' | 'medium-stress' | 'large-stress' | 'stress' | 'extreme-stress' | 'image-heavy' | 'image-heavy-large'
  rendererBackend: 'skia' | 'canvas2d'
  canvasLodPreset: 'balanced' | 'performance' | 'imageHeavy'
  document: EditorDocument
  stats: SceneStats
  history: HistorySummary
  viewport: CanvasViewportState
  ready: boolean
  sabSupported: boolean
  scaleLabel: string
  selectedLabel: string
  selectedShape: SceneShapeSnapshot | null
  selectedNode: EditorDocument['shapes'][number] | null
  typeSummary: Array<{type: string; count: number}>
  onLoadDemo: () => void
  onLoadMediumStress: () => void
  onLoadLargeStress: () => void
  onLoadStress: () => void
  onLoadExtremeStress: () => void
  onLoadImageHeavy: () => void
  onLoadImageHeavyLarge: () => void
  onUseSkiaRenderer: () => void
  onUseCanvas2DRenderer: () => void
  onUseBalancedLod: () => void
  onUsePerformanceLod: () => void
  onUseImageHeavyLod: () => void
  onDispatch: (command: EditorRuntimeCommand) => void
}) {
  return (
    <aside className="playground-panel">
      <RuntimeIntroBlock rendererBackend={rendererBackend} documentMode={documentMode} />
      <LodBlock
        rendererBackend={rendererBackend}
        canvasLodPreset={canvasLodPreset}
        onUseBalancedLod={onUseBalancedLod}
        onUsePerformanceLod={onUsePerformanceLod}
        onUseImageHeavyLod={onUseImageHeavyLod}
      />
      <DocumentBlock
        documentMode={documentMode}
        documentName={document.name}
        documentWidth={document.width}
        documentHeight={document.height}
        documentShapeCount={document.shapes.length}
        snapshotShapeCount={stats.shapeCount}
        version={stats.version}
        typeSummary={typeSummary}
      />
      <CommandsBlock
        onLoadDemo={onLoadDemo}
        onLoadMediumStress={onLoadMediumStress}
        onLoadLargeStress={onLoadLargeStress}
        onLoadStress={onLoadStress}
        onLoadExtremeStress={onLoadExtremeStress}
        onLoadImageHeavy={onLoadImageHeavy}
        onLoadImageHeavyLarge={onLoadImageHeavyLarge}
        onUseSkiaRenderer={onUseSkiaRenderer}
        onUseCanvas2DRenderer={onUseCanvas2DRenderer}
        onDispatch={onDispatch}
      />
      <ViewportBlock
        ready={ready}
        sabSupported={sabSupported}
        scaleLabel={scaleLabel}
        selectedLabel={selectedLabel}
        viewport={viewport}
      />
      <SelectionBlock selectedShape={selectedShape} selectedNode={selectedNode} />
      <HistoryBlock history={history} />

      <RendererDiagnosticsPanel rendererBackend={rendererBackend} />
    </aside>
  )
})

const RuntimeIntroBlock = React.memo(function RuntimeIntroBlock({
  rendererBackend,
  documentMode,
}: {
  rendererBackend: 'skia' | 'canvas2d'
  documentMode: 'demo' | 'medium-stress' | 'large-stress' | 'stress' | 'extreme-stress' | 'image-heavy' | 'image-heavy-large'
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Runtime</span>
      <strong className="panel-title">
        Worker + SAB + {rendererBackend === 'skia' ? 'Skia' : 'Canvas2D'}
      </strong>
      <p className="panel-copy">
        Validate the shared runtime loop without product UI.
      </p>
      <div className="panel-badges">
        <span className="panel-badge">{documentMode}</span>
        <span className="panel-badge">{rendererBackend}</span>
      </div>
    </div>
  )
})

const LodBlock = React.memo(function LodBlock({
  rendererBackend,
  canvasLodPreset,
  onUseBalancedLod,
  onUsePerformanceLod,
  onUseImageHeavyLod,
}: {
  rendererBackend: 'skia' | 'canvas2d'
  canvasLodPreset: 'balanced' | 'performance' | 'imageHeavy'
  onUseBalancedLod: () => void
  onUsePerformanceLod: () => void
  onUseImageHeavyLod: () => void
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">LOD</span>
      <div className="panel-row">
        <span>active</span>
        <strong>{rendererBackend === 'canvas2d' ? canvasLodPreset : 'skia-default'}</strong>
      </div>
      <div className="panel-actions">
        <button onClick={onUseBalancedLod}>Balanced</button>
        <button onClick={onUsePerformanceLod}>Performance</button>
        <button onClick={onUseImageHeavyLod}>Image Heavy</button>
      </div>
    </div>
  )
})

const DocumentBlock = React.memo(function DocumentBlock({
  documentMode,
  documentName,
  documentWidth,
  documentHeight,
  documentShapeCount,
  snapshotShapeCount,
  version,
  typeSummary,
}: {
  documentMode: string
  documentName: string
  documentWidth: number
  documentHeight: number
  documentShapeCount: number
  snapshotShapeCount: number
  version: number
  typeSummary: Array<{type: string; count: number}>
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Document</span>
      <strong>{documentName}</strong>
      <div className="panel-stat-grid">
        <div className="panel-stat-card">
          <span>mode</span>
          <strong>{documentMode}</strong>
        </div>
        <div className="panel-stat-card">
          <span>size</span>
          <strong>{formatMetric(documentWidth)} x {formatMetric(documentHeight)}</strong>
        </div>
        <div className="panel-stat-card">
          <span>nodes</span>
          <strong>{documentShapeCount}</strong>
        </div>
        <div className="panel-stat-card">
          <span>snapshot</span>
          <strong>{snapshotShapeCount}</strong>
        </div>
      </div>
      <div className="panel-row">
        <span>version</span>
        <strong>{version}</strong>
      </div>
      <div className="panel-type-list">
        {typeSummary.map((item) => (
          <div key={item.type} className="panel-type-chip">
            <span>{item.type}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  )
})

const ViewportBlock = React.memo(function ViewportBlock({
  ready,
  sabSupported,
  scaleLabel,
  selectedLabel,
  viewport,
}: {
  ready: boolean
  sabSupported: boolean
  scaleLabel: string
  selectedLabel: string
  viewport: CanvasViewportState
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Viewport</span>
      <div className="panel-stat-grid">
        <div className="panel-stat-card">
          <span>ready</span>
          <strong>{String(ready)}</strong>
        </div>
        <div className="panel-stat-card">
          <span>SAB</span>
          <strong>{String(sabSupported)}</strong>
        </div>
        <div className="panel-stat-card">
          <span>scale</span>
          <strong>{scaleLabel}</strong>
        </div>
        <div className="panel-stat-card">
          <span>viewport</span>
          <strong>{formatMetric(viewport.viewportWidth)} x {formatMetric(viewport.viewportHeight)}</strong>
        </div>
      </div>
      <div className="panel-list-rows">
        <div className="panel-row">
          <span>translate</span>
          <strong>{formatMetric(viewport.matrix[2])}, {formatMetric(viewport.matrix[5])}</strong>
        </div>
        <div className="panel-row">
          <span>selected</span>
          <strong>{selectedLabel}</strong>
        </div>
      </div>
    </div>
  )
})

const SelectionBlock = React.memo(function SelectionBlock({
  selectedShape,
  selectedNode,
}: {
  selectedShape: SceneShapeSnapshot | null
  selectedNode: EditorDocument['shapes'][number] | null
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Selection</span>
      {!selectedShape || !selectedNode ? (
        <p className="panel-copy">No active selection.</p>
      ) : (
        <>
          <strong>{selectedNode.name}</strong>
          <div className="panel-stat-grid">
            <div className="panel-stat-card">
              <span>type</span>
              <strong>{selectedNode.type}</strong>
            </div>
            <div className="panel-stat-card">
              <span>flags</span>
              <strong>{selectedShape.isSelected ? 'selected' : 'idle'}</strong>
            </div>
            <div className="panel-stat-card">
              <span>origin</span>
              <strong>{formatMetric(selectedNode.x)}, {formatMetric(selectedNode.y)}</strong>
            </div>
            <div className="panel-stat-card">
              <span>size</span>
              <strong>{formatMetric(selectedNode.width)} x {formatMetric(selectedNode.height)}</strong>
            </div>
          </div>
          <div className="panel-list-rows">
            <div className="panel-row">
              <span>id</span>
              <strong>{selectedNode.id}</strong>
            </div>
            {selectedNode.text && (
              <div className="panel-row">
                <span>text</span>
                <strong>{selectedNode.text}</strong>
              </div>
            )}
            {selectedNode.assetUrl && (
              <div className="panel-row">
                <span>asset</span>
                <strong>embedded image</strong>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
})

const CommandsBlock = React.memo(function CommandsBlock({
  onLoadDemo,
  onLoadMediumStress,
  onLoadLargeStress,
  onLoadStress,
  onLoadExtremeStress,
  onLoadImageHeavy,
  onLoadImageHeavyLarge,
  onUseSkiaRenderer,
  onUseCanvas2DRenderer,
  onDispatch,
}: {
  onLoadDemo: () => void
  onLoadMediumStress: () => void
  onLoadLargeStress: () => void
  onLoadStress: () => void
  onLoadExtremeStress: () => void
  onLoadImageHeavy: () => void
  onLoadImageHeavyLarge: () => void
  onUseSkiaRenderer: () => void
  onUseCanvas2DRenderer: () => void
  onDispatch: (command: EditorRuntimeCommand) => void
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Commands</span>
      <div className="panel-actions">
        <button onClick={onLoadDemo}>Demo Scene</button>
        <button onClick={onLoadMediumStress}>10k Scene</button>
        <button onClick={onLoadLargeStress}>50k Scene</button>
        <button onClick={onLoadStress}>100k Scene</button>
        <button onClick={onLoadExtremeStress}>1000k Scene</button>
        <button onClick={onLoadImageHeavy}>10k Img+</button>
        <button onClick={onLoadImageHeavyLarge}>50k Img+</button>
        <button onClick={onUseSkiaRenderer}>Use Skia</button>
        <button onClick={onUseCanvas2DRenderer}>Use Canvas2D</button>
        <button onClick={() => onDispatch({type: 'viewport.fit'})}>Fit</button>
        <button onClick={() => onDispatch({type: 'viewport.zoomIn'})}>Zoom In</button>
        <button onClick={() => onDispatch({type: 'viewport.zoomOut'})}>Zoom Out</button>
        <button onClick={() => onDispatch({type: 'shape.insert', shape: createRandomMockShape()})}>
          Insert Mock
        </button>
        <button onClick={() => onDispatch({type: 'history.undo'})}>Undo</button>
        <button onClick={() => onDispatch({type: 'history.redo'})}>Redo</button>
        <button onClick={() => onDispatch({type: 'selection.delete'})}>Delete Selected</button>
      </div>
    </div>
  )
})

const HistoryBlock = React.memo(function HistoryBlock({
  history,
}: {
  history: HistorySummary
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">History</span>
      <ul className="panel-list">
        <li>entries: {history.entries.length}</li>
        <li>cursor: {history.cursor}</li>
        <li>canUndo: {String(history.canUndo)}</li>
        <li>canRedo: {String(history.canRedo)}</li>
      </ul>
    </div>
  )
})

const PlaygroundStage = React.memo(function PlaygroundStage({
  rendererBackend,
  canvasLodConfig,
  document,
  shapes,
  stats,
  viewport,
  onPointerMove,
  onPointerDown,
  onPointerLeave,
  onViewportPan,
  onViewportResize,
  onViewportZoom,
}: {
  rendererBackend: 'skia' | 'canvas2d'
  canvasLodConfig: Canvas2DLodConfig
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  onPointerMove: (pointer: { x: number; y: number }) => void
  onPointerDown: (pointer: { x: number; y: number }) => void
  onPointerLeave: VoidFunction
  onViewportPan: (deltaX: number, deltaY: number) => void
  onViewportResize: (width: number, height: number) => void
  onViewportZoom: (nextScale: number, anchor?: { x: number; y: number }) => void
}) {
  const renderer = React.useMemo(() => {
    if (rendererBackend === 'skia') {
      return SkiaRenderer as CanvasRenderer
    }

    const Canvas2DWithLod: CanvasRenderer = (props) => (
      <Canvas2DRenderer {...props} lodConfig={canvasLodConfig} />
    )

    return Canvas2DWithLod
  }, [canvasLodConfig, rendererBackend])

  return (
    <section className="playground-stage">
      <CanvasViewport
        document={document}
        renderer={renderer}
        shapes={shapes}
        stats={stats}
        viewport={viewport}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerLeave={onPointerLeave}
        onViewportPan={onViewportPan}
        onViewportResize={onViewportResize}
        onViewportZoom={onViewportZoom}
      />
    </section>
  )
})

function RendererDiagnosticsPanel({
  rendererBackend,
}: {
  rendererBackend: 'skia' | 'canvas2d'
}) {
  const renderDiagnostics = useSkiaRenderDiagnostics()
  const canvas2dDiagnostics = useCanvas2DRenderDiagnostics()

  if (rendererBackend === 'canvas2d') {
    return (
      <div className="panel-block">
        <span className="panel-label">Renderer Cache</span>
      <div className="panel-stat-grid">
        <div className="panel-stat-card">
          <span>backend</span>
          <strong>canvas2d</strong>
        </div>
        <div className="panel-stat-card">
          <span>draws</span>
          <strong>{canvas2dDiagnostics.drawCount}</strong>
        </div>
        <div className="panel-stat-card">
          <span>visible</span>
          <strong>{canvas2dDiagnostics.visibleShapeCount}</strong>
        </div>
          <div className="panel-stat-card">
            <span>draw</span>
            <strong>{canvas2dDiagnostics.drawMs.toFixed(1)}ms</strong>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="panel-block">
      <span className="panel-label">Renderer Cache</span>
      <div className="panel-stat-grid">
        <div className="panel-stat-card">
          <span>backend</span>
          <strong>skia</strong>
        </div>
        <div className="panel-stat-card">
          <span>tiles</span>
          <strong>{renderDiagnostics.tileCount}</strong>
        </div>
        <div className="panel-stat-card">
          <span>visible</span>
          <strong>{renderDiagnostics.visibleShapeCount}</strong>
        </div>
        <div className="panel-stat-card">
          <span>static</span>
          <strong>{renderDiagnostics.staticShapeCount}</strong>
        </div>
        <div className="panel-stat-card">
          <span>overlay</span>
          <strong>{renderDiagnostics.overlayShapeCount}</strong>
        </div>
        <div className="panel-stat-card">
          <span>rebuilt</span>
          <strong>{renderDiagnostics.rebuiltTiles}</strong>
        </div>
      </div>
      <div className="panel-list-rows">
        <div className="panel-row">
          <span>cache</span>
          <strong>{renderDiagnostics.cacheHits} hit / {renderDiagnostics.cacheMisses} miss</strong>
        </div>
        <div className="panel-row">
          <span>draw</span>
          <strong>{renderDiagnostics.drawMs.toFixed(1)}ms</strong>
        </div>
        <div className="panel-row">
          <span>record</span>
          <strong>{renderDiagnostics.recordMs.toFixed(1)}ms</strong>
        </div>
      </div>
    </div>
  )
}

export default App
