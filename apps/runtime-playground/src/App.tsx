import * as React from 'react'
import {CanvasViewport, useCanvasRuntime} from '@venus/canvas-base'
import {nid} from '@venus/document-core'
import {SkiaRenderer, useSkiaRenderDiagnostics} from '@venus/renderer-skia'
import type {EditorRuntimeCommand} from '@venus/editor-worker'
import {MOCK_DOCUMENT} from './mockDocument.ts'
import {createStressDocument} from './sceneGenerator.ts'
import './index.css'

const STRESS_SHAPE_COUNT = 100_000

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
  const [documentMode, setDocumentMode] = React.useState<'demo' | 'stress'>('demo')
  const [stressRevision, setStressRevision] = React.useState(0)
  const stressDocument = React.useMemo(
    () => createStressDocument(STRESS_SHAPE_COUNT),
    [stressRevision],
  )
  const activeDocument = documentMode === 'stress' ? stressDocument : MOCK_DOCUMENT
  const runtime = useCanvasRuntime({
    capacity: activeDocument.shapes.length + 16,
    createWorker: () => new Worker(new URL('./editor.worker.ts', import.meta.url), {type: 'module'}),
    document: activeDocument,
  })

  const selectedShape = runtime.stats.selectedIndex >= 0
    ? runtime.shapes[runtime.stats.selectedIndex] ?? null
    : null

  const dispatch = React.useCallback((command: EditorRuntimeCommand) => {
    runtime.dispatchCommand(command)
  }, [runtime])

  const selectedLabel = selectedShape ? `${selectedShape.name} (${selectedShape.type})` : 'None'

  return (
    <main className="playground-shell">
      <aside className="playground-panel">
        <div className="panel-block">
          <span className="panel-label">Runtime</span>
          <strong className="panel-title">Worker + SAB + Skia</strong>
          <p className="panel-copy">
            Validate the shared runtime loop without product UI.
          </p>
        </div>

        <div className="panel-block">
          <span className="panel-label">Document</span>
          <ul className="panel-list">
            <li>{runtime.document.name}</li>
            <li>{runtime.document.shapes.length} nodes</li>
            <li>{runtime.stats.shapeCount} snapshot shapes</li>
            <li>version {runtime.stats.version}</li>
          </ul>
        </div>

        <div className="panel-block">
          <span className="panel-label">Viewport</span>
          <ul className="panel-list">
            <li>ready: {String(runtime.ready)}</li>
            <li>SAB: {String(runtime.sabSupported)}</li>
            <li>scale: {runtime.viewport.scale.toFixed(2)}</li>
            <li>selected: {selectedLabel}</li>
          </ul>
        </div>

        <div className="panel-block">
          <span className="panel-label">Commands</span>
          <div className="panel-actions">
            <button onClick={() => setDocumentMode('demo')}>Demo Scene</button>
            <button
              onClick={() => {
                setStressRevision((current) => current + 1)
                setDocumentMode('stress')
              }}
            >
              100k Scene
            </button>
            <button onClick={() => dispatch({type: 'viewport.fit'})}>Fit</button>
            <button onClick={() => dispatch({type: 'viewport.zoomIn'})}>Zoom In</button>
            <button onClick={() => dispatch({type: 'viewport.zoomOut'})}>Zoom Out</button>
            <button onClick={() => dispatch({type: 'shape.insert', shape: createRandomRectangle()})}>
              Insert Rect
            </button>
            <button onClick={() => dispatch({type: 'history.undo'})}>Undo</button>
            <button onClick={() => dispatch({type: 'history.redo'})}>Redo</button>
            <button onClick={() => dispatch({type: 'selection.delete'})}>Delete Selected</button>
          </div>
        </div>

        <div className="panel-block">
          <span className="panel-label">History</span>
          <ul className="panel-list">
            <li>entries: {runtime.history.entries.length}</li>
            <li>cursor: {runtime.history.cursor}</li>
            <li>canUndo: {String(runtime.history.canUndo)}</li>
            <li>canRedo: {String(runtime.history.canRedo)}</li>
          </ul>
        </div>

        <RendererDiagnosticsPanel />
      </aside>

      <section className="playground-stage">
        <CanvasViewport
          document={runtime.document}
          renderer={SkiaRenderer}
          shapes={runtime.shapes}
          stats={runtime.stats}
          viewport={runtime.viewport}
          onPointerMove={(pointer) => runtime.postPointer('pointermove', pointer)}
          onPointerDown={(pointer) => runtime.postPointer('pointerdown', pointer)}
          onPointerLeave={runtime.clearHover}
          onViewportPan={runtime.panViewport}
          onViewportResize={runtime.resizeViewport}
          onViewportZoom={runtime.zoomViewport}
        />
      </section>
    </main>
  )
}

function RendererDiagnosticsPanel() {
  const renderDiagnostics = useSkiaRenderDiagnostics()

  return (
    <div className="panel-block">
      <span className="panel-label">Renderer Cache</span>
      <ul className="panel-list">
        <li>tiles: {renderDiagnostics.tileCount}</li>
        <li>visible: {renderDiagnostics.visibleShapeCount}</li>
        <li>static: {renderDiagnostics.staticShapeCount}</li>
        <li>overlay: {renderDiagnostics.overlayShapeCount}</li>
        <li>cacheHits: {renderDiagnostics.cacheHits}</li>
        <li>cacheMisses: {renderDiagnostics.cacheMisses}</li>
        <li>rebuilt: {renderDiagnostics.rebuiltTiles}</li>
      </ul>
    </div>
  )
}

export default App
