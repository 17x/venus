import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  CanvasViewport,
  type CanvasRenderer,
  type CanvasViewportState,
} from '@venus/canvas-base'
import type { EditorDocument, ToolId } from '@venus/editor-core'
import type {
  CollaborationState,
  EditorRuntimeCommand,
  HistorySummary,
} from '@venus/editor-worker'
import type { PointerState, SceneShapeSnapshot, SceneStats } from '@venus/shared-memory'
import { TOOLS } from '../constants/tools.ts'

interface EditorFrameProps {
  bottomBar?: ReactNode
  collaboration: CollaborationState
  document: EditorDocument
  header?: ReactNode
  history: HistorySummary
  leftRail?: ReactNode | ((props: {
    activeTool: ToolId
    onCommand: (command: EditorRuntimeCommand) => void
  }) => ReactNode)
  menuBar?: ReactNode
  onCommand: (command: EditorRuntimeCommand) => void
  renderer?: CanvasRenderer
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
  runtimeReady: boolean
  sabSupported: boolean
  onPointerMove: (pointer: PointerState) => void
  onPointerDown: (pointer: PointerState) => void
  onPointerLeave: VoidFunction
  onViewportFit: VoidFunction
  onViewportPan: (deltaX: number, deltaY: number) => void
  onViewportResize: (width: number, height: number) => void
  onViewportZoom: (nextScale: number, anchor?: { x: number; y: number }) => void
  rightSidebar?: ReactNode
}

function createDraftShape(
  tool: ToolId,
  shapeCount: number,
  start: PointerState,
): SceneShapeSnapshot | null {
  if (tool === 'text') {
    return {
      id: `shape-${shapeCount + 1}-${Date.now()}`,
      type: 'text',
      name: `text ${shapeCount + 1}`,
      x: start.x,
      y: start.y,
      width: 180,
      height: 48,
      isHovered: false,
      isSelected: false,
    }
  }

  if (tool !== 'frame' && tool !== 'rectangle' && tool !== 'ellipse') {
    return null
  }

  return {
    id: `shape-${shapeCount + 1}-${Date.now()}`,
    type: tool,
    name: `${tool} ${shapeCount + 1}`,
    x: start.x,
    y: start.y,
    width: 1,
    height: 1,
    isHovered: false,
    isSelected: false,
  }
}

