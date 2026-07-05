import {resolveAutoMaskAction, resolveClearMaskAction} from '../product/commandResolvers.ts'

export function createAutoMaskHandler(options: {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  canvasShapes: import('../../runtime/model/index.ts').EditorDocument['shapes']
  handleCommand: (command: import('../../runtime/worker/index.ts').EditorRuntimeCommand) => void
  selectedNode: import('../../runtime/model/index.ts').DocumentNode | null
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
  handleCommand: (command: import('../../runtime/worker/index.ts').EditorRuntimeCommand) => void
  selectedNode: import('../../runtime/model/index.ts').DocumentNode | null
}) {
  return () => {
    const resolved = resolveClearMaskAction(options.selectedNode)

    if (resolved.command) {
      options.handleCommand(resolved.command)
    }
    options.add(resolved.message, 'info')
  }
}