import type { CollaborationState } from '@venus/collaboration'
import type { EditorDocument } from '@venus/editor-core'
import type { EditorRuntimeCommand } from '@venus/editor-worker'
import type { HistorySummary } from '@venus/history'
import type { SceneShapeSnapshot, SceneStats } from '@venus/shared-memory'
import { HistoryPanel } from '../historyPanel/HistoryPanel.tsx'
import { LayerPanel } from '../layerPanel/LayerPanel.tsx'
import PropPanel from '../propPanel/PropPanel.tsx'

interface EditorSidebarProps {
  collaboration: CollaborationState
  document: EditorDocument
  history: HistorySummary
  onCommand: (command: EditorRuntimeCommand) => void
  runtimeReady: boolean
  sabSupported: boolean
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
}

export function EditorSidebar({
  collaboration,
  document,
  history,
  onCommand,
  runtimeReady,
  sabSupported,
  shapes,
  stats,
}: EditorSidebarProps) {
  const selectedShape = stats.selectedIndex >= 0 ? shapes[stats.selectedIndex] ?? null : null

  return (
    <aside className="right-panel">
      <PropPanel onCommand={onCommand} selectedShape={selectedShape} />

      <LayerPanel document={document} onCommand={onCommand} shapes={shapes} />
      <HistoryPanel history={history} onCommand={onCommand} />

      <section className="panel-card vision-panel">
        <div className="vision-panel-header">
          <p className="eyebrow">Runtime</p>
        </div>
        <ul className="info-list">
          <li>Worker ready: {runtimeReady ? 'yes' : 'no'}</li>
          <li>SAB available: {sabSupported ? 'yes' : 'no'}</li>
          <li>Collab connected: {collaboration.connected ? 'yes' : 'no'}</li>
          <li>Local ops: {collaboration.pendingLocalCount}</li>
          <li>Remote ops: {collaboration.pendingRemoteCount}</li>
        </ul>
      </section>
    </aside>
  )
}
