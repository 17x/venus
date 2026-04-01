import MenuBar from './menu/Menu.tsx'
import ShortcutBar from './shortcutBar/ShortcutBar.tsx'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'
import {WorkSpaceStateType} from '../../contexts/workspaceContext/reducer/reducer.ts'

const Header: React.FC<{
  executeAction: EditorExecutor
  saveFile: VoidFunction
  workspaceState: WorkSpaceStateType
}> = ({executeAction, saveFile, workspaceState}) => {
  return <header>
    <MenuBar executeAction={executeAction}/>
    <ShortcutBar executeAction={executeAction}
                 saveFile={saveFile}
                 needSave={workspaceState.needSave}
                 historyStatus={workspaceState.historyStatus}
                 selectedElements={workspaceState.selectedElements}/>
  </header>
}
export default Header
