import * as React from 'react'
import {CanvasViewport, useCanvasViewer} from '@venus/canvas-base'
import {Canvas2DRenderer} from '@venus/renderer-canvas'
import {createMockMindmapDocument} from './mockMindmap.ts'

const sceneOptions = [
  {value: 'product', label: 'Product Map'},
  {value: 'learning', label: 'Learning Plan'},
] as const

const navigationCards = [
  {
    label: 'Runtime',
    title: 'Viewer shell',
    description: 'Canvas viewport, zoom and hit-test are already wired for quick iteration.',
  },
  {
    label: 'Next',
    title: 'Editing pipeline',
    description: 'The next milestone is replacing mock data with commands and worker-backed state.',
  },
] as const

const noteItems = [
  'Alt + drag or middle mouse button to pan the canvas',
  'Use Cmd/Ctrl + wheel to zoom in and out',
  'Click a topic node to inspect current selection',
] as const

function App() {
  const [sceneMode, setSceneMode] = React.useState<'product' | 'learning'>('product')
  const document = React.useMemo(
    () => createMockMindmapDocument(sceneMode),
    [sceneMode],
  )
  const viewer = useCanvasViewer({
    document,
    enableHitTest: true,
    hoverOnPointerMove: false,
    selectOnPointerDown: true,
  })
  const selectedShape = viewer.stats.selectedIndex >= 0
    ? viewer.shapes[viewer.stats.selectedIndex] ?? null
    : null
  const selectedCount = selectedShape ? 1 : 0

  return (
    <main className="mindmap-shell">
      <aside className="mindmap-sidebar">
        <section className="sidebar-hero panel-block">
          <span className="panel-label">Mindmap Editor</span>
          <h1 className="panel-title">Canvas runtime preview for the next editor shell</h1>
          <p className="panel-copy">
            A cleaner workspace for validating viewport behavior now, while leaving room
            for commands, history and file-format integration later.
          </p>
          <div className="hero-chips">
            <span className="status-chip">Viewer mode</span>
            <span className="status-chip status-chip-muted">Read-only runtime</span>
          </div>
        </section>

        <section className="panel-block">
          <div className="panel-heading">
            <span className="panel-label">Scenes</span>
            <span className="panel-meta">{viewer.document.name}</span>
          </div>
          <div className="scene-toggle" role="tablist" aria-label="Mindmap scene presets">
            {sceneOptions.map((scene) => (
              <button
                key={scene.value}
                type="button"
                className={sceneMode === scene.value ? 'is-active' : undefined}
                onClick={() => setSceneMode(scene.value)}
              >
                {scene.label}
              </button>
            ))}
          </div>
          <div className="panel-actions">
            <button type="button" onClick={() => viewer.dispatchCommand({type: 'viewport.fit'})}>
              Fit Canvas
            </button>
            <button type="button" onClick={() => viewer.dispatchCommand({type: 'viewport.zoomIn'})}>
              Zoom In
            </button>
            <button type="button" onClick={() => viewer.dispatchCommand({type: 'viewport.zoomOut'})}>
              Zoom Out
            </button>
          </div>
        </section>

        <section className="metrics-grid">
          <article className="metric-card">
            <span className="metric-label">Shapes</span>
            <strong>{viewer.stats.shapeCount}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">Scale</span>
            <strong>{viewer.viewport.scale.toFixed(2)}x</strong>
          </article>
          <article className="metric-card">
            <span className="metric-label">Selection</span>
            <strong>{selectedCount}</strong>
          </article>
        </section>

        <section className="panel-block panel-stack">
          <div className="panel-heading">
            <span className="panel-label">Workspace Notes</span>
            <span className="panel-meta">Current shell</span>
          </div>
          {navigationCards.map((card) => (
            <article key={card.title} className="info-card">
              <span className="info-card-label">{card.label}</span>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </article>
          ))}
        </section>

        <section className="panel-block">
          <div className="panel-heading">
            <span className="panel-label">Interaction</span>
            <span className="panel-meta">{selectedShape?.name ?? 'Click a topic node'}</span>
          </div>
          <ul className="panel-list">
            {noteItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </aside>

      <section className="mindmap-stage-shell">
        <header className="stage-header">
          <div>
            <span className="panel-label">Canvas Stage</span>
            <h2 className="stage-title">{viewer.document.name}</h2>
          </div>
          <div className="stage-summary">
            <div>
              <span>Selected</span>
              <strong>{selectedShape?.name ?? 'None'}</strong>
            </div>
            <div>
              <span>Pointer tracking</span>
              <strong>Selection only</strong>
            </div>
          </div>
        </header>

        <div className="mindmap-stage panel-surface">
          <CanvasViewport
            document={viewer.document}
            renderer={Canvas2DRenderer}
            shapes={viewer.shapes}
            stats={viewer.stats}
            viewport={viewer.viewport}
            onPointerMove={(pointer) => viewer.postPointer('pointermove', pointer)}
            onPointerDown={(pointer) => viewer.postPointer('pointerdown', pointer)}
            onPointerLeave={viewer.clearHover}
            onViewportPan={viewer.panViewport}
            onViewportResize={viewer.resizeViewport}
            onViewportZoom={viewer.zoomViewport}
          />
        </div>
      </section>
    </main>
  )
}

export default App
