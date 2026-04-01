import {FC, useEffect, useState} from 'react'
import CreateFile from '../../components/createFile/CreateFile.tsx'
import AppContext, {useApp, VisionFileType} from './AppContext.tsx'
// import MOCK_FILE_MAP from '../../mock.ts'
import FilesTab from '../../components/file/FilesTab.tsx'
import LanguageSwitcher from '../../components/language/languageSwitcher.tsx'
import {EditorExportFileType} from '@lite-u/editor/engine/type'
import FileProvider from '../fileContext/FileProvider.tsx'
import {useNotification} from '@lite-u/ui'
import {useTranslation} from 'react-i18next'

const AppProvider: FC = () => {
  const {fileMap} = useApp()
  const [fileList, setFileList] = useState<VisionFileType[]>([])
  const [creating, setCreating] = useState<boolean>(false)
  const [focusedFileId, setFocusedFileId] = useState<UID>('')
  const fileLen = fileMap.size
  const showCreateFile = fileLen === 0 || creating
  const STORAGE_ID = 'VISION_FLOW_FILE_MAP'
  const {add} = useNotification()
  const {t} = useTranslation()

  useEffect(() => {
    updateFileList()
  }, [fileMap])

  const openFile = (file: VisionFileType) => {
    if (fileMap.get(file.id)) {
      add(t('misc.fileOpenRepeat'), 'info')
    } else {
      fileMap.set(file.id, file)
      updateFileList()
    }
  }

  const updateFileList = () => {
    const arr = Array.from(fileMap.values())

    setFileList(arr)

    if (!focusedFileId) {
      if (arr[0]) {
        focusOnFile(arr[0].id)
      }
    }
  }

  const focusOnFile = (id: UID) => {
    // console.log(fileList)
    setFocusedFileId(id)

  }

  const closeFile = (deletingId: UID) => {
    const deletingFileIndex = fileList.findIndex(file => file.id === deletingId)
    let len = fileList.length

    if (deletingFileIndex === -1) return

    // deleteFileFromLocal(deletingId)
    fileMap.delete(deletingId)
    updateFileList()
    fileList.splice(deletingFileIndex, 1)
    len--

    if (focusedFileId === deletingId && len > 0) {
      let newOpenFileIndex: number = deletingFileIndex + 1

      if (deletingFileIndex === 0) {
        newOpenFileIndex = 0
      }
      if (newOpenFileIndex > len) {
        newOpenFileIndex = len - 1
      }

      setFocusedFileId(fileList[newOpenFileIndex].id)
    }
  }

  const createFile = (file: VisionFileType) => {
    fileMap.set(file.id, file)
    updateFileList()
    focusOnFile(file.id)
  }

  const startCreateFile = () => {
    setCreating(true)
  }

  const handleCreating = (v: boolean) => {
    setCreating(v)
  }

  const saveFileToLocal = (file: EditorExportFileType) => {
    let item = localStorage.getItem(STORAGE_ID)
    let savedFileMap = JSON.parse(item!)
    const fileId = file.id

    if (!savedFileMap) {
      savedFileMap = {}
    }

    savedFileMap[file.id] = fileId
    localStorage.setItem(STORAGE_ID, JSON.stringify(savedFileMap))
    localStorage.setItem(fileId, JSON.stringify(file))
    // console.log('saved')
  }

  return (
    <AppContext.Provider value={{
      fileMap,
      fileList,
      creating,
      focusedFileId,
      focusOnFile,
      openFile,
      closeFile,
      createFile,
      startCreateFile,
      saveFileToLocal,
      handleCreating,
    }}>
      <div className={'w-full h-full flex flex-col select-none'}>
        <div className={'flex justify-between'}>
          <FilesTab/>
          <LanguageSwitcher/>
        </div>

        <div className={'flex-1 overflow-hidden min-h-[600px] relative'}>
          {
            fileList.map(file => <div key={file.id}
                                      data-file-id={file.id}
                                      className={'flex top-0 bg-white left-0 absolute outline-0 w-full h-full flex-col'}
                                      style={{
                                        zIndex: file.id === focusedFileId ? 200 : 100,
                                      }}>
              <FileProvider file={file}/>
            </div>)
          }
        </div>

        {
          showCreateFile &&
            <CreateFile bg={fileLen ? '#00000080' : '#fff'}
                        onBgClick={() => {
                          if (fileLen) {
                            setCreating(false)
                          }
                        }
                        }/>
        }
      </div>
    </AppContext.Provider>
  )
}

export default AppProvider