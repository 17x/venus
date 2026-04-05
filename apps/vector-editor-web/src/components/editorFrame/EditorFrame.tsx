import {useRef, useState} from 'react'
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
import {Col, Row} from '@lite-u/ui'
import useEditorRuntime from '../../hooks/useEditorRuntime.ts'
import {CanvasViewport} from '@venus/canvas-base'

const EditorFrame = () => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0})
  const [contextMenuPastePosition, setContextMenuPastePosition] = useState({x: 0, y: 0})
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
    const matrix = canvas.viewport.inverseMatrix
    return {
      x: matrix[0] * viewportPoint.x + matrix[1] * viewportPoint.y + matrix[2],
      y: matrix[3] * viewportPoint.x + matrix[4] * viewportPoint.y + matrix[5],
    }
  }

  return <div className={'w-full h-full flex flex-col select-none'}>
    <div className={'flex justify-between items-center border-b border-gray-200 bg-white'}>
      <div className={'px-4 py-2 text-sm text-gray-700'}>
        {file?.name || 'Untitled'}
      </div>
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

            <Col fh stretch flex={'none'} w={260} style={{borderLeft: '1px solid #dfdfdf'}}>
              <PropPanel props={selectedProps!} executeAction={executeAction}/>
              <LayerPanel executeAction={executeAction}
                          layerItems={layerItems}
                          selectedIds={selectedIds}/>
              <HistoryPanel historyItems={historyItems}
                            historyStatus={historyStatus}
                            pickHistory={pickHistory}/>
            </Col>
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
