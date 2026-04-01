import {createContext, useContext} from 'react'
import {VisionWorkspace} from '../appContext/AppContext.tsx'
import {UID, UnitType, VisionEventData, VisionEventType} from '@lite-u/editor/types'
import {Unit} from '@lite-u/editor'

interface FileContextType {
  workspaceList: VisionWorkspace[]
  pageConfig: {
    dpi: number
    width: number,
    height: number,
    unit: UnitType,
  }
  creating: boolean
  focused: UID
  focusOn: (id: UID) => void
  close: (id: UID) => void
  executeAction: <K extends VisionEventType>(type: K, data?: VisionEventData<K>) => void
  saveFile: () => void
  create: (v: UID, data?: VisionWorkspace) => void
  handleCreating: (v: boolean) => void
  startCreateFile: VoidFunction
}

const FileContext = createContext<FileContextType>({
  workspaceList: [],
  pageConfig: {
    dpi: 2,
    width: 1,
    height: 1,
    unit: Unit.PX,
  },
  creating: false,
  focused: '',
  saveFile: () => {},
  focusOn: () => {},
  close: () => {},
  create: () => {},
  handleCreating: () => {},
  executeAction: () => {},
  startCreateFile: () => {
  },
})

export const useFile = () => useContext(FileContext)

export default FileContext