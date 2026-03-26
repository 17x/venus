import { useState } from 'react'
import { SkiaStage } from '@venus/renderer-skia'
import { TOOLS, type EditorDocument, type ToolId } from '@venus/editor-core'
import type { PointerState, SceneShapeSnapshot, SceneStats } from '@venus/shared-memory'

interface EditorFrameProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  runtimeReady: boolean
  sabSupported: boolean
  onPointerMove: (pointer: PointerState) => void
  onPointerDown: (pointer: PointerState) => void
  onPointerLeave: VoidFunction
}

export function EditorFrame({
  document,
  shapes,
  stats,
  runtimeReady,
  sabSupported,
  onPointerMove,
  onPointerDown,
  onPointerLeave,
}: EditorFrameProps) {
  const [activeTool, setActiveTool] = useState<ToolId>('select')
  const [zoom, setZoom] = useState(100)

  return (
    <div className="editor-shell">
      <aside className="left-rail">
        <div className="brand-lockup">
          <span className="brand-mark">V</span>
          <div>
            <p className="eyebrow">Venus</p>
            <h1>Vector Editor</h1>
          </div>
        </div>

        <nav className="tool-list" aria-label="Primary tools">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={tool.id === activeTool ? 'tool-button active' : 'tool-button'}
              onClick={() => setActiveTool(tool.id)}
            >
              <span>{tool.label}</span>
              <kbd>{tool.shortcut}</kbd>
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Starter frame</p>
            <h2>{document.name}</h2>
          </div>

          <div className="topbar-actions">
            <button type="button" className="secondary-button">
              Share
            </button>
            <button type="button" className="primary-button">
              Export
            </button>
          </div>
        </header>

        <section className="canvas-and-panels">
          <section className="canvas-panel">
            <div className="canvas-toolbar">
              <span>Tool: {activeTool}</span>
              <label className="zoom-control">
                <span>Zoom</span>
                <input
                  type="range"
                  min="25"
                  max="200"
                  step="5"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
                <strong>{zoom}%</strong>
              </label>
            </div>

            <SkiaStage
              document={document}
              shapes={shapes}
              zoom={zoom}
              onPointerMove={onPointerMove}
              onPointerDown={onPointerDown}
              onPointerLeave={onPointerLeave}
            />
          </section>

          <aside className="right-panel">
            <section className="panel-card">
              <p className="eyebrow">Document</p>
              <h3>{document.name}</h3>
              <ul className="info-list">
                <li>Canvas: {document.width} x {document.height}</li>
                <li>Objects: {stats.shapeCount}</li>
                <li>Active tool: {activeTool}</li>
                <li>Selected index: {stats.selectedIndex}</li>
                <li>Hovered index: {stats.hoveredIndex}</li>
                <li>SAB version: {stats.version}</li>
              </ul>
            </section>

            <section className="panel-card">
              <p className="eyebrow">Runtime</p>
              <ul className="info-list">
                <li>Cross-origin isolated: {sabSupported ? 'yes' : 'no'}</li>
                <li>Worker ready: {runtimeReady ? 'yes' : 'no'}</li>
                <li>Hit test path: main thread to worker to SAB to stage</li>
              </ul>
            </section>

            <section className="panel-card">
              <p className="eyebrow">Next</p>
              <ul className="info-list">
                <li>Move geometry and style fields fully into shared memory</li>
                <li>Add OffscreenCanvas / WebGL or CanvasKit backend</li>
                <li>Attach history, FlatBuffers, and spatial index packages</li>
              </ul>
            </section>
          </aside>
        </section>
      </main>
    </div>
  )
}
