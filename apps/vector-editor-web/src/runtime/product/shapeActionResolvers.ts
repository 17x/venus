import {expandMaskLinkedShapeIds, includesMaskLinkedShapeIds} from '../../runtime/interaction/maskGroup.ts'
import type {DocumentNode} from '../../runtime/model/index.ts'

/**
 * Resolves convert-to-path and align actions into runtime commands.
 */
export function resolveConvertOrAlignShapeAction(input: {
  actionType: string
  selectedShapeIds: string[]
  shapes?: DocumentNode[]
}) {
  if (input.actionType === 'convert-to-path' || input.actionType === 'convertToPath') {
    if (input.selectedShapeIds.length === 0) {
      return {handled: true as const}
    }

    const document = input.shapes
      ? {
          id: 'runtime-actions',
          name: 'runtime-actions',
          width: 0,
          height: 0,
          shapes: input.shapes,
        }
      : null
    if (document && includesMaskLinkedShapeIds(document, input.selectedShapeIds)) {
      return {
        handled: true as const,
        message: 'Convert to path is unavailable for masked images or mask sources.',
      }
    }

    return {
      handled: true as const,
      command: {
        type: 'shape.convert-to-path' as const,
        shapeIds: input.selectedShapeIds,
      },
    }
  }

  const alignModeMap = {
    'align-left': 'left',
    'align-center-horizontal': 'hcenter',
    'align-right': 'right',
    'align-top': 'top',
    'align-middle': 'vcenter',
    'align-bottom': 'bottom',
  } as const

  if (input.actionType in alignModeMap) {
    if (input.selectedShapeIds.length < 2) {
      return {handled: true as const}
    }

    const expandedSelectedShapeIds = input.shapes
      ? expandMaskLinkedShapeIds({
          id: 'runtime-actions',
          name: 'runtime-actions',
          width: 0,
          height: 0,
          shapes: input.shapes,
        }, input.selectedShapeIds)
      : input.selectedShapeIds

    return {
      handled: true as const,
      command: {
        type: 'shape.align' as const,
        shapeIds: expandedSelectedShapeIds,
        mode: alignModeMap[input.actionType as keyof typeof alignModeMap],
        reference: 'selection' as const,
      },
    }
  }

  return {handled: false as const}
}

/**
 * Resolves distribute and boolean shape actions into runtime commands.
 */
export function resolveDistributeOrBooleanShapeAction(input: {
  actionType: string
  selectedShapeIds: string[]
  shapes?: DocumentNode[]
}) {
  const distributeModeMap = {
    'distribute-horizontal': 'hspace',
    'distribute-vertical': 'vspace',
  } as const

  if (input.actionType in distributeModeMap) {
    if (input.selectedShapeIds.length < 3) {
      return {handled: true as const}
    }

    const expandedSelectedShapeIds = input.shapes
      ? expandMaskLinkedShapeIds({
          id: 'runtime-actions',
          name: 'runtime-actions',
          width: 0,
          height: 0,
          shapes: input.shapes,
        }, input.selectedShapeIds)
      : input.selectedShapeIds

    return {
      handled: true as const,
      command: {
        type: 'shape.distribute' as const,
        shapeIds: expandedSelectedShapeIds,
        mode: distributeModeMap[input.actionType as keyof typeof distributeModeMap],
      },
    }
  }

  const booleanModeMap = {
    'boolean-union': 'union',
    booleanUnion: 'union',
    'boolean-subtract': 'subtract',
    booleanSubtract: 'subtract',
    'boolean-intersect': 'intersect',
    booleanIntersect: 'intersect',
  } as const

  if (input.actionType in booleanModeMap) {
    if (input.selectedShapeIds.length < 2) {
      return {handled: true as const}
    }

    const document = input.shapes
      ? {
          id: 'runtime-actions',
          name: 'runtime-actions',
          width: 0,
          height: 0,
          shapes: input.shapes,
        }
      : null
    if (document && includesMaskLinkedShapeIds(document, input.selectedShapeIds)) {
      return {
        handled: true as const,
        message: 'Boolean operations are unavailable for masked images or mask sources.',
      }
    }

    return {
      handled: true as const,
      command: {
        type: 'shape.boolean' as const,
        shapeIds: input.selectedShapeIds,
        mode: booleanModeMap[input.actionType as keyof typeof booleanModeMap],
      },
      message: 'Boolean command dispatched.',
    }
  }

  return {handled: false as const}
}
