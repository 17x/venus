import type {InspectorContext, InspectorPanelId} from '../state/inspectorState.ts'
import type {ToolbeltMode} from '../state/toolbeltState.ts'
import type {ToolName} from '@venus/document-core'

export type ShellCommandId =
  | 'shell.setZoom'
  | 'shell.setLeftTab'
  | 'shell.setGrid'
  | 'shell.setSnapping'
  | 'tool.select'
  | 'tool.setMode'
  | 'inspector.togglePanel'
  | 'inspector.setContext'
  | 'layer.reorder'
  | 'history.pick'
  | 'selection.modify'
  | 'element.modify'

export interface ShellCommandPayloadMap {
  'shell.setZoom': {
    zoomPercent: number
  }
  'shell.setLeftTab': {
    tab: 'file' | 'assets' | 'search' | 'history' | 'debug'
  }
  'shell.setGrid': {
    enabled: boolean
  }
  'shell.setSnapping': {
    enabled: boolean
  }
  'tool.select': {
    tool: ToolName
  }
  'tool.setMode': {
    mode: ToolbeltMode
  }
  'inspector.togglePanel': {
    panelId: InspectorPanelId
  }
  'inspector.setContext': {
    context: InspectorContext
  }
  'layer.reorder': {
    direction: 'up' | 'down' | 'top' | 'bottom'
  }
  'history.pick': {
    historyId: number
  }
  'selection.modify': {
    mode: 'replace' | 'toggle' | 'add'
    ids: string[]
  }
  'element.modify': {
    elementId: string
    patch: Record<string, unknown>
  }
}

export type ShellCommandPayload<K extends ShellCommandId> = ShellCommandPayloadMap[K]

export type ShellCommandCommitType = 'live' | 'final'

export interface ShellCommandMeta {
  sourcePanel: string
  sourceControl: string
  commitType?: ShellCommandCommitType
  undoGroupId?: string
}

export interface ShellCommand<K extends ShellCommandId = ShellCommandId> {
  id: K
  payload: ShellCommandPayload<K>
  meta: ShellCommandMeta
}

export const SHELL_COMMAND_REGISTRY: Record<ShellCommandId, {description: string}> = {
  'shell.setZoom': {description: 'Set viewport zoom level from shell UI'},
  'shell.setLeftTab': {description: 'Switch active left sidebar tab'},
  'shell.setGrid': {description: 'Toggle canvas grid visibility'},
  'shell.setSnapping': {description: 'Toggle snapping behavior'},
  'tool.select': {description: 'Select active tool from toolbelt'},
  'tool.setMode': {description: 'Switch shell mode (draw/design/handoff)'},
  'inspector.togglePanel': {description: 'Toggle inspector panel visibility'},
  'inspector.setContext': {description: 'Switch inspector context (selection/page)'},
  'layer.reorder': {description: 'Reorder selected layer in stack'},
  'history.pick': {description: 'Jump to selected history node'},
  'selection.modify': {description: 'Modify selection by id set from inspector panel'},
  'element.modify': {description: 'Patch selected element properties from inspector panel'},
}
