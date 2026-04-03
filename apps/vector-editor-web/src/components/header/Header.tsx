import MenuBar from './menu/Menu.tsx'
import ShortcutBar from './shortcutBar/ShortcutBar.tsx'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'

const Header: React.FC<{
  executeAction: EditorExecutor
  saveFile: VoidFunction
  needSave: boolean
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
  selectedIds: string[]
}> = ({executeAction, saveFile, needSave, historyStatus, selectedIds}) => {
  return <header>
    <MenuBar executeAction={executeAction}/>
    <ShortcutBar executeAction={executeAction}
                 saveFile={saveFile}
                 needSave={needSave}
                 historyStatus={historyStatus}
                 selectedIds={selectedIds}/>
  </header>
}
export default Header
