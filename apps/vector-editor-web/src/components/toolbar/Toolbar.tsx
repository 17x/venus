import type { ToolId } from '@venus/editor-core'
import type { EditorRuntimeCommand } from '@venus/editor-worker'
import { Tooltip } from '@lite-u/ui'

interface ToolbarProps {
  activeTool: ToolId
  onCommand: (command: EditorRuntimeCommand) => void
}

const TOOLBAR_ITEMS: Array<{
  id: ToolId
  label: string
  shortcut: string
  glyph: string
}> = [
  { id: 'select', label: 'Select', shortcut: 'V', glyph: '↖' },
  { id: 'frame', label: 'Frame', shortcut: 'F', glyph: '▣' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', glyph: '▭' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', glyph: '◯' },
  { id: 'pen', label: 'Pen', shortcut: 'P', glyph: '✎' },
  { id: 'text', label: 'Text', shortcut: 'T', glyph: 'T' },
]

/**
 * App-owned left toolbar for the vector editor web shell.
 *
 * Why:
 * - This keeps product-specific tool presentation inside the app.
 * - The editor shell stays local to this app for now.
 *
 * Not:
 * - command execution
 * - worker coordination
 * - runtime state ownership
 */
const Toolbar = ({ activeTool, onCommand }: ToolbarProps) => {
  return (
    <aside className="app-toolbar" aria-label="Vector tools">
      <span className="brand-mark app-toolbar-brand">V</span>

      <nav className="app-toolbar-list">
        {TOOLBAR_ITEMS.map((item) => {
          const active = item.id === activeTool

          return (
            <Tooltip
              placement={'r'}
              key={item.id}
              title={item.label}
            >
              <button
                type="button"
                className={active ? 'app-toolbar-button active' : 'app-toolbar-button'}
                onClick={() => onCommand({ type: 'tool.select', tool: item.id })}
                aria-label={`${item.label} (${item.shortcut})`}
              >
                <span className="app-toolbar-glyph" aria-hidden="true">
                  {item.glyph}
                </span>
              </button>
            </Tooltip>
          )
        })}
      </nav>
    </aside>
  )
}

export default Toolbar
