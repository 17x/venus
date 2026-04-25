import type {DocumentNode} from '@vector/model'
import type {EditorRuntimeCommand} from '@vector/runtime/worker'
import {resolveGroupableShapeIds, resolveSelectedGroups} from '../useEditorRuntime.helpers.ts'

interface GroupActionContext {
  selectedShapeIds: string[]
  shapes: DocumentNode[]
  dispatchCommand: (command: EditorRuntimeCommand) => void
  notify: (message: string) => void
}

export function handleGroupNodesAction(context: GroupActionContext) {
  const groupableIds = resolveGroupableShapeIds({
    selectedShapeIds: context.selectedShapeIds,
    shapes: context.shapes,
  })

  if (groupableIds.length < 2) {
    context.notify('Select at least two elements to group.')
    return true
  }

  context.dispatchCommand({
    type: 'shape.group',
    shapeIds: groupableIds,
  })
  return true
}

export function handleUngroupNodesAction(context: GroupActionContext) {
  const selectedGroups = resolveSelectedGroups({
    selectedShapeIds: context.selectedShapeIds,
    shapes: context.shapes,
  })

  if (selectedGroups.length === 0) {
    context.notify('Select a group to ungroup.')
    return true
  }

  selectedGroups.forEach((groupShape) => {
    // Keep each ungroup command atomic so undo/redo remains predictable.
    context.dispatchCommand({
      type: 'shape.ungroup',
      groupId: groupShape.id,
    })
  })

  return true
}
