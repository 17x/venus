import type {EditorRuntimeCommand} from '@vector/runtime/worker'
import {
  resolveConvertOrAlignShapeAction,
  resolveDistributeOrBooleanShapeAction,
} from '../useEditorRuntime.helpers.ts'

interface ShapeActionsContext {
  selectedShapeIds: string[]
  shapes?: import('@vector/model').DocumentNode[]
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
    shapes: context.shapes,
  })
  if (convertOrAlign.handled) {
    if (convertOrAlign.command) {
      context.dispatchCommand(convertOrAlign.command)
    }
    if (convertOrAlign.message) {
      context.notify?.(convertOrAlign.message)
    }
    return true
  }

  const distributeOrBoolean = resolveDistributeOrBooleanShapeAction({
    actionType,
    selectedShapeIds: context.selectedShapeIds,
    shapes: context.shapes,
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
