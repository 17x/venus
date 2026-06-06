import type {SelectorQueryOptions} from '@venus/editor-primitive'
import {
  doNormalizedBoundsOverlap,
  getNormalizedBoundsFromBox,
} from '../../runtime/engine-bridge/engine.ts'
import type {
  DocumentNode,
  EditorDocument,
} from '../../runtime/model/index.ts'
import type {EditorRuntimeCommand} from '../../runtime/worker/index.ts'

export type RuntimeMaskSelectionTarget = 'host' | 'source'

const HOVER_GATED_HIT_CANDIDATE_COUNT = 8

/**
 * Resolves default runtime hover hit-test policy shared by pointer controllers.
 */
export function resolveHoverHitTestOptions(options?: {
  tolerance?: number
  clipTolerance?: number
}) {
  return {
    hitMode: 'exact' as const,
    maxExactCandidateCount: HOVER_GATED_HIT_CANDIDATE_COUNT,
    allowFrameSelection: false,
    tolerance: options?.tolerance ?? 6,
    // Keep the clipped host as the outer selectable element.
    excludeClipBoundImage: false,
    clipTolerance: options?.clipTolerance ?? 1.5,
  }
}

/**
 * Resolves selector query defaults so hover/click use one consistent tolerance model.
 */
export function resolveHoverSelectorQueryOptions(options?: {
  tolerancePx?: number
}): SelectorQueryOptions {
  return {
    mode: 'intersect',
    tolerancePx: options?.tolerancePx ?? 6,
    includeLocked: false,
    includeHidden: false,
  }
}

/**
 * Resolves runtime command side-effects before dispatching to worker/runtime bridge.
 */
export function resolveRuntimeCommandSideEffects(command: EditorRuntimeCommand) {
  if (command.type === 'snapping.pause') {
    return {
      nextSnappingEnabled: false,
      clearSnapGuides: true,
      resetTransientInteractionState: false,
      shouldDispatch: false,
    }
  }

  if (command.type === 'snapping.resume') {
    return {
      nextSnappingEnabled: true,
      clearSnapGuides: false,
      resetTransientInteractionState: false,
      shouldDispatch: false,
    }
  }

  if (
    command.type === 'group.enter-isolation' ||
    command.type === 'group.exit-isolation' ||
    command.type === 'mask.create' ||
    command.type === 'mask.release' ||
    command.type === 'mask.select-host' ||
    command.type === 'mask.select-source' ||
    command.type === 'selection.cycle-hit-target'
  ) {
    return {
      nextSnappingEnabled: null,
      clearSnapGuides: false,
      resetTransientInteractionState: false,
      shouldDispatch: false,
    }
  }

  const resetTransientInteractionState = command.type === 'history.undo' || command.type === 'history.redo'

  return {
    nextSnappingEnabled: null,
    clearSnapGuides: resetTransientInteractionState,
    resetTransientInteractionState,
    shouldDispatch: true,
  }
}

/**
 * Resolves auto-mask action by inferring host/source pair from overlap heuristics.
 */
export function resolveAutoMaskAction(input: {
  canvasShapes: EditorDocument['shapes']
  selectedNode: DocumentNode | null
}) {
  if (!input.selectedNode || input.selectedNode.type === 'frame' || input.selectedNode.type === 'group') {
    return {
      message: 'Select an image or a closed shape to create a mask.',
    }
  }

  const otherShapes = input.canvasShapes.filter((shape) =>
    shape.id !== input.selectedNode?.id &&
    shape.type !== 'frame' &&
    shape.type !== 'group',
  )

  if (input.selectedNode.type === 'image') {
    const candidates = otherShapes.filter((shape) =>
      isClosedMaskShape(shape) && boundsOverlap(input.selectedNode!, shape),
    )

    if (candidates.length !== 1) {
      return {
        message: candidates.length === 0
          ? 'No single closed shape overlaps this image.'
          : 'Multiple closed shapes overlap this image. Narrow the target first.',
      }
    }

    return {
      command: {
        type: 'shape.set-clip' as const,
        shapeId: input.selectedNode.id,
        clipPathId: candidates[0].id,
        clipRule: 'nonzero' as const,
      },
      message: `Masked with ${candidates[0].name}.`,
    }
  }

  if (isClosedMaskShape(input.selectedNode)) {
    const candidates = otherShapes.filter((shape) =>
      shape.type === 'image' && boundsOverlap(input.selectedNode!, shape),
    )

    if (candidates.length !== 1) {
      return {
        message: candidates.length === 0
          ? 'No single image overlaps this shape.'
          : 'Multiple images overlap this shape. Narrow the target first.',
      }
    }

    return {
      command: {
        type: 'shape.set-clip' as const,
        shapeId: candidates[0].id,
        clipPathId: input.selectedNode.id,
        clipRule: 'nonzero' as const,
      },
      message: `Masked ${candidates[0].name} with ${input.selectedNode.name}.`,
    }
  }

  return {
    message: 'Only images and closed shapes can participate in masking.',
  }
}

/**
 * Resolves clear-mask action for currently selected image node.
 */
