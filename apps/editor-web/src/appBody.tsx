import {FC, useEffect/*, useRef, useState*/} from 'react'
// import {useApp, VisionWorkspace} from '../appContext/AppContext.tsx'
import {Con, Drop/*, useNotification*/} from '@lite-u/ui'

// import {useTranslation} from 'react-i18next'

const AppBody: FC<{}> = ({}) => {
  // const {workspaceList, pageConfig} = useWorkspace()
  // const {openFile} = useApp()
  // const workspaceRef = useRef(new Map())
  // const [creating, setCreating] = useState<boolean>(false)
  // const [showPrint, setShowPrint] = useState(false)
  // const [showDropNotice, setShowDropNotice] = useState(false)
  // const [dropNoticeColor, setDropNoticeColor] = useState('green')
  // const [readingFile, setReadingFile] = useState(false)
  // const {add} = useNotification()
  // const {t} = useTranslation()

  useEffect(() => {
    // setWorkspace(file.workspace)
  }, [])
/*
  const focusOnWorkspace = (id: UID) => {
    // setFocusedId(id)
  }

  const handleCreating = (v: boolean) => {
    setCreating(v)
  }*/
/*

  const saveFile = () => {
    const workspaceList: VisionWorkspace[] = []

    saveFileHelper(file, workspaceList)
  }
*/

  return <Con fw fh>
    <Drop accepts={['application/zip']}
          onDragIsOver={(/*v*/) => {
            // setDropNoticeColor(v ? 'green' : 'red')
            // setShowDropNotice(true)
          }}
          onDragIsLeave={() => {
            // setShowDropNotice(false)
          }}
          onDrop={(/*e*/) => {
            // setShowDropNotice(false)
            // setReadingFile(true)
           /* readFileHelper(e.dataTransfer.files[0]).then(newFile => {
              openFile(newFile)
            }).catch(() => {
              add(t('misc.fileResolveFailed'), 'info')
            })*/
          }}>

    </Drop>
  </Con>

  /* {showPrint && <Print   onClose={() => {
     setShowPrint(false)
   }}/>}*/

  /*{
    showDropNotice && <Con fw fh style={{
      border: '5px solid',
      borderColor: dropNoticeColor,
      pointerEvents: 'none',
      position: 'absolute',
      top: 0,
      left: 0,
    }}></Con>
  }*/
}

export default AppBody