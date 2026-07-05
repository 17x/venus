import {
  nid,
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
  type ToolName,
} from '../model/index.ts'
import type {ElementProps} from '../types/index.ts'
import {
  collectTransformLeafTargets,
  createTransformPreviewShape,
  createTransformSessionShape,
  resolveDragStartTransformPayload,
  resolveSnappedTransformPreview,
  shouldClearSelectionOnPointerDown,
  shouldPreserveGroupDragSelection,
} from '../interaction/index.ts'
import type {RuntimeEditingMode} from '../index.ts'
import type {EditorRuntimeCommand} from '../worker/index.ts'
import type {
  DraftPrimitive,
  DraftPrimitiveType,
  HandleKind,
  PathSubSelection,
} from '../interaction/index.ts'
import {
  expandMaskLinkedShapeIds,
} from '../interaction/maskGroup.ts'
import type {TransformBounds} from '../interaction/transformSessionManager.ts'
import {cloneElementProps, createShapeElementFromTool} from '../editorRuntimeHelpers/editorRuntimeHelpers.ts'
import {isPathSubSelectionEqual} from './selectionAndCommands.ts'

export interface RuntimePointerModifiersLike {
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}

const HOVER_GATED_EDITING_MODES: ReadonlySet<RuntimeEditingMode> = new Set([
  'dragging',
  'resizing',
  'rotating',
  'panning',
  'zooming',
])

export {
  resolveHoverHitTestOptions,
  resolveHoverSelectorQueryOptions,
  resolveRuntimeCommandSideEffects,
  resolveAutoMaskAction,
  resolveClearMaskAction,
  resolveGroupIsolationTarget,
  resolveMaskSelectionCommand,
} from '../product/commandResolvers.ts'

export type {RuntimeMaskSelectionTarget} from '../product/commandResolvers.ts'

export function resolveSelectionPointerDownHitOptions(input: {
  currentTool: 'selector' | 'dselector'
  hoveredShapeId: string | null
  modifiers?: RuntimePointerModifiersLike
}) {
  return {
    hitShapeId: input.hoveredShapeId,
    preferGroupSelection:
      input.currentTool === 'selector' &&
      !(input.modifiers?.metaKey || input.modifiers?.ctrlKey),
  }
}

export function shouldClearSelectionOnSelectorPointerDown(input: {
  point: {x: number; y: number}
  selectedBounds: TransformBounds | null
  selectedNodes: DocumentNode[]
  singleSelectedRotation: number
  shapeById: Map<string, DocumentNode>
  tolerance: number
}) {
  return shouldClearSelectionOnPointerDown(input.point, {
    selectedBounds: input.selectedBounds,
    selectedNodes: input.selectedNodes,
    singleSelectedRotation: input.singleSelectedRotation,
    shapeById: input.shapeById,
    tolerance: input.tolerance,
  })
}

export function shouldPreserveGroupDragSelectionOnPointerDown(input: {
  modifiers?: RuntimePointerModifiersLike
  hoveredShapeId: string | null
  selectedNodes: DocumentNode[]
  shapeById: Map<string, DocumentNode>
}) {
  return shouldPreserveGroupDragSelection({
    modifiers: input.modifiers,
    hoveredShapeId: input.hoveredShapeId,
    selectedNodes: input.selectedNodes,
    shapeById: input.shapeById,
  })
}

export function resolveTransformHandlePointerDownState(input: {
  handleKind: HandleKind
  selectedNodes: DocumentNode[]
  selectedBounds: TransformBounds
  interactionDocument: EditorDocument
}) {
  const transformTargets = collectTransformLeafTargets(input.selectedNodes, input.interactionDocument)

  return {
    shapeIds: input.selectedNodes.map((shape) => shape.id),
    sessionShapes: transformTargets.map((shape) => createTransformSessionShape(shape)),
    previewShapes: transformTargets.map((shape) => createTransformPreviewShape(shape)),
    handle: input.handleKind,
    startBounds: input.selectedBounds,
    nextEditingMode: input.handleKind === 'rotate' ? 'rotating' as const : 'resizing' as const,
  }
}

