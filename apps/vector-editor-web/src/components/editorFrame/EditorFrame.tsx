import {useState} from 'react'
import CreateFile from '../createFile/CreateFile.tsx'
import LanguageSwitcher from '../language/languageSwitcher.tsx'
import FileReceiver from '../fileReceiver.tsx'
import Header from '../header/Header.tsx'
import Toolbar from '../toolbar/Toolbar.tsx'
import {ContextMenu} from '../contextMenu/ContextMenu.tsx'
import PropPanel from '../propPanel/PropPanel.tsx'
import {LayerPanel} from '../layerPanel/LayerPanel.tsx'
import {HistoryPanel} from '../historyPanel/HistoryPanel.tsx'
import {StatusBar} from '../statusBar/StatusBar.tsx'
import {Print} from '../print/print.tsx'
import {Col, Con, Drop, Row} from '@lite-u/ui'
import useEditorRuntime from '../../hooks/useEditorRuntime.ts'
import {CanvasViewport} from '@venus/canvas-base'

const EditorFrame = () => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0})
  const [showDropNotice, setShowDropNotice] = useState(false)
  const [dropNoticeColor, setDropNoticeColor] = useState('green')
  const runtime = useEditorRuntime({
    onContextMenu: (position) => {
      setShowContextMenu(true)
      setContextMenuPosition(position)
    },
  })

  const {
    file,
    hasFile,
    showCreateFile,
    showPrint,
    setShowPrint,
    workspaceState,
    contextRootRef,
    worldPointRef,
    editorRef,
    executeAction,
    saveFile,
    createFile,
    handleCreating,
    setCurrentTool,
    pickHistory,
    openDroppedFile,
    canvas,
  } = runtime

  return <div className={'w-full h-full flex flex-col select-none'}>
    <div className={'flex justify-between items-center border-b border-gray-200 bg-white'}>
      <div className={'px-4 py-2 text-sm text-gray-700'}>
        {file?.name || 'Untitled'}
      </div>
      <LanguageSwitcher/>
    </div>

    <div className={'flex-1 overflow-hidden min-h-[600px] relative'}>
      {file && <Drop accepts={['application/zip']}
                     onDragIsOver={(value) => {
                       setDropNoticeColor(value ? 'green' : 'red')
                       setShowDropNotice(true)
                     }}
                     onDragIsLeave={() => {
                       setShowDropNotice(false)
                     }}
                     onDrop={(event) => {
                       setShowDropNotice(false)
                       openDroppedFile(event.dataTransfer.files[0])
                     }}>
        <Col fw fh stretch ref={contextRootRef} data-focused={workspaceState.focused} autoFocus={true}
             tabIndex={0}
             className={'outline-0 bg-white'}>
          <Header executeAction={executeAction}
                  saveFile={saveFile}
                  workspaceState={workspaceState}/>

          <Row ovh fh>
            <Toolbar tool={workspaceState.currentTool} setTool={setCurrentTool}/>
            <Col fw fh ovh rela flex={1}>
              <FileReceiver executeAction={executeAction}>
                <div
                  className={'relative overflow-hidden flex w-full h-full'}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setShowContextMenu(true)
                    canvas.onContextMenu({
                      x: event.clientX,
                      y: event.clientY,
                    })
                  }}
                >
                  <CanvasViewport
                    document={canvas.document}
                    renderer={canvas.Renderer}
                    shapes={canvas.shapes}
                    viewport={canvas.viewport}
                    onPointerMove={canvas.onPointerMove}
                    onPointerDown={canvas.onPointerDown}
                    onPointerLeave={canvas.onPointerLeave}
                    onViewportPan={canvas.onViewportPan}
                    onViewportResize={canvas.onViewportResize}
                    onViewportZoom={canvas.onViewportZoom}
                  />
                </div>
              </FileReceiver>

              <StatusBar executeAction={executeAction}
                         worldScale={workspaceState.worldScale}
                         ref={worldPointRef}/>

              {showContextMenu &&
                <ContextMenu position={contextMenuPosition}
                             executeAction={executeAction}
                             selectedElements={workspaceState.selectedElements}
                             copiedItems={workspaceState.copiedItems}
                             historyStatus={workspaceState.historyStatus}
                             onClose={() => {
                               setShowContextMenu(false)
                             }}/>}
            </Col>

            <Col fh stretch flex={'none'} w={260} style={{borderLeft: '1px solid #dfdfdf'}}>
              <PropPanel props={workspaceState.selectedProps!} executeAction={executeAction}/>
              <LayerPanel executeAction={executeAction}
                          elements={workspaceState.elements}
                          selectedElements={workspaceState.selectedElements}/>
              <HistoryPanel historyArray={workspaceState.historyArray}
                            historyStatus={workspaceState.historyStatus}
                            pickHistory={pickHistory}/>
            </Col>
          </Row>
        </Col>
      </Drop>}
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

    {showDropNotice && <Con fw fh style={{
      border: '5px solid',
      borderColor: dropNoticeColor,
      pointerEvents: 'none',
      position: 'absolute',
      top: 0,
      left: 0,
    }}></Con>}
  </div>
}

export default EditorFrame
