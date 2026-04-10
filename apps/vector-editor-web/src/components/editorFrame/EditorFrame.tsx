import {type KeyboardEvent, type ReactNode, useRef, useState} from 'react'
import CreateFile from '../createFile/CreateFile.tsx'
import LanguageSwitcher from '../language/languageSwitcher.tsx'
import Header from '../header/Header.tsx'
import Toolbar from '../toolbar/Toolbar.tsx'
import {ContextMenu} from '../contextMenu/ContextMenu.tsx'
import PropPanel from '../propPanel/PropPanel.tsx'
import {LayerPanel} from '../layerPanel/LayerPanel.tsx'
import {HistoryPanel} from '../historyPanel/HistoryPanel.tsx'
import {StatusBar} from '../statusBar/StatusBar.tsx'
import {Print} from '../print/print.tsx'
import FileReceiver from '../fileReceiver.tsx'
import {cn, Col, Row, Tooltip} from '@venus/ui'
import useEditorRuntime from '../../hooks/useEditorRuntime.ts'
import {applyMatrixToPoint} from '@venus/runtime'
import {CanvasViewport} from '@venus/runtime-react'
import {LuHistory, LuLayers, LuSettings} from 'react-icons/lu'
import {
  CHROME_ICON_SIZE,
  CHROME_ICON_ITEM_ACTIVE_CLASS,
  CHROME_ICON_ITEM_CLASS,
  CHROME_RAIL_ITEM_CONTAINER_CLASS,
} from '../editorChrome/chromeIconStyles.ts'
import {EDITOR_ROOT_CLASS} from '../editorChrome/editorTypography.ts'

type InspectorPanelId = 'properties' | 'layers' | 'history'

const INSPECTOR_PANEL_META: Array<{
  id: InspectorPanelId
  label: string
  icon: ReactNode
}> = [
  {id: 'properties', label: 'Properties', icon: <LuSettings size={CHROME_ICON_SIZE}/>},
  {id: 'layers', label: 'Layer', icon: <LuLayers size={CHROME_ICON_SIZE}/>},
  {id: 'history', label: 'History', icon: <LuHistory size={CHROME_ICON_SIZE}/>},
]

