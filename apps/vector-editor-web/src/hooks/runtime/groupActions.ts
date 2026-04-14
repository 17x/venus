import type {DocumentNode} from '@venus/document-core'
import type {EditorRuntimeCommand} from '@venus/runtime/worker'

interface GroupActionContext {
  selectedShapeIds: string[]
  shapes: DocumentNode[]
  dispatchCommand: (command: EditorRuntimeCommand) => void
  notify: (message: string) => void
}

export function handleGroupNodesAction(context: GroupActionContext) {
  const selectedShapeMap = new Map(context.shapes.map((shape) => [shape.id, shape]))
  const groupableIds = context.selectedShapeIds.filter((shapeId) => {
    const shape = context.shapes.find((item) => item.id === shapeId)
    if (!shape || shape.type === 'frame') {
      return false
    }

    let parentId = shape.parentId
    while (parentId) {
      if (context.selectedShapeIds.includes(parentId)) {
        return false
      }
      parentId = selectedShapeMap.get(parentId)?.parentId ?? null
    }

    return true
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
  const selectedGroups = context.selectedShapeIds
    .map((shapeId) => context.shapes.find((item) => item.id === shapeId))
    .filter((shape): shape is DocumentNode => Boolean(shape && shape.type === 'group'))

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
