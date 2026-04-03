import * as React from 'react'
import {CanvasViewport, useCanvasRuntime} from '@venus/canvas-base'
import {nid} from '@venus/document-core'
import {SkiaRenderer, useSkiaRenderDiagnostics} from '@venus/renderer-skia'
import {Canvas2DRenderer, useCanvas2DRenderDiagnostics} from '@venus/renderer-canvas'
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

function createRandomRectangle() {
  return {
    id: nid(),
    type: 'rectangle' as const,
    name: `Rect ${Math.floor(Math.random() * 100)}`,
    x: 80 + Math.round(Math.random() * 720),
    y: 80 + Math.round(Math.random() * 420),
    width: 120 + Math.round(Math.random() * 80),
    height: 90 + Math.round(Math.random() * 60),
  }
}

function App() {
  const [documentMode, setDocumentMode] = React.useState<'demo' | 'medium-stress' | 'large-stress' | 'stress' | 'extreme-stress'>('demo')
  const [rendererBackend, setRendererBackend] = React.useState<'skia' | 'canvas2d'>('skia')
  const [mediumStressRevision, setMediumStressRevision] = React.useState(0)
  const [largeStressRevision, setLargeStressRevision] = React.useState(0)
  const [stressRevision, setStressRevision] = React.useState(0)
  const [extremeStressRevision, setExtremeStressRevision] = React.useState(0)
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
  const activeDocument =
    documentMode === 'extreme-stress'
      ? extremeStressDocument
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
  const handlePointerMove = React.useCallback((pointer: { x: number; y: number }) => {
    runtime.postPointer('pointermove', pointer)
  }, [runtime.postPointer])
  const handlePointerDown = React.useCallback((pointer: { x: number; y: number }) => {
    runtime.postPointer('pointerdown', pointer)
  }, [runtime.postPointer])

  const selectedLabel = selectedShape ? `${selectedShape.name} (${selectedShape.type})` : 'None'

  return (
    <main className="playground-shell">
      <PlaygroundSidebar
        rendererBackend={rendererBackend}
        document={runtime.document}
        stats={runtime.stats}
        history={runtime.history}
        ready={runtime.ready}
        sabSupported={runtime.sabSupported}
        scaleLabel={runtime.viewport.scale.toFixed(2)}
        selectedLabel={selectedLabel}
        onLoadDemo={handleLoadDemo}
        onLoadMediumStress={handleLoadMediumStress}
        onLoadLargeStress={handleLoadLargeStress}
        onLoadStress={handleLoadStress}
        onLoadExtremeStress={handleLoadExtremeStress}
        onUseSkiaRenderer={() => setRendererBackend('skia')}
        onUseCanvas2DRenderer={() => setRendererBackend('canvas2d')}
        onDispatch={dispatch}
      />

      <PlaygroundStage
        rendererBackend={rendererBackend}
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
  rendererBackend,
  document,
  stats,
  history,
  ready,
  sabSupported,
  scaleLabel,
  selectedLabel,
  onLoadDemo,
  onLoadMediumStress,
  onLoadLargeStress,
  onLoadStress,
  onLoadExtremeStress,
  onUseSkiaRenderer,
  onUseCanvas2DRenderer,
  onDispatch,
}: {
  rendererBackend: 'skia' | 'canvas2d'
  document: EditorDocument
  stats: SceneStats
  history: HistorySummary
  ready: boolean
  sabSupported: boolean
  scaleLabel: string
  selectedLabel: string
  onLoadDemo: () => void
  onLoadMediumStress: () => void
  onLoadLargeStress: () => void
  onLoadStress: () => void
  onLoadExtremeStress: () => void
  onUseSkiaRenderer: () => void
  onUseCanvas2DRenderer: () => void
  onDispatch: (command: EditorRuntimeCommand) => void
}) {
  return (
    <aside className="playground-panel">
      <RuntimeIntroBlock rendererBackend={rendererBackend} />
      <DocumentBlock
        documentName={document.name}
        documentShapeCount={document.shapes.length}
        snapshotShapeCount={stats.shapeCount}
        version={stats.version}
      />
      <ViewportBlock
        ready={ready}
        sabSupported={sabSupported}
        scaleLabel={scaleLabel}
        selectedLabel={selectedLabel}
      />
      <CommandsBlock
        onLoadDemo={onLoadDemo}
        onLoadMediumStress={onLoadMediumStress}
        onLoadLargeStress={onLoadLargeStress}
        onLoadStress={onLoadStress}
        onLoadExtremeStress={onLoadExtremeStress}
        onUseSkiaRenderer={onUseSkiaRenderer}
        onUseCanvas2DRenderer={onUseCanvas2DRenderer}
        onDispatch={onDispatch}
      />
      <HistoryBlock history={history} />

      <RendererDiagnosticsPanel rendererBackend={rendererBackend} />
    </aside>
  )
})

