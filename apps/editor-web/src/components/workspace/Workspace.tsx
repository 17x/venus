import Header from '../header/Header.tsx'
import {Col, Row} from '@lite-u/ui'
import Toolbar from '../toolbar/Toolbar.tsx'
import FileReceiver from '../fileReceiver.tsx'
import {PointRef, StatusBar} from '../statusBar/StatusBar.tsx'
import {ContextMenu} from '../contextMenu/ContextMenu.tsx'
import PropPanel from '../propPanel/PropPanel.tsx'
import {LayerPanel} from '../layerPanel/LayerPanel.tsx'
import {HistoryPanel} from '../historyPanel/HistoryPanel.tsx'
import {FC, RefObject, useCallback, useContext, useEffect, useRef, useState} from 'react'
import useEditor from '../../hooks/useEditor.tsx'
import useGesture from '../../hooks/useGesture.tsx'
import AppContext, {VisionWorkspace} from '../../contexts/appContext/AppContext.tsx'
import {Editor} from '@lite-u/editor'
import WorkspaceContext from '../../contexts/workspaceContext/WorkspaceContext.tsx'
import {UID, VisionEventData, VisionEventType} from '@lite-u/editor/types'
import EditorContext from '../../contexts/EditorContext/EditorContext.tsx'
import useFocus from '../../hooks/useFocus.tsx'
import useShortcut from '../../hooks/useShortcut.tsx'
import ZOOM_LEVELS from '../../constants/zoomLevels.ts'

export type  EditorExecutor = <K extends VisionEventType>(type: K, data?: VisionEventData<K>) => void

const Workspace: FC<{
  ref: RefObject<Editor>,
  workspace: VisionWorkspace,
  fileId: UID,
  page: EditorConfig['page']
}> = ({ref, workspace, fileId, page}) => {
  const {focusedFileId, startCreateFile, closeFile} = useContext(AppContext)
  const {state, dispatch} = useContext(WorkspaceContext)
  const contextRootRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const worldPointRef = useRef<PointRef | null>(null)
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0})
  const scaleRef = useRef(state.worldScale)
  const editorRef = useEditor(containerRef, worldPointRef, workspace, page, (p) => {
    setShowContextMenu(true)
    setContextMenuPosition(p)
  })
  /*
    useImperativeHandle(ref, () => {
      return editorRef.current
    }, [editorRef.current])
  */
  const handleZoom = useCallback((zoomIn: boolean, p?: { x: number, y: number }) => {
    const filtered = ZOOM_LEVELS.filter(z => typeof z.value === 'number')
    const currentScale = scaleRef.current
    let nextScale = null

    if (zoomIn) {
      nextScale = filtered.reverse().find(z => z.value > currentScale)
    } else {
      nextScale = filtered.find(z => z.value < currentScale)
    }

    if (nextScale) {
      dispatch({type: 'SET_WORLD_SCALE', payload: nextScale.value})
      executeAction('world-zoom', {
        zoomTo: true,
        zoomFactor: nextScale.value,
        physicalPoint: p,
      })
    }
  }, [scaleRef.current])

  const executeAction: EditorExecutor = (code, data) => {

    if (code === 'newFile') {
      startCreateFile()
      return
    }

    if (code === 'closeFile') {
      closeFile(data.id)
      return
    }

    editorRef.current!.execute(code, data)
  }

  useGesture(containerRef, executeAction, state.currentTool, handleZoom)
  useFocus(contextRootRef)
  useShortcut(executeAction, handleZoom)
  useEffect(() => { scaleRef.current = state.worldScale }, [state.worldScale])

  return <EditorContext.Provider value={{executeAction}}>

    <Col fw fh stretch ref={contextRootRef} data-focused={state.focused} autoFocus={true}
         tabIndex={0}
         className={'outline-0'}>
      {/*{focusedFileId === workspace.id && <UseShortcut/>}*/}

      <Header editorAction={executeAction}/>

      <Row ovh fh>
        <Toolbar tool={state.currentTool} setTool={(toolName) => {
          executeAction('switch-tool', toolName)
        }}/>
        <Col fw fh ovh rela flex={1}>
          <FileReceiver>
            <div ref={containerRef}
                 editor-container={'true'}
                 className={'relative overflow-hidden flex w-full h-full'}
            ></div>
          </FileReceiver>

          <StatusBar executeAction={executeAction} ref={worldPointRef}/>

          {
            showContextMenu &&
              <ContextMenu position={contextMenuPosition}
                           executeAction={executeAction}
                           onClose={() => {
                             setShowContextMenu(false)
                           }}/>
          }
        </Col>

        <Col fh stretch flex={'none'} w={260} style={{borderLeft: '1px solid #dfdfdf'}}>
          <PropPanel props={state.selectedProps!}/>
          <LayerPanel  executeAction={executeAction}/>
          <HistoryPanel pickHistory={(node) => {
            if (editorRef.current) {
              editorRef.current.execute('history-pick', node)
            }
          }}/>
        </Col>
      </Row>
    </Col>
  </EditorContext.Provider>
}

export default Workspace