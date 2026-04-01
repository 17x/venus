import { SkiaRenderer } from '@venus/renderer-skia'
import { useState } from 'react'
import Header from './components/header/Header.tsx'
import { EditorSidebar } from './components/rightSidebar/EditorSidebar.tsx'
import { StatusBar } from './components/statusBar/StatusBar.tsx'
import Toolbar from './components/toolbar/Toolbar.tsx'
import { EditorFrame } from './editor/EditorFrame.tsx'
import { useEditorRuntime } from './hooks/useEditorRuntime.ts'

function App() {
  const runtime = useEditorRuntime()
  const [worldPoint, setWorldPoint] = useState({ x: 0, y: 0 })
  const insertRectangle = () =>
    runtime.dispatchCommand({
      type: 'shape.insert',
      shape: {
        id: `shape-${runtime.stats.shapeCount + 1}-${Date.now()}`,
        type: 'rectangle',
        name: `rectangle ${runtime.stats.shapeCount + 1}`,
        x: 120 + (runtime.stats.shapeCount % 6) * 24,
        y: 120 + (runtime.stats.shapeCount % 6) * 24,
        width: Math.max(96, Math.round(runtime.document.width * 0.2)),
        height: Math.max(96, Math.round(runtime.document.height * 0.12)),
      },
    })

  return (
    <EditorFrame
      bottomBar={
        <StatusBar
          onCommand={runtime.dispatchCommand}
          onViewportFit={runtime.fitViewport}
          onViewportZoom={(nextScale) => runtime.zoomViewport(nextScale)}
          scale={runtime.viewport.scale}
          worldPoint={worldPoint}
        />
      }
      collaboration={runtime.collaboration}
      document={runtime.document}
      header={
        <Header
          canRedo={runtime.history.canRedo}
          canUndo={runtime.history.canUndo}
          documentName={runtime.document.name}
          hasSelection={runtime.stats.selectedIndex >= 0}
          onCommand={runtime.dispatchCommand}
          onInsertRectangle={insertRectangle}
        />
      }
      history={runtime.history}
      leftRail={({ activeTool, onCommand }) => (
        <Toolbar activeTool={activeTool} onCommand={onCommand} />
      )}
      onCommand={runtime.dispatchCommand}
      renderer={SkiaRenderer}
      rightSidebar={
        <EditorSidebar
          collaboration={runtime.collaboration}
          document={runtime.document}
          history={runtime.history}
          onCommand={runtime.dispatchCommand}
          runtimeReady={runtime.ready}
          sabSupported={runtime.sabSupported}
          shapes={runtime.shapes}
          stats={runtime.stats}
        />
      }
      shapes={runtime.shapes}
      stats={runtime.stats}
      viewport={runtime.viewport}
      runtimeReady={runtime.ready}
      sabSupported={runtime.sabSupported}
      onPointerMove={(pointer) => {
        setWorldPoint(pointer)
        runtime.postPointer('pointermove', pointer)
      }}
      onPointerDown={(pointer) => {
        setWorldPoint(pointer)
        runtime.postPointer('pointerdown', pointer)
      }}
      onPointerLeave={runtime.clearHover}
      onViewportFit={runtime.fitViewport}
      onViewportPan={runtime.panViewport}
      onViewportResize={runtime.resizeViewport}
      onViewportZoom={runtime.zoomViewport}
    />
  )
}

export default App
