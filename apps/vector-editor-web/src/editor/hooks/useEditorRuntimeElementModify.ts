import type {ElementProps} from '@lite-u/editor/types'
import {resolveElementModifyCommands} from './useEditorRuntime.helpers.ts'

export function applyElementModifyAction(options: {
  canvasShapes: import('@venus/document-core').EditorDocument['shapes']
  data: unknown[]
  handleCommand: (command: import('@vector/runtime/worker').EditorRuntimeCommand) => void
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