const RuntimeIntroBlock = React.memo(function RuntimeIntroBlock({
  rendererBackend,
}: {
  rendererBackend: 'skia' | 'canvas2d'
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
    </div>
  )
})

const DocumentBlock = React.memo(function DocumentBlock({
  documentName,
  documentShapeCount,
  snapshotShapeCount,
  version,
}: {
  documentName: string
  documentShapeCount: number
  snapshotShapeCount: number
  version: number
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Document</span>
      <ul className="panel-list">
        <li>{documentName}</li>
        <li>{documentShapeCount} nodes</li>
        <li>{snapshotShapeCount} snapshot shapes</li>
        <li>version {version}</li>
      </ul>
    </div>
  )
})

const ViewportBlock = React.memo(function ViewportBlock({
  ready,
  sabSupported,
  scaleLabel,
  selectedLabel,
}: {
  ready: boolean
  sabSupported: boolean
  scaleLabel: string
  selectedLabel: string
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Viewport</span>
      <ul className="panel-list">
        <li>ready: {String(ready)}</li>
        <li>SAB: {String(sabSupported)}</li>
        <li>scale: {scaleLabel}</li>
        <li>selected: {selectedLabel}</li>
      </ul>
    </div>
  )
})

const CommandsBlock = React.memo(function CommandsBlock({
  onLoadDemo,
  onLoadMediumStress,
  onLoadLargeStress,
  onLoadStress,
  onLoadExtremeStress,
  onUseSkiaRenderer,
  onUseCanvas2DRenderer,
  onDispatch,
}: {
  onLoadDemo: () => void
  onLoadMediumStress: () => void
  onLoadLargeStress: () => void
  onLoadStress: () => void
  onLoadExtremeStress: () => void
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
        <button onClick={onUseSkiaRenderer}>Use Skia</button>
        <button onClick={onUseCanvas2DRenderer}>Use Canvas2D</button>
        <button onClick={() => onDispatch({type: 'viewport.fit'})}>Fit</button>
        <button onClick={() => onDispatch({type: 'viewport.zoomIn'})}>Zoom In</button>
        <button onClick={() => onDispatch({type: 'viewport.zoomOut'})}>Zoom Out</button>
        <button onClick={() => onDispatch({type: 'shape.insert', shape: createRandomRectangle()})}>
          Insert Rect
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
  const renderer = (rendererBackend === 'skia' ? SkiaRenderer : Canvas2DRenderer) as CanvasRenderer

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
        <ul className="panel-list">
          <li>backend: canvas2d</li>
          <li>visible: {canvas2dDiagnostics.visibleShapeCount}</li>
          <li>drawMs: {canvas2dDiagnostics.drawMs.toFixed(1)}ms</li>
        </ul>
      </div>
    )
  }

  return (
    <div className="panel-block">
      <span className="panel-label">Renderer Cache</span>
      <ul className="panel-list">
        <li>backend: skia</li>
        <li>tiles: {renderDiagnostics.tileCount}</li>
        <li>visible: {renderDiagnostics.visibleShapeCount}</li>
        <li>static: {renderDiagnostics.staticShapeCount}</li>
        <li>overlay: {renderDiagnostics.overlayShapeCount}</li>
        <li>cacheHits: {renderDiagnostics.cacheHits}</li>
        <li>cacheMisses: {renderDiagnostics.cacheMisses}</li>
        <li>rebuilt: {renderDiagnostics.rebuiltTiles}</li>
        <li>drawMs: {renderDiagnostics.drawMs.toFixed(1)}ms</li>
        <li>recordMs: {renderDiagnostics.recordMs.toFixed(1)}ms</li>
      </ul>
    </div>
  )
}

export default App
