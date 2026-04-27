import {resolveAutoMaskAction, resolveClearMaskAction} from './useEditorRuntime.helpers.ts'

export function createAutoMaskHandler(options: {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  canvasShapes: import('@vector/model').EditorDocument['shapes']
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
  selectedNode: import('@vector/model').DocumentNode | null
}) {
  return () => {
    const resolved = resolveAutoMaskAction({
      canvasShapes: options.canvasShapes,
      selectedNode: options.selectedNode,
    })

    if (resolved.command) {
      options.handleCommand(resolved.command)
    }
    options.add(resolved.message, 'info')
  }
}

export function createClearMaskHandler(options: {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
  selectedNode: import('@vector/model').DocumentNode | null
}) {
  return () => {
    const resolved = resolveClearMaskAction(options.selectedNode)

    if (resolved.command) {
      options.handleCommand(resolved.command)
    }
    options.add(resolved.message, 'info')
  }
}