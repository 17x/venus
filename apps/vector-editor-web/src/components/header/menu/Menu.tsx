import type { EditorRuntimeCommand } from '@venus/editor-worker'
import { WEB_EDITOR_MENU_TREE } from '../../../config/menu/menu.web.ts'
import { MenuBar as EditorMenuBar } from './MenuBar.tsx'

const MENU_COMMANDS: Record<string, EditorRuntimeCommand> = {
  delete: { type: 'selection.delete' },
  redo: { type: 'history.redo' },
  undo: { type: 'history.undo' },
  zoomIn: { type: 'viewport.zoomIn' },
  zoomOut: { type: 'viewport.zoomOut' },
}

const MenuBar: React.FC<{ onCommand: (command: EditorRuntimeCommand) => void }> = ({
  onCommand,
}) => {
  return (
    <EditorMenuBar
      items={WEB_EDITOR_MENU_TREE}
      translate={(id, field) => resolveMenuCopy(id, field)}
      onAction={(item) => {
        const command = MENU_COMMANDS[item.id]
        if (command) {
          onCommand(command)
        }
      }}
    />
  )
}

export default MenuBar

function resolveMenuCopy(id: string, field: 'label' | 'tooltip') {
  const value = id
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()

  const label = value.charAt(0).toUpperCase() + value.slice(1)
  return field === 'label' ? label : `${label} menu action`
}
