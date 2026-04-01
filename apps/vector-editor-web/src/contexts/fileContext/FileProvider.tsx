import {FC, useEffect, useRef, useState} from 'react'
import {useApp, VisionFileType, VisionWorkspace} from '../appContext/AppContext.tsx'
import FileContext from './FileContext.tsx'
import {Con, Drop, useNotification} from '@lite-u/ui'
import WorkspaceProvider from '../workspaceContext/WorkspaceProvider.tsx'
import {UID, VisionEventData, VisionEventType} from '@lite-u/editor/types'
import {Print} from '../../components/print/print.tsx'
import {Editor} from '@lite-u/editor'
import saveFileHelper from './saveFileHelper.ts'
import readFileHelper from './readFileHelper.ts'
import {useTranslation} from 'react-i18next'
import Workspace from '../../components/workspace/Workspace.tsx'

const FileProvider: FC<{ file: VisionFileType }> = ({file}) => {
  // const {workspaceList, pageConfig} = useWorkspace()
  const {openFile} = useApp()
  const workspaceRef = useRef(new Map())
  const [creating, setCreating] = useState<boolean>(false)
  const [focusedId, setFocusedId] = useState<UID>('')
  const [workspace, setWorkspace] = useState<VisionWorkspace[]>([])
  const editorMapRef = useRef<Map<string, Editor>>(new Map())
  // const {dpr} = useUI()
  const [currentWS, setCurrentWS] = useState<string>(file.workspace[0].id)
  const [showPrint, setShowPrint] = useState(false)
  const [showDropNotice, setShowDropNotice] = useState(false)
  const [dropNoticeColor, setDropNoticeColor] = useState('green')
  const [readingFile, setReadingFile] = useState(false)
  const {add} = useNotification()
  const {t} = useTranslation()

  useEffect(() => {
    setWorkspace(file.workspace)
  }, [])

  const focusOnWorkspace = (id: UID) => {
    setFocusedId(id)
  }

  const closeWorkspace = (deletingId: UID) => {
    let ws = workspaceRef.current.get(deletingId)

    workspaceRef.current.delete(deletingId)
    console.log(ws)
    // const deletingFileIndex = workspaceList.findIndex(file => file.id === deletingId)
    // let len = workspaceList.length
    //
    // if (deletingFileIndex === -1) return

    // deleteFileFromLocal(deletingId)
    // fileMap.current.delete(deletingId)
    // updateFileList()
    // workspaceList.splice(deletingFileIndex, 1)
    // len--
    /*
        if (focusedId === deletingId && len > 0) {
          let newOpenFileIndex: number = deletingFileIndex + 1

          if (deletingFileIndex === 0) {
            newOpenFileIndex = 0
          }
          if (newOpenFileIndex > len) {
            newOpenFileIndex = len - 1
          }

          setFocusedId(workspaceList[newOpenFileIndex].id)
        }*/
  }

  const createWorkspace = (ws: VisionWorkspace) => {
    // fileMap.current.set(file.id, file)
    // updateFileList()
    focusOnWorkspace(file.id)
    // setCurrentFileId(file.id)
  }

  const startCreateFile = () => {
    setCreating(true)
  }

  const handleCreating = (v: boolean) => {
    setCreating(v)
  }

  const saveFile = () => {
    const workspaceList: VisionWorkspace[] = []

    workspace.map(WS => {
      const e = editorMapRef.current.get(WS.id)
      const data = e?.export()

      workspaceList.push({
        ...WS,
        ...data,
      })
    })

    saveFileHelper(file, workspaceList)
  }

  const executeAction = <K extends (VisionEventType & WorkspaceAction)>(type: K, data?: VisionEventData<K>) => {
    // console.log(type)

    if (type === 'print') {
      setShowPrint(true)
      return
    }

    if (type === 'newFile') {
      startCreateFile()
      return
    }

    if (type === 'closeFile') {
      closeFile(data.id)
      return
    }

    if (type === 'saveFile') {
      console.log(9)
    }
    const currentWSEditor = editorMapRef.current.get(currentWS)

    if (currentWSEditor) {
      // console.log(currentWS, editorMapRef)
      // console.log(currentWSEditor)
      // console.log(editorMapRef.current.get(currentWS).current)
      currentWSEditor.execute(type as K, data)
    }
  }

  return <FileContext.Provider value={{
    creating,
    focused: focusedId,
    // closeFile,
    executeAction,
    saveFile,
    create: createWorkspace,
    startCreateFile,
    handleCreating,
  }}>
    <Con fw fh>
      <Drop accepts={['application/zip']}
            onDragIsOver={(v) => {
              setDropNoticeColor(v ? 'green' : 'red')
              setShowDropNotice(true)
            }}
            onDragIsLeave={() => {
              setShowDropNotice(false)
            }}
            onDrop={(e) => {
              setShowDropNotice(false)
              setReadingFile(true)
              readFileHelper(e.dataTransfer.files[0]).then(newFile => {
                openFile(newFile)
              }).catch(() => {
                add(t('misc.fileResolveFailed'), 'info')
              })
            }}>
        {
          workspace.map((ws, index) => {
            return <WorkspaceProvider key={index}>
              <Workspace ref={(ref) => {
                editorMapRef.current.set(ws.id, ref)
              }} workspace={ws} fileId={file.id} page={file.config.page} />
            </WorkspaceProvider>
          })
        }
      </Drop>
    </Con>

    {showPrint && <Print editorRef={editorRef} onClose={() => {
      setShowPrint(false)
    }}/>}

    {
      showDropNotice && <Con fw fh style={{
        border: '5px solid',
        borderColor: dropNoticeColor,
        pointerEvents: 'none',
        position: 'absolute',
        top: 0,
        left: 0,
      }}></Con>
    }
  </FileContext.Provider>
}

export default FileProvider