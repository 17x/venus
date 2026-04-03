import * as React from 'react'
import {CanvasViewport, useCanvasViewer} from '@venus/canvas-base'
import {Canvas2DRenderer} from '@venus/renderer-canvas'
import {createMockMindmapDocument} from './mockMindmap.ts'

function App() {
  const [sceneMode, setSceneMode] = React.useState<'product' | 'learning'>('product')
  const document = React.useMemo(
    () => createMockMindmapDocument(sceneMode),
    [sceneMode],
  )
  const viewer = useCanvasViewer({
    document,
    enableHitTest: true,
    selectOnPointerDown: true,
  })

  const hoveredShape = viewer.stats.hoveredIndex >= 0
    ? viewer.shapes[viewer.stats.hoveredIndex] ?? null
    : null
  const selectedShape = viewer.stats.selectedIndex >= 0
    ? viewer.shapes[viewer.stats.selectedIndex] ?? null
    : null

  return (
    <main className="mindmap-shell">
      <aside className="mindmap-sidebar">
        <section className="panel-block">
          <span className="panel-label">Mindmap Viewer</span>
          <h1 className="panel-title">Canvas-Base Viewer Runtime</h1>
          <p className="panel-copy">
            Read-only mode without worker/SAB, still keeping pan/zoom/hittest.
          </p>
        </section>

        <section className="panel-block">
          <span className="panel-label">Scenes</span>
          <div className="panel-actions">
            <button onClick={() => setSceneMode('product')}>Product</button>
            <button onClick={() => setSceneMode('learning')}>Learning</button>
            <button onClick={() => viewer.dispatchCommand({type: 'viewport.fit'})}>Fit</button>
            <button onClick={() => viewer.dispatchCommand({type: 'viewport.zoomIn'})}>Zoom In</button>
            <button onClick={() => viewer.dispatchCommand({type: 'viewport.zoomOut'})}>Zoom Out</button>
          </div>
        </section>

        <section className="panel-block">
          <span className="panel-label">Snapshot</span>
          <ul className="panel-list">
            <li>document: {viewer.document.name}</li>
            <li>shapeCount: {viewer.stats.shapeCount}</li>
            <li>scale: {viewer.viewport.scale.toFixed(2)}</li>
            <li>hovered: {hoveredShape?.name ?? 'None'}</li>
            <li>selected: {selectedShape?.name ?? 'None'}</li>
          </ul>
        </section>

        <section className="panel-block">
          <span className="panel-label">Notes</span>
          <ul className="panel-list">
            <li>Middle button or Alt + drag: pan</li>
            <li>Ctrl/Cmd + wheel: zoom</li>
            <li>Wheel: pan</li>
            <li>Click node: select</li>
          </ul>
        </section>
      </aside>

      <section className="mindmap-stage">
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
      </section>
    </main>
  )
}

export default App
