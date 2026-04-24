import type {EditorRuntimeCommand} from '@vector/runtime/worker'
import {
  resolveConvertOrAlignShapeAction,
  resolveDistributeOrBooleanShapeAction,
} from '../useEditorRuntime.helpers.ts'

interface ShapeActionsContext {
  selectedShapeIds: string[]
  dispatchCommand: (command: EditorRuntimeCommand) => void
  notify?: (message: string) => void
}

export function handleShapeActions(
  actionType: string,
  context: ShapeActionsContext,
) {
  const convertOrAlign = resolveConvertOrAlignShapeAction({
    actionType,
    selectedShapeIds: context.selectedShapeIds,
  })
  if (convertOrAlign.handled) {
    if (convertOrAlign.command) {
      context.dispatchCommand(convertOrAlign.command)
    }
    return true
  }

  const distributeOrBoolean = resolveDistributeOrBooleanShapeAction({
    actionType,
    selectedShapeIds: context.selectedShapeIds,
  })
  if (distributeOrBoolean.handled) {
    if (distributeOrBoolean.command) {
      context.dispatchCommand(distributeOrBoolean.command)
    }
    if (distributeOrBoolean.message) {
      context.notify?.(distributeOrBoolean.message)
    }
    return true
  }

  return false
}