export function resolveClearMaskAction(selectedNode: DocumentNode | null) {
  if (!selectedNode || selectedNode.type !== 'image') {
    return {
      message: 'Select an image to clear its mask.',
    }
  }

  if (!selectedNode.clipPathId) {
    return {
      message: 'This image does not have an active mask.',
    }
  }

  return {
    command: {
      type: 'shape.set-clip' as const,
      shapeId: selectedNode.id,
      clipPathId: undefined,
      clipRule: undefined,
    },
    message: 'Image mask cleared.',
  }
}

/**
 * Resolves group isolation target from explicit group id or current group selection.
 */
export function resolveGroupIsolationTarget(input: {
  groupId?: string
  selectedShapeIds: string[]
  shapes: DocumentNode[]
}) {
  if (input.groupId) {
    const selectedGroup = input.shapes.find((shape) => shape.id === input.groupId && shape.type === 'group')
    return selectedGroup?.id ?? null
  }

  return resolveSelectedGroups({
    selectedShapeIds: input.selectedShapeIds,
    shapes: input.shapes,
  })[0]?.id ?? null
}

/**
 * Resolves host/source mask-selection command from current selected node.
 */
export function resolveMaskSelectionCommand(input: {
  selectedNode: DocumentNode | null
  canvasShapes: EditorDocument['shapes']
  target: RuntimeMaskSelectionTarget
}) {
  const selectedNode = input.selectedNode
  if (!selectedNode) {
    return {
      message: 'Select a masked image or its mask source first.',
    }
  }

  if (input.target === 'host') {
    const maskGroupId = selectedNode.schema?.maskGroupId
    if (maskGroupId) {
      const maskHost = input.canvasShapes.find((shape) => shape.schema?.maskGroupId === maskGroupId && shape.schema?.maskRole === 'host')
      if (maskHost) {
        return {
          command: {
            type: 'selection.set' as const,
            shapeIds: [maskHost.id],
            mode: 'replace' as const,
            preserveExactShapeIds: true,
          },
          message: `Selected host ${maskHost.name}.`,
        }
      }
    }

    if (selectedNode.type === 'image' && selectedNode.clipPathId) {
      return {
        command: {
          type: 'selection.set' as const,
          shapeIds: [selectedNode.id],
          mode: 'replace' as const,
          preserveExactShapeIds: true,
        },
        message: `Selected host ${selectedNode.name}.`,
      }
    }

    const hostImage = input.canvasShapes.find((shape) => shape.type === 'image' && shape.clipPathId === selectedNode.id)
    if (hostImage) {
      return {
        command: {
          type: 'selection.set' as const,
          shapeIds: [hostImage.id],
          mode: 'replace' as const,
          preserveExactShapeIds: true,
        },
        message: `Selected host ${hostImage.name}.`,
      }
    }

    return {
      message: 'No masked host found for the current selection.',
    }
  }

  const maskGroupId = selectedNode.schema?.maskGroupId
  if (maskGroupId) {
    const maskSource = input.canvasShapes.find((shape) => shape.schema?.maskGroupId === maskGroupId && shape.schema?.maskRole === 'source')
    if (maskSource) {
      return {
        command: {
          type: 'selection.set' as const,
          shapeIds: [maskSource.id],
          mode: 'replace' as const,
          preserveExactShapeIds: true,
        },
        message: `Selected mask source ${maskSource.name}.`,
      }
    }
  }

  if (selectedNode.type === 'image' && selectedNode.clipPathId) {
    return {
      command: {
        type: 'selection.set' as const,
        shapeIds: [selectedNode.clipPathId],
        mode: 'replace' as const,
        preserveExactShapeIds: true,
      },
      message: 'Selected mask source.',
    }
  }

  const clipShape = input.canvasShapes.find((shape) => shape.type !== 'image' && shape.id === selectedNode.id)
  if (clipShape) {
    return {
      command: {
        type: 'selection.set' as const,
        shapeIds: [clipShape.id],
        mode: 'replace' as const,
        preserveExactShapeIds: true,
      },
      message: `Selected mask source ${clipShape.name}.`,
    }
  }

  return {
    message: 'No mask source found for the current selection.',
  }
}

/**
 * Determines whether one shape can act as closed mask source.
 */
function isClosedMaskShape(shape: DocumentNode | null | undefined) {
  return !!shape && (
    shape.type === 'rectangle' ||
    shape.type === 'ellipse' ||
    shape.type === 'polygon' ||
    shape.type === 'star' ||
    shape.type === 'path'
  )
}

/**
 * Resolves normalized bounds overlap used by auto-mask candidate detection.
 */
function boundsOverlap(left: DocumentNode, right: DocumentNode) {
  const leftBounds = getNormalizedBoundsFromBox(left.x, left.y, left.width, left.height)
  const rightBounds = getNormalizedBoundsFromBox(right.x, right.y, right.width, right.height)

  return doNormalizedBoundsOverlap(leftBounds, rightBounds)
}

/**
 * Resolves selected group nodes used as default isolation target candidates.
 */
function resolveSelectedGroups(input: {
  selectedShapeIds: string[]
  shapes: DocumentNode[]
}) {
  const shapeById = new Map(input.shapes.map((shape) => [shape.id, shape]))

  return input.selectedShapeIds
    .map((shapeId) => shapeById.get(shapeId))
    .filter((shape): shape is DocumentNode => Boolean(shape && shape.type === 'group'))
}