export function resolveDraftPrimitivePointerDownState(input: {
  point: {x: number; y: number}
  draftPrimitiveType: DraftPrimitiveType
  currentTool: ToolName
}) {
  return {
    draftPrimitive: {
      id: nid(),
      type: input.draftPrimitiveType,
      points: [input.point, input.point],
      bounds: {
        minX: input.point.x,
        minY: input.point.y,
        maxX: input.point.x,
        maxY: input.point.y,
      },
    },
    nextEditingMode: 'insertingShape' as const,
    transitionReason: `draft-shape:${input.currentTool}`,
  }
}

export function resolveInsertShapePointerDownState(input: {
  currentTool: ToolName
  point: {x: number; y: number}
}) {
  const shape = createShapeElementFromTool(input.currentTool, input.point)
  if (!shape) {
    return null
  }

  return {
    shape,
    nextEditingMode: 'insertingShape' as const,
    transitionReason: `insert-shape:${input.currentTool}`,
  }
}

export function resolvePenPointerDownState(input: {
  currentTool: ToolName
}) {
  return {
    nextEditingMode: input.currentTool === 'path' ? 'drawingPath' as const : 'drawingPencil' as const,
    transitionReason: `draw-start:${input.currentTool}`,
  }
}

export function shouldGateHoverForEditingMode(
  editingMode: RuntimeEditingMode | null | undefined,
) {
  return Boolean(editingMode && HOVER_GATED_EDITING_MODES.has(editingMode))
}

export function resolveSelectionDragMoveStartState(input: {
  session: Parameters<typeof resolveDragStartTransformPayload>[0]
  shapeById: Parameters<typeof resolveDragStartTransformPayload>[1]
  interactionDocument: Parameters<typeof resolveDragStartTransformPayload>[2]
}) {
  const dragStart = resolveDragStartTransformPayload(input.session, input.shapeById, input.interactionDocument)
  if (!dragStart) {
    return null
  }

  return {
    ...dragStart,
    handle: 'move' as const,
    activeTransformHandle: 'move' as const,
    nextEditingMode: 'dragging' as const,
    transitionReason: 'selection-drag-start',
  }
}

export function resolveSelectionDragMovePreviewState(input: {
  preview: Parameters<typeof resolveSnappedTransformPreview>[0]
  handle: Parameters<typeof resolveSnappedTransformPreview>[1]['handle']
  snappingEnabled: Parameters<typeof resolveSnappedTransformPreview>[1]['snappingEnabled']
  previewDocument: Parameters<typeof resolveSnappedTransformPreview>[1]['previewDocument']
}) {
  const resolved = resolveSnappedTransformPreview(input.preview, {
    handle: input.handle,
    snappingEnabled: input.snappingEnabled,
    previewDocument: input.previewDocument,
  })

  return {
    snapGuides: resolved.guides,
    transformPreview: resolved.preview,
  }
}

export function resolvePointerMovePathSubSelectionHoverState(
  nextPathSubSelectionHover: PathSubSelection | null,
) {
  return (current: PathSubSelection | null) => {
    return isPathSubSelectionEqual(current, nextPathSubSelectionHover)
      ? current
      : nextPathSubSelectionHover
  }
}

export function resolvePathHandleDragPointerMoveState(input: {
  shapeId: string
  anchorIndex: number
  handleType: 'inHandle' | 'outHandle'
  point: {x: number; y: number}
}) {
  return {
    shapeId: input.shapeId,
    hitType: input.handleType,
    handlePoint: {
      anchorIndex: input.anchorIndex,
      handleType: input.handleType,
      x: input.point.x,
      y: input.point.y,
    },
  } satisfies PathSubSelection
}

