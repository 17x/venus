import type { EditorRuntimeCommand } from '@venus/editor-worker'
import type { HistorySummary } from '@venus/history'

interface HistoryPanelProps {
  history: HistorySummary
  onCommand: (command: EditorRuntimeCommand) => void
}

/**
 * Read-only history panel for the new runtime.
 *
 * The legacy app supported history-pick. We keep that out for now because the
 * new worker currently exposes linear undo/redo but not cursor jumping yet.
 */
export function HistoryPanel({ history, onCommand }: HistoryPanelProps) {
  const entries = history.entries.slice().reverse()

  return (
    <section className="panel-card vision-panel">
      <div className="vision-panel-header">
        <p className="eyebrow">History</p>
        <div className="vision-inline-actions">
          <button
            type="button"
            className="status-action"
            disabled={!history.canUndo}
            onClick={() => onCommand({ type: 'history.undo' })}
          >
            Undo
          </button>
          <button
            type="button"
            className="status-action"
            disabled={!history.canRedo}
            onClick={() => onCommand({ type: 'history.redo' })}
          >
            Redo
          </button>
        </div>
      </div>

      <div className="vision-panel-scroll">
        {entries.map((entry, reversedIndex) => {
          const index = history.entries.length - reversedIndex - 1
          const isCurrent = index === history.cursor

          return (
            <div
              key={`${entry.source}-${entry.id}-${index}`}
              className={isCurrent ? 'vision-list-item active passive' : 'vision-list-item passive'}
            >
              <span>{entry.label}</span>
              <small>{entry.source}</small>
            </div>
          )
        })}
      </div>
    </section>
  )
}