const EditorFrame = () => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0})
  const [contextMenuPastePosition, setContextMenuPastePosition] = useState({x: 0, y: 0})
  // The frame owns inspector visibility so minimized panels can unmount while the restore rail keeps a stable order.
  const [minimizedInspectorPanels, setMinimizedInspectorPanels] = useState<Set<InspectorPanelId>>(() => new Set())
  const stageHostRef = useRef<HTMLDivElement>(null)
  const runtime = useEditorRuntime()

  const {
    documentState,
    runtimeState,
    uiState,
    commands,
    refs,
  } = runtime
  const {file, hasFile} = documentState
  const {canvas, currentTool, focused} = runtimeState
  const {
    copiedItems,
    hasUnsavedChanges,
    historyItems,
    historyStatus,
    layerItems,
    selectedIds,
    selectedProps,
    showCreateFile,
    showPrint,
    viewportScale,
  } = uiState
  const {
    setShowPrint,
    executeAction,
    saveFile,
    createFile,
    handleCreating,
    setCurrentTool,
    pickHistory,
  } = commands
  const {contextRootRef, worldPointRef, editorRef} = refs

  const resolveViewportPoint = (clientX: number, clientY: number) => {
    const rect = stageHostRef.current?.getBoundingClientRect()
    if (!rect) {
      return {x: clientX, y: clientY}
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const resolveWorldPoint = (viewportPoint: {x: number; y: number}) => {
    return applyMatrixToPoint(canvas.viewport.inverseMatrix, viewportPoint)
  }

  const minimizeInspectorPanel = (panelId: InspectorPanelId) => {
    setMinimizedInspectorPanels((current) => {
      const next = new Set(current)
      next.add(panelId)
      return next
    })
  }

  const toggleInspectorPanel = (panelId: InspectorPanelId) => {
    setMinimizedInspectorPanels((current) => {
      const next = new Set(current)
      if (next.has(panelId)) {
        next.delete(panelId)
      } else {
        next.add(panelId)
      }
      return next
    })
  }

  const isInspectorPanelMinimized = (panelId: InspectorPanelId) => minimizedInspectorPanels.has(panelId)
  const hasVisibleInspectorPanels = minimizedInspectorPanels.size < INSPECTOR_PANEL_META.length
  const handleInspectorPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>, panelId: InspectorPanelId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleInspectorPanel(panelId)
    }
  }

  return <div className={`w-full h-full flex flex-col select-none ${EDITOR_ROOT_CLASS}`}>
    <div className={'flex justify-end items-center border-b border-gray-200 bg-white'}>
      <LanguageSwitcher/>
    </div>

    <div className={'flex-1 overflow-hidden min-h-[600px] relative'}>
      {file && <>
        <Col fw fh stretch ref={contextRootRef} data-focused={focused} autoFocus={true}
             tabIndex={0}
             className={'outline-0 bg-white'}>
          <Header executeAction={executeAction}
                  saveFile={saveFile}
                  needSave={hasUnsavedChanges}
                  historyStatus={historyStatus}
                  selectedIds={selectedIds}/>

          <Row ovh fh>
            <Toolbar tool={currentTool} setTool={setCurrentTool}/>
            <FileReceiver executeAction={executeAction}
                          resolveDropPosition={resolveViewportPoint}>
              <Col
                fw
                fh
                ovh
                rela
                flex={1}
              >
                <div
                  ref={stageHostRef}
                  className={'relative overflow-hidden flex w-full h-full'}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setShowContextMenu(true)
                    const viewportPoint = resolveViewportPoint(event.clientX, event.clientY)
                    const worldPoint = resolveWorldPoint(viewportPoint)
                    setContextMenuPosition(viewportPoint)
                    setContextMenuPastePosition(worldPoint)
                    canvas.onContextMenu({
                      x: viewportPoint.x,
                      y: viewportPoint.y,
                    })
                  }}
                >
                  <CanvasViewport
                    document={canvas.document}
                    renderer={canvas.Renderer}
                    overlayRenderer={canvas.OverlayRenderer}
                    shapes={canvas.shapes}
                    stats={canvas.stats}
                    viewport={canvas.viewport}
                    onPointerMove={canvas.onPointerMove}
                    onPointerDown={canvas.onPointerDown}
                    onPointerUp={canvas.onPointerUp}
                    onPointerLeave={canvas.onPointerLeave}
                    onViewportChange={canvas.onViewportChange}
                    onViewportPan={canvas.onViewportPan}
                    onViewportResize={canvas.onViewportResize}
                    onViewportZoom={canvas.onViewportZoom}
                  />
                </div>

                <StatusBar executeAction={executeAction}
                           worldScale={viewportScale}
                           ref={worldPointRef}/>

                {showContextMenu &&
                  <ContextMenu position={contextMenuPosition}
                               pastePosition={contextMenuPastePosition}
                               executeAction={executeAction}
                               selectedIds={selectedIds}
                               copiedItems={copiedItems}
                               historyStatus={historyStatus}
                               onClose={() => {
                                 setShowContextMenu(false)
                               }}/>}
              </Col>
            </FileReceiver>

            <div className={'flex h-full shrink-0 border-l border-gray-200 bg-gray-50'}>
              {hasVisibleInspectorPanels &&
                <aside
                  className={'flex h-full w-64 flex-col gap-2 p-2'}
                  aria-label="Inspector panels"
                >
                  {!isInspectorPanelMinimized('properties') &&
                    <PropPanel
                      props={selectedProps!}
                      executeAction={executeAction}
                      onMinimize={() => minimizeInspectorPanel('properties')}
                    />}
                  {!isInspectorPanelMinimized('layers') &&
                    <LayerPanel
                      executeAction={executeAction}
                      layerItems={layerItems}
                      selectedIds={selectedIds}
                      onMinimize={() => minimizeInspectorPanel('layers')}
                    />}
                  {!isInspectorPanelMinimized('history') &&
                    <HistoryPanel
                      historyItems={historyItems}
                      historyStatus={historyStatus}
                      pickHistory={pickHistory}
                      onMinimize={() => minimizeInspectorPanel('history')}
                    />}
                </aside>}
              <aside
                className={'relative flex h-full w-10 flex-col items-center gap-2 border-l border-gray-200 bg-gray-50 py-2'}
                aria-label="Inspector panel shortcuts"
              >
                {INSPECTOR_PANEL_META.map((panel) => {
                  const isMinimized = isInspectorPanelMinimized(panel.id)
                  const isOpen = !isMinimized
                  return (
                    <Tooltip
                      key={panel.id}
                      placement={'l'}
                      title={`${isMinimized ? 'Show' : 'Hide'} ${panel.label}`}
                    >
                      <div className={CHROME_RAIL_ITEM_CONTAINER_CLASS}>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`${isMinimized ? 'Show' : 'Hide'} ${panel.label}`}
                          aria-pressed={isOpen}
                          className={cn(
                            CHROME_ICON_ITEM_CLASS,
                            'cursor-pointer',
                            isOpen && CHROME_ICON_ITEM_ACTIVE_CLASS,
                          )}
                          onClick={() => toggleInspectorPanel(panel.id)}
                          onKeyDown={(event) => handleInspectorPanelKeyDown(event, panel.id)}
                        >
                          {panel.icon}
                        </div>
                      </div>
                    </Tooltip>
                  )
                })}
              </aside>
            </div>
          </Row>
        </Col>
      </>}
    </div>

    {showPrint && <Print editorRef={editorRef} onClose={() => {
      setShowPrint(false)
    }}/>}

    {showCreateFile &&
      <CreateFile bg={hasFile ? '#00000080' : '#fff'}
                  createFile={createFile}
                  onBgClick={() => {
                    if (hasFile) {
                      handleCreating(false)
                    }
                  }}/>}

  </div>
}

export default EditorFrame
