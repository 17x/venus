import {
  nid,
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
  type ToolName,
} from '@venus/document-core'
import {doNormalizedBoundsOverlap, getNormalizedBoundsFromBox} from '@vector/runtime/engine'
import type {ElementProps} from '@lite-u/editor/types'
import {
  collectResizeTransformTargets,
  createMarqueeState,
  createTransformPreviewShape,
  createTransformSessionShape,
  resolveDragStartTransformPayload,
  resolveSnappedTransformPreview,
  shouldClearSelectionOnPointerDown,
  shouldPreserveGroupDragSelection,
  type MarqueeApplyMode,
  type MarqueeSelectionMode,
} from '../../runtime/interaction/index.ts'
import type {RuntimeEditingMode} from '@vector/runtime'
import type {
  DraftPrimitive,
  DraftPrimitiveType,
  HandleKind,
  PathSubSelection,
} from '../interaction/index.ts'
import type {TransformBounds} from '../runtime-local/interaction/transformSessionManager.ts'
import type {
  SelectedElementProps,
  VisionFileType,
} from './useEditorRuntime.types.ts'
import {createShapeElementFromTool} from './editorRuntimeHelpers.ts'

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
  'marqueeSelecting',
])

export function resolveHoverHitTestOptions() {
  return {
    hitMode: 'bbox_then_exact' as const,
    maxExactCandidateCount: 3,
    allowFrameSelection: false,
    tolerance: 6,
    excludeClipBoundImage: true,
    clipTolerance: 1.5,
  }
}

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
  const resizeTargets = input.handleKind === 'rotate'
    ? input.selectedNodes
    : collectResizeTransformTargets(input.selectedNodes, input.interactionDocument)

  return {
    shapeIds: input.selectedNodes.map((shape) => shape.id),
    sessionShapes: resizeTargets.map((shape) => createTransformSessionShape(shape)),
    previewShapes: resizeTargets.map((shape) => createTransformPreviewShape(shape)),
    handle: input.handleKind,
    startBounds: input.selectedBounds,
    nextEditingMode: input.handleKind === 'rotate' ? 'rotating' as const : 'resizing' as const,
  }
}

