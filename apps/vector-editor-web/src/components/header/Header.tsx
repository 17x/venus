import MenuBar from './menu/Menu.tsx'
import ShortcutBar from './shortcutBar/ShortcutBar.tsx'
import {EditorExecutor} from '../workspace/Workspace.tsx'

const Header: React.FC = ({editorAction}:{editorAction:EditorExecutor}) => {
  return <header>
    <MenuBar editorAction={editorAction}/>
    <ShortcutBar editorAction={editorAction}/>
  </header>
}
export default Header