import type {
  ShellCommandId,
  ShellCommandMeta,
  ShellCommandPayload,
} from './shellCommandRegistry.ts'

interface ShellCommandHandlers {
  onSetZoom?: (payload: ShellCommandPayload<'shell.setZoom'>, meta: ShellCommandMeta) => void
  onSetLeftTab?: (payload: ShellCommandPayload<'shell.setLeftTab'>, meta: ShellCommandMeta) => void
  onSetGrid?: (payload: ShellCommandPayload<'shell.setGrid'>, meta: ShellCommandMeta) => void
  onSetSnapping?: (payload: ShellCommandPayload<'shell.setSnapping'>, meta: ShellCommandMeta) => void
  onSelectTool?: (payload: ShellCommandPayload<'tool.select'>, meta: ShellCommandMeta) => void
  onSetMode?: (payload: ShellCommandPayload<'tool.setMode'>, meta: ShellCommandMeta) => void
  onToggleInspectorPanel?: (payload: ShellCommandPayload<'inspector.togglePanel'>, meta: ShellCommandMeta) => void
  onSetInspectorContext?: (payload: ShellCommandPayload<'inspector.setContext'>, meta: ShellCommandMeta) => void
  onLayerReorder?: (payload: ShellCommandPayload<'layer.reorder'>, meta: ShellCommandMeta) => void
  onHistoryPick?: (payload: ShellCommandPayload<'history.pick'>, meta: ShellCommandMeta) => void
  onSelectionModify?: (payload: ShellCommandPayload<'selection.modify'>, meta: ShellCommandMeta) => void
  onElementModify?: (payload: ShellCommandPayload<'element.modify'>, meta: ShellCommandMeta) => void
  onDispatch?: (commandId: ShellCommandId, payload: unknown, meta: ShellCommandMeta) => void
}

export function createShellCommandDispatch(handlers: ShellCommandHandlers) {
  return function dispatchShellCommand<K extends ShellCommandId>(
    commandId: K,
    payload: ShellCommandPayload<K>,
    meta: ShellCommandMeta,
  ) {
    handlers.onDispatch?.(commandId, payload, meta)

    switch (commandId) {
      case 'shell.setZoom':
        handlers.onSetZoom?.(payload as ShellCommandPayload<'shell.setZoom'>, meta)
        return
      case 'shell.setLeftTab':
        handlers.onSetLeftTab?.(payload as ShellCommandPayload<'shell.setLeftTab'>, meta)
        return
      case 'shell.setGrid':
        handlers.onSetGrid?.(payload as ShellCommandPayload<'shell.setGrid'>, meta)
        return
      case 'shell.setSnapping':
        handlers.onSetSnapping?.(payload as ShellCommandPayload<'shell.setSnapping'>, meta)
        return
      case 'tool.select':
        handlers.onSelectTool?.(payload as ShellCommandPayload<'tool.select'>, meta)
        return
      case 'tool.setMode':
        handlers.onSetMode?.(payload as ShellCommandPayload<'tool.setMode'>, meta)
        return
      case 'inspector.togglePanel':
        handlers.onToggleInspectorPanel?.(payload as ShellCommandPayload<'inspector.togglePanel'>, meta)
        return
      case 'inspector.setContext':
        handlers.onSetInspectorContext?.(payload as ShellCommandPayload<'inspector.setContext'>, meta)
        return
      case 'layer.reorder':
        handlers.onLayerReorder?.(payload as ShellCommandPayload<'layer.reorder'>, meta)
        return
      case 'history.pick':
        handlers.onHistoryPick?.(payload as ShellCommandPayload<'history.pick'>, meta)
        return
      case 'selection.modify':
        handlers.onSelectionModify?.(payload as ShellCommandPayload<'selection.modify'>, meta)
        return
      case 'element.modify':
        handlers.onElementModify?.(payload as ShellCommandPayload<'element.modify'>, meta)
        return
      default:
        return
    }
  }
}