export function resolveMarqueePointerDownState(input: {
  point: {x: number; y: number}
  modifiers?: RuntimePointerModifiersLike
  applyMode: MarqueeApplyMode
}) {
  return {
    marquee: createMarqueeState(
      input.point,
      resolveMarqueeSelectionMode(input.modifiers),
      {applyMode: input.applyMode},
    ),
    nextEditingMode: 'marqueeSelecting' as const,
    transitionReason: 'marquee-start',
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
}) {
  const dragStart = resolveDragStartTransformPayload(input.session, input.shapeById)
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

export function isClosedMaskShape(shape: DocumentNode | null | undefined) {
  return !!shape && (
    shape.type === 'rectangle' ||
    shape.type === 'ellipse' ||
    shape.type === 'polygon' ||
    shape.type === 'star' ||
    shape.type === 'path'
  )
}

export function boundsOverlap(
  left: DocumentNode,
  right: DocumentNode,
) {
  const leftBounds = getNormalizedBoundsFromBox(left.x, left.y, left.width, left.height)
  const rightBounds = getNormalizedBoundsFromBox(right.x, right.y, right.width, right.height)

  return doNormalizedBoundsOverlap(leftBounds, rightBounds)
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
  }
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

export function formatSelectionNames(
  document: EditorDocument,
  selectedIds: string[],
) {
  if (selectedIds.length === 0) {
    return 'None'
  }

  const names = selectedIds
    .map((id) => document.shapes.find((shape) => shape.id === id)?.name)
    .filter((name): name is string => Boolean(name))

  if (names.length === 0) {
    return `${selectedIds.length} selected`
  }
  if (names.length <= 3) {
    return names.join(', ')
  }

  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`
}

export function resolveSelectedProps(
  selectedProps: SelectedElementProps | null,
  selectedNode: DocumentNode | null,
  file: VisionFileType | null,
): SelectedElementProps | null {
  if (!selectedProps) {
    return null
  }

  if (!selectedNode || selectedNode.type !== 'image') {
    return selectedProps
  }

  const asset = file?.assets?.find((item) => item.id === selectedNode.assetId)
  const imageRef = asset?.imageRef as {naturalWidth?: number; naturalHeight?: number} | undefined

  return {
    ...selectedProps,
    schemaMeta: selectedNode.schema
      ? {
          sourceNodeType: selectedNode.schema.sourceNodeType,
          sourceNodeKind: selectedNode.schema.sourceNodeKind,
          sourceFeatureKinds: selectedNode.schema.sourceFeatureKinds?.slice(),
        }
      : selectedProps.schemaMeta,
    imageMeta: {
      assetId: selectedNode.assetId,
      assetName: asset?.name,
      mimeType: asset?.mimeType,
      naturalWidth: imageRef?.naturalWidth,
      naturalHeight: imageRef?.naturalHeight,
    },
  }
}

export function isPathSubSelectionEqual(
  left: PathSubSelection | null,
  right: PathSubSelection | null,
) {
  if (left === right) {
    return true
  }
  if (!left || !right) {
    return false
  }
  if (left.shapeId !== right.shapeId || left.hitType !== right.hitType) {
    return false
  }

  const leftAnchor = left.anchorPoint
  const rightAnchor = right.anchorPoint
  if (leftAnchor || rightAnchor) {
    if (!leftAnchor || !rightAnchor) {
      return false
    }
    if (
      leftAnchor.index !== rightAnchor.index ||
      leftAnchor.x !== rightAnchor.x ||
      leftAnchor.y !== rightAnchor.y ||
      leftAnchor.segmentType !== rightAnchor.segmentType
    ) {
      return false
    }
  }

  const leftSegment = left.segment
  const rightSegment = right.segment
  if (leftSegment || rightSegment) {
    if (!leftSegment || !rightSegment) {
      return false
    }
    if (
      leftSegment.index !== rightSegment.index ||
      leftSegment.x !== rightSegment.x ||
      leftSegment.y !== rightSegment.y ||
      leftSegment.segmentType !== rightSegment.segmentType
    ) {
      return false
    }
  }

  const leftHandle = left.handlePoint
  const rightHandle = right.handlePoint
  if (leftHandle || rightHandle) {
    if (!leftHandle || !rightHandle) {
      return false
    }
    if (
      leftHandle.anchorIndex !== rightHandle.anchorIndex ||
      leftHandle.handleType !== rightHandle.handleType ||
      leftHandle.x !== rightHandle.x ||
      leftHandle.y !== rightHandle.y
    ) {
      return false
    }
  }

  return true
}

export interface HoverHitBudgetState {
  lastAt: number
  lastPoint: {x: number; y: number} | null
}

export function shouldResolveHoverHit(
  point: {x: number; y: number},
  budget: HoverHitBudgetState,
  options: {
    minIntervalMs: number
    minDistancePx: number
    now?: number
  },
) {
  const now = options.now ?? performance.now()
  const elapsedMs = now - budget.lastAt
  const previousPoint = budget.lastPoint
  const movedDistance = previousPoint
    ? Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y)
    : Number.POSITIVE_INFINITY

  if (
    elapsedMs < options.minIntervalMs &&
    movedDistance < options.minDistancePx
  ) {
    return {
      shouldResolve: false,
      nextBudget: budget,
    }
  }

  return {
    shouldResolve: true,
    nextBudget: {
      lastAt: now,
      lastPoint: point,
    } satisfies HoverHitBudgetState,
  }
}

export function resolveMarqueeSelectionMode(
  modifiers?: RuntimePointerModifiersLike,
): MarqueeSelectionMode {
  if (modifiers?.shiftKey) {
    return 'add'
  }

  if (modifiers?.altKey) {
    return 'remove'
  }

  if (modifiers?.metaKey || modifiers?.ctrlKey) {
    return 'toggle'
  }

  return 'replace'
}

export function resolvePointerDownPathSubSelectionState(
  nextPathSubSelection: PathSubSelection | null,
) {
  if (!nextPathSubSelection) {
    return null
  }

  const pathHandleDrag =
    (nextPathSubSelection.hitType === 'inHandle' || nextPathSubSelection.hitType === 'outHandle') &&
    nextPathSubSelection.handlePoint
      ? {
          shapeId: nextPathSubSelection.shapeId,
          anchorIndex: nextPathSubSelection.handlePoint.anchorIndex,
          handleType: nextPathSubSelection.handlePoint.handleType,
        }
      : null

  return {
    pathHandleDrag,
    pathSubSelection: nextPathSubSelection,
    pathSubSelectionHover: nextPathSubSelection,
  }
}