export function EditorFrame({
  bottomBar,
  collaboration,
  document,
  header,
  history,
  leftRail,
  menuBar,
  onCommand,
  renderer,
  shapes,
  stats,
  viewport,
  runtimeReady,
  sabSupported,
  onPointerMove,
  onPointerDown,
  onPointerLeave,
  onViewportFit,
  onViewportPan,
  onViewportResize,
  onViewportZoom,
  rightSidebar,
}: EditorFrameProps) {
  const [activeTool, setActiveTool] = useState<ToolId>('select')
  const [draftShape, setDraftShape] = useState<SceneShapeSnapshot | null>(null)
  const [draftOrigin, setDraftOrigin] = useState<PointerState | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarPinned, setSidebarPinned] = useState(false)

  const handleToolSelect = (tool: ToolId) => {
    setActiveTool(tool)
    onCommand({ type: 'tool.select', tool })
  }

  const zoomPercent = Math.round(viewport.scale * 100)
  const renderedLeftRail =
    typeof leftRail === 'function'
      ? leftRail({
          activeTool,
          onCommand: (command) => {
            if (command.type === 'tool.select') {
              setActiveTool(command.tool)
            }
            onCommand(command)
          },
        })
      : leftRail
  const visibleShapes = draftShape ? [...shapes, draftShape] : shapes

  const handleCanvasPointerDown = (pointer: PointerState) => {
    const nextDraft = createDraftShape(activeTool, stats.shapeCount, pointer)

    if (!nextDraft) {
      onPointerDown(pointer)
      return
    }

    if (activeTool === 'text') {
      onCommand({
        type: 'shape.insert',
        shape: {
          id: nextDraft.id,
          type: 'text',
          name: nextDraft.name,
          x: nextDraft.x,
          y: nextDraft.y,
          width: nextDraft.width,
          height: nextDraft.height,
        },
      })
      return
    }

    setDraftOrigin(pointer)
    setDraftShape(nextDraft)
  }

  const handleCanvasPointerMove = (pointer: PointerState) => {
    if (draftShape && draftOrigin) {
      const x = Math.min(draftOrigin.x, pointer.x)
      const y = Math.min(draftOrigin.y, pointer.y)
      const width = Math.max(1, Math.abs(pointer.x - draftOrigin.x))
      const height = Math.max(1, Math.abs(pointer.y - draftOrigin.y))

      setDraftShape({
        ...draftShape,
        x,
        y,
        width,
        height,
      })
      return
    }

    onPointerMove(pointer)
  }

  const handleCanvasPointerLeave = () => {
    if (draftShape) {
      return
    }

    onPointerLeave()
  }

  const handleCanvasPointerUp = () => {
    if (!draftShape) {
      return
    }

    onCommand({
      type: 'shape.insert',
      shape: {
        id: draftShape.id,
        type: draftShape.type,
        name: draftShape.name,
        x: draftShape.x,
        y: draftShape.y,
        width: draftShape.width,
        height: draftShape.height,
      },
    })

    setDraftShape(null)
    setDraftOrigin(null)
  }

  const sidebarContent = rightSidebar ?? (
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
          <li>Viewport scale: {zoomPercent}%</li>
        </ul>
      </section>

      <section className="panel-card">
        <p className="eyebrow">History</p>
        <ul className="info-list">
          <li>Entries: {history.entries.length}</li>
          <li>Cursor: {history.cursor}</li>
          <li>Undo available: {history.canUndo ? 'yes' : 'no'}</li>
          <li>Redo available: {history.canRedo ? 'yes' : 'no'}</li>
        </ul>
      </section>

      <section className="panel-card">
        <p className="eyebrow">Runtime</p>
        <ul className="info-list">
          <li>Cross-origin isolated: {sabSupported ? 'yes' : 'no'}</li>
          <li>Worker ready: {runtimeReady ? 'yes' : 'no'}</li>
          <li>Collab connected: {collaboration.connected ? 'yes' : 'no'}</li>
          <li>Local ops: {collaboration.pendingLocalCount}</li>
          <li>Remote ops: {collaboration.pendingRemoteCount}</li>
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
  )

  return (
    <div className="editor-shell">
      {renderedLeftRail ?? (
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
                onClick={() => handleToolSelect(tool.id)}
              >
                <span>{tool.label}</span>
                <kbd>{tool.shortcut}</kbd>
              </button>
            ))}
          </nav>
        </aside>
      )}

      <main className="workspace-shell">
        {header ?? (
          <>
            {menuBar}
            <header className="topbar">
              <div>
                <p className="eyebrow">Starter frame</p>
                <h2>{document.name}</h2>
              </div>

              <div className="topbar-actions">
                <button type="button" className="secondary-button">
                  Share
                </button>
                <button type="button" className="secondary-button">
                  Insert Rectangle
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={onViewportFit}
                >
                  Focus Canvas
                </button>
              </div>
            </header>
          </>
        )}

        <section
          className={
            sidebarPinned
              ? 'canvas-and-panels canvas-and-panels-pinned'
              : 'canvas-and-panels canvas-and-panels-overlay'
          }
        >
          <section className="canvas-panel">
            <div className="canvas-toolbar">
              <span>Tool: {activeTool}</span>
              <div className="canvas-toolbar-actions">
                <label className="zoom-control">
                  <span>Zoom</span>
                  <input
                    type="range"
                    min="10"
                    max="800"
                    step="5"
                    value={zoomPercent}
                    onChange={(event) =>
                      onViewportZoom(Number(event.target.value) / 100)
                    }
                  />
                  <strong>{zoomPercent}%</strong>
                </label>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onViewportFit}
                >
                  Fit
                </button>
              </div>
            </div>

            {rightSidebar ? (
              <div className="canvas-sidebar-controls">
                <button
                  type="button"
                  className="canvas-sidebar-toggle"
                  onClick={() => setSidebarOpen((value) => !value)}
                  aria-label={sidebarOpen ? 'Hide right sidebar' : 'Show right sidebar'}
                >
                  {sidebarOpen ? 'Panels' : 'Open'}
                </button>
                {sidebarOpen ? (
                  <button
                    type="button"
                    className={sidebarPinned ? 'canvas-sidebar-pin active' : 'canvas-sidebar-pin'}
                    onClick={() => setSidebarPinned((value) => !value)}
                    aria-label={sidebarPinned ? 'Unpin right sidebar' : 'Pin right sidebar'}
                  >
                    {sidebarPinned ? 'Unpin' : 'Pin'}
                  </button>
                ) : null}
              </div>
            ) : null}

            <CanvasViewport
              document={document}
              renderer={renderer}
              shapes={visibleShapes}
              viewport={viewport}
              onPointerMove={handleCanvasPointerMove}
              onPointerDown={handleCanvasPointerDown}
              onPointerLeave={handleCanvasPointerLeave}
              onPointerUp={handleCanvasPointerUp}
              onViewportPan={onViewportPan}
              onViewportResize={onViewportResize}
              onViewportZoom={onViewportZoom}
            />
            {bottomBar}
          </section>

          {rightSidebar ? (
            sidebarPinned ? (
              <div className="right-sidebar-docked">{sidebarContent}</div>
            ) : sidebarOpen ? (
              <>
                <button
                  type="button"
                  className="right-sidebar-backdrop"
                  aria-label="Close right sidebar"
                  onClick={() => setSidebarOpen(false)}
                />
                <div className="right-sidebar-overlay">{sidebarContent}</div>
              </>
            ) : null
          ) : (
            <div className="right-sidebar-docked">{sidebarContent}</div>
          )}
        </section>
      </main>
    </div>
  )
}
