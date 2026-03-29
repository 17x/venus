import type { EditorRuntimeCommand } from '@venus/editor-worker'
import MenuBar from './menu/Menu.tsx'
import ShortcutBar from './shortcutBar/ShortcutBar.tsx'

interface HeaderProps {
  canRedo: boolean
  canUndo: boolean
  documentName: string
  hasSelection: boolean
  onCommand: (command: EditorRuntimeCommand) => void
  onInsertRectangle: VoidFunction
}

export default function Header({
  canRedo,
  canUndo,
  documentName,
  hasSelection,
  onCommand,
  onInsertRectangle,
}: HeaderProps) {
  return (
    <header className="vision-header">
      <div className="vision-header-menu-row">
        <div className="vision-file-pill">
          <span>{documentName}</span>
        </div>
        <button
          type="button"
          className="vision-header-add"
          onClick={onInsertRectangle}
          aria-label="Insert rectangle"
        >
          +
        </button>
        <div className="vision-header-spacer" />
      </div>

      <MenuBar onCommand={onCommand} />
      <ShortcutBar
        canRedo={canRedo}
        canUndo={canUndo}
        hasSelection={hasSelection}
        onCommand={onCommand}
        onInsertRectangle={onInsertRectangle}
      />
    </header>
  )
}
