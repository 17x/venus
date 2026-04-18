import type {EditorRuntimeCommand} from '@vector/runtime/worker'

const ALIGN_ACTION_MODE_MAP = {
  'align-left': 'left',
  'align-center-horizontal': 'hcenter',
  'align-right': 'right',
  'align-top': 'top',
  'align-middle': 'vcenter',
  'align-bottom': 'bottom',
} as const

const DISTRIBUTE_ACTION_MODE_MAP = {
  'distribute-horizontal': 'hspace',
  'distribute-vertical': 'vspace',
} as const

interface ShapeActionsContext {
  selectedShapeIds: string[]
  dispatchCommand: (command: EditorRuntimeCommand) => void
}

export function handleShapeActions(
  actionType: string,
  context: ShapeActionsContext,
) {
  if (actionType === 'convert-to-path' || actionType === 'convertToPath') {
    if (context.selectedShapeIds.length === 0) {
      return true
    }
    context.dispatchCommand({
      type: 'shape.convert-to-path',
      shapeIds: context.selectedShapeIds,
    })
    return true
  }

  if (actionType in ALIGN_ACTION_MODE_MAP) {
    if (context.selectedShapeIds.length < 2) {
      return true
    }

    context.dispatchCommand({
      type: 'shape.align',
      shapeIds: context.selectedShapeIds,
      mode: ALIGN_ACTION_MODE_MAP[actionType as keyof typeof ALIGN_ACTION_MODE_MAP],
      reference: 'selection',
    })
    return true
  }

  if (actionType in DISTRIBUTE_ACTION_MODE_MAP) {
    if (context.selectedShapeIds.length < 3) {
      return true
    }

    context.dispatchCommand({
      type: 'shape.distribute',
      shapeIds: context.selectedShapeIds,
      mode: DISTRIBUTE_ACTION_MODE_MAP[actionType as keyof typeof DISTRIBUTE_ACTION_MODE_MAP],
    })
    return true
  }

  return false
}