export function resolveDraftPrimitivePointerMoveState(input: {
  current: DraftPrimitive
  point: {x: number; y: number}
}): DraftPrimitive {
  const start = input.current.points[0] ?? input.point

  return {
    ...input.current,
    points: [start, input.point],
    bounds: {
      minX: Math.min(start.x, input.point.x),
      minY: Math.min(start.y, input.point.y),
      maxX: Math.max(start.x, input.point.x),
      maxY: Math.max(start.y, input.point.y),
    },
  }
}

export function toElementPropsFromNode(selectedNode: DocumentNode): ElementProps {
  return {
    id: selectedNode.id,
    type: selectedNode.type,
    name: selectedNode.text ?? selectedNode.name,
    asset: selectedNode.assetId,
    assetUrl: selectedNode.assetUrl,
    clipPathId: selectedNode.clipPathId,
    clipRule: selectedNode.clipRule,
    x: selectedNode.x,
    y: selectedNode.y,
    width: selectedNode.width,
    height: selectedNode.height,
    rotation: selectedNode.rotation ?? 0,
    flipX: selectedNode.flipX ?? false,
    flipY: selectedNode.flipY ?? false,
    points: selectedNode.points?.map((point) => ({...point})),
    bezierPoints: selectedNode.bezierPoints?.map((point) => ({
      anchor: {...point.anchor},
      cp1: point.cp1 ? {...point.cp1} : point.cp1,
      cp2: point.cp2 ? {...point.cp2} : point.cp2,
    })),
    strokeStartArrowhead: selectedNode.strokeStartArrowhead,
    strokeEndArrowhead: selectedNode.strokeEndArrowhead,
    fill: selectedNode.fill ? {...selectedNode.fill} : undefined,
    stroke: selectedNode.stroke ? {...selectedNode.stroke} : undefined,
    shadow: selectedNode.shadow ? {...selectedNode.shadow} : undefined,
    cornerRadius: selectedNode.cornerRadius,
    cornerRadii: selectedNode.cornerRadii ? {...selectedNode.cornerRadii} : undefined,
    ellipseStartAngle: selectedNode.ellipseStartAngle,
    ellipseEndAngle: selectedNode.ellipseEndAngle,
    maskGroupId: selectedNode.schema?.maskGroupId,
    maskRole: selectedNode.schema?.maskRole,
  }
}

export function resolveSelectedNonFrameElementProps(input: {
  shapes: DocumentNode[]
  selectedShapeIds: string[]
  clone?: boolean
}) {
  const selectedSet = new Set(expandMaskLinkedShapeIds({
    id: 'selection-elements',
    name: 'selection-elements',
    width: 0,
    height: 0,
    shapes: input.shapes,
  }, input.selectedShapeIds))
  const elements = input.shapes
    .filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')
    .map((shape) => toElementPropsFromNode(shape))

  return input.clone ? elements.map((element) => cloneElementProps(element)) : elements
}

export function resolvePathHandlePreviewDocument(
  document: EditorDocument,
  pathHandleDrag: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null,
  pathSubSelectionHover: PathSubSelection | null,
) {
  if (!pathHandleDrag || pathSubSelectionHover?.hitType !== pathHandleDrag.handleType || !pathSubSelectionHover.handlePoint) {
    return document
  }
  const hoveredHandlePoint = pathSubSelectionHover.handlePoint

  const shape = document.shapes.find((item) => item.id === pathHandleDrag.shapeId)
  if (!shape || shape.type !== 'path' || !Array.isArray(shape.bezierPoints) || shape.bezierPoints.length === 0) {
    return document
  }

  const nextBezierPoints: BezierPoint[] = shape.bezierPoints.map((item, index) => {
    if (index !== pathHandleDrag.anchorIndex) {
      return {
        anchor: {...item.anchor},
        cp1: item.cp1 ? {...item.cp1} : item.cp1,
        cp2: item.cp2 ? {...item.cp2} : item.cp2,
      }
    }

    return {
      anchor: {...item.anchor},
      cp1: pathHandleDrag.handleType === 'inHandle'
        ? {x: hoveredHandlePoint.x, y: hoveredHandlePoint.y}
        : (item.cp1 ? {...item.cp1} : item.cp1),
      cp2: pathHandleDrag.handleType === 'outHandle'
        ? {x: hoveredHandlePoint.x, y: hoveredHandlePoint.y}
        : (item.cp2 ? {...item.cp2} : item.cp2),
    }
  })
  const bounds = getBoundingRectFromBezierPoints(nextBezierPoints)

  return {
    ...document,
    shapes: document.shapes.map((item) => item.id === shape.id
      ? {
          ...item,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          bezierPoints: nextBezierPoints,
        }
      : item),
  }
}

export function resolveCommittedPathBezierPoints(input: {
  shape: DocumentNode
  anchorIndex: number
  handleType: 'inHandle' | 'outHandle'
  point: {x: number; y: number}
}) {
  if (input.shape.type !== 'path' || !Array.isArray(input.shape.bezierPoints) || input.shape.bezierPoints.length === 0) {
    return null
  }

  return input.shape.bezierPoints.map((item, index) => {
    if (index !== input.anchorIndex) {
      return {
        anchor: {...item.anchor},
        cp1: item.cp1 ? {...item.cp1} : item.cp1,
        cp2: item.cp2 ? {...item.cp2} : item.cp2,
      }
    }

    return {
      anchor: {...item.anchor},
      cp1: input.handleType === 'inHandle'
        ? {x: input.point.x, y: input.point.y}
        : (item.cp1 ? {...item.cp1} : item.cp1),
      cp2: input.handleType === 'outHandle'
        ? {x: input.point.x, y: input.point.y}
        : (item.cp2 ? {...item.cp2} : item.cp2),
    }
  })
}

export function resolveReorderedShapeIndex(input: {
  direction: 'up' | 'down' | 'top' | 'bottom'
  index: number
  shapeCount: number
}) {
  if (input.index <= 0) {
    return null
  }

  const maxIndex = Math.max(1, input.shapeCount - 1)
  let nextIndex = input.index

  if (input.direction === 'up') {
    nextIndex = Math.min(maxIndex, input.index + 1)
  } else if (input.direction === 'down') {
    nextIndex = Math.max(1, input.index - 1)
  } else if (input.direction === 'top') {
    nextIndex = maxIndex
  } else if (input.direction === 'bottom') {
    nextIndex = 1
  }

  return nextIndex === input.index ? null : nextIndex
}

export function resolveHistoryNavigationCommands(input: {
  targetHistoryId: number
  currentCursor: number
}): EditorRuntimeCommand[] {
  const diff = input.targetHistoryId - input.currentCursor

  if (diff === 0) {
    return []
  }

  const command = diff > 0
    ? {type: 'history.redo'} as const
    : {type: 'history.undo'} as const

  return Array.from({length: Math.abs(diff)}, () => command)
}

export {
  resolveDirectExecuteActionCommand,
  resolveReorderDirectionFromExecuteAction,
  resolveElementMoveDelta,
  resolveSelectionMoveCommand,
  resolvePastedElements,
  resolveDuplicatedElements,
  resolveSelectionModifyCommand,
  resolveDroppedImageElement,
  resolveViewportShiftFromExecuteAction,
  resolveViewportZoomFromExecuteAction,
} from '../product/actionResolvers.ts'

export {
  resolveConvertOrAlignShapeAction,
  resolveDistributeOrBooleanShapeAction,
} from '../product/shapeActionResolvers.ts'

export {
  resolveElementModifyCommands,
  resolveGroupableShapeIds,
  resolveSelectedGroups,
  resolveIsolationShapeIdSet,
  filterDocumentToShapeSet,
  filterSnapshotsToShapeSet,
  formatSelectionNames,
  resolveSelectedProps,
  shouldResolveHoverHit,
  resolvePointerDownPathSubSelectionState,
} from './selectionAndCommands.ts'

export type {HoverHitBudgetState} from './selectionAndCommands.ts'
