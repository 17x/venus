import type {ElementProps} from '../types/index.ts'
import {resolveElementModifyCommands} from './selectionGroupHelpers.ts'

export function applyElementModifyAction(options: {
  canvasShapes: import('../../runtime/model/index.ts').EditorDocument['shapes']
  data: unknown[]
  handleCommand: (command: import('../../runtime/worker/index.ts').EditorRuntimeCommand) => void
}) {
  options.data.forEach((rawPatch) => {
    const patch = rawPatch as {id: string; props?: Partial<ElementProps>}
    const shape = options.canvasShapes.find((item) => item.id === patch.id)

    if (!shape || !patch.props) {
      return
    }

    resolveElementModifyCommands({
      shape,
      props: patch.props,
    }).forEach((command) => {
      options.handleCommand(command)
    })
  })
}