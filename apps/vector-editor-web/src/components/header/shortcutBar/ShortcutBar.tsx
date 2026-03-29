import type { EditorRuntimeCommand } from '@venus/editor-worker'

import { LayerDown, LayerToBottom, LayerToTop, LayerUp } from './Icons/LayerIcons.tsx'

interface ShortcutBarProps {
  canRedo: boolean
  canUndo: boolean
  hasSelection: boolean
  onCommand: (command: EditorRuntimeCommand) => void
  onInsertRectangle: VoidFunction
}

/**
 * Product-level shortcut strip modeled after the legacy Vision shell.
 *
 * It stays intentionally simple: the strip mirrors the old affordances, while
 * the real execution path still goes through the new command bus.
 */
export default function ShortcutBar({
  canRedo,
  canUndo,
  hasSelection,
  onCommand,
  onInsertRectangle,
}: ShortcutBarProps) {
  const actions = [
    {
      id: 'insert',
      label: 'Insert',
      disabled: false,
      onClick: onInsertRectangle,
    },
    {
      id: 'undo',
      label: 'Undo',
      disabled: !canUndo,
      onClick: () => onCommand({ type: 'history.undo' }),
    },
    {
      id: 'redo',
      label: 'Redo',
      disabled: !canRedo,
      onClick: () => onCommand({ type: 'history.redo' }),
    },
    {
      id: 'delete',
      label: 'Delete',
      disabled: !hasSelection,
      onClick: () => onCommand({ type: 'selection.delete' }),
    },
    {
      id: 'fit',
      label: 'Fit',
      disabled: false,
      onClick: () => onCommand({ type: 'viewport.fit' }),
    },
  ]

  return (
    <div className="vision-shortcut-bar">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="vision-shortcut-button"
          disabled={action.disabled}
          onClick={action.onClick}
          title={action.label}
          aria-label={action.label}
        >
          <span className="vision-shortcut-icon" aria-hidden="true">
            {resolveShortcutIcon(action.id)}
          </span>
        </button>
      ))}

      <div className="vision-shortcut-divider" />

      <button type="button" className="vision-shortcut-button" disabled title="Layer up">
        <LayerUp size={18} />
      </button>
      <button type="button" className="vision-shortcut-button" disabled title="Layer down">
        <LayerDown size={18} />
      </button>
      <button type="button" className="vision-shortcut-button" disabled title="Layer to front">
        <LayerToTop size={18} />
      </button>
      <button type="button" className="vision-shortcut-button" disabled title="Layer to back">
        <LayerToBottom size={18} />
      </button>
    </div>
  )
}

function resolveShortcutIcon(actionId: string) {
  switch (actionId) {
    case 'insert':
      return '+'
    case 'undo':
      return '↶'
    case 'redo':
      return '↷'
    case 'delete':
      return '⌫'
    case 'fit':
      return '⤢'
    default:
      return '•'
  }
}
