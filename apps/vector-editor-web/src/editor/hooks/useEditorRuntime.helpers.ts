import {
  nid,
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
  type ToolName,
} from '@vector/model'
import {doNormalizedBoundsOverlap, getNormalizedBoundsFromBox} from '@vector/runtime/engine'
import type {ElementProps} from '@lite-u/editor/types'
import {
  collectResizeTransformTargets,
  createTransformBatchCommand,
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
import type {EditorRuntimeCommand} from '@vector/runtime/worker'
import type {
  DraftPrimitive,
  DraftPrimitiveType,
  HandleKind,
  PathSubSelection,
} from '../interaction/index.ts'
import {
  expandMaskLinkedShapeIds,
  includesMaskLinkedShapeIds,
  resolveMaskLinkedShapeIds,
} from '../interaction/maskGroup.ts'
import type {TransformBounds} from '../runtime-local/interaction/transformSessionManager.ts'
import type {
  SelectedElementProps,
  VisionFileType,
} from './useEditorRuntime.types.ts'
import {cloneElementProps, createShapeElementFromTool, offsetElementPosition} from './editorRuntimeHelpers.ts'

export interface RuntimePointerModifiersLike {
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}

export type RuntimeMaskSelectionTarget = 'host' | 'source'

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

export function resolveDirectExecuteActionCommand(input: {
  type: string
  shapes: DocumentNode[]
}): EditorRuntimeCommand | null {
  if (input.type === 'history-undo') {
    return {type: 'history.undo'}
  }

  if (input.type === 'history-redo') {
    return {type: 'history.redo'}
  }

  if (input.type === 'element-delete') {
    return {type: 'selection.delete'}
  }

  if (input.type === 'selection-all') {
    return {
      type: 'selection.set',
      shapeIds: input.shapes
        .filter((shape) => shape.type !== 'frame')
        .map((shape) => shape.id),
      mode: 'replace',
    }
  }

  return null
}

export function resolveReorderDirectionFromExecuteAction(input: {
  type: string
  data: unknown
}) {
  if (input.type === 'element-layer') {
    return String(input.data ?? 'up') as 'up' | 'down' | 'top' | 'bottom'
  }

  if (input.type === 'bringForward') {
    return 'up' as const
  }

  if (input.type === 'sendBackward') {
    return 'down' as const
  }

  if (input.type === 'bringToFront') {
    return 'top' as const
  }

  if (input.type === 'sendToBack') {
    return 'bottom' as const
  }

  return null
}

export function resolveElementMoveDelta(type: string) {
  if (
    type !== 'element-move-up' &&
    type !== 'element-move-right' &&
    type !== 'element-move-down' &&
    type !== 'element-move-left'
  ) {
    return null
  }

  return {
    x: type === 'element-move-right' ? 1 : type === 'element-move-left' ? -1 : 0,
    y: type === 'element-move-down' ? 1 : type === 'element-move-up' ? -1 : 0,
  }
}

export function resolveSelectedNonFrameNodes(input: {
  shapes: DocumentNode[]
  selectedShapeIds: string[]
}) {
  const selectedSet = new Set(expandMaskLinkedShapeIds({
    id: 'selection-move',
    name: 'selection-move',
    width: 0,
    height: 0,
    shapes: input.shapes,
  }, input.selectedShapeIds))
  return input.shapes.filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')
}

export function resolveSelectionMoveCommand(input: {
  shapes: DocumentNode[]
  selectedShapeIds: string[]
  delta: {x: number; y: number}
}) {
  const moveTargets = resolveSelectedNonFrameNodes({
    shapes: input.shapes,
    selectedShapeIds: input.selectedShapeIds,
  })

  return createTransformBatchCommand(moveTargets, {
    shapes: moveTargets.map((shape) => ({
      shapeId: shape.id,
      x: shape.x + input.delta.x,
      y: shape.y + input.delta.y,
      width: shape.width,
      height: shape.height,
      rotation: shape.rotation ?? 0,
      flipX: shape.flipX ?? false,
      flipY: shape.flipY ?? false,
    })),
  })
}

export function allocateUniqueShapeId(existingIds: Set<string>) {
  let nextId = nid()
  let attempts = 0
  while (existingIds.has(nextId) && attempts < 16) {
    attempts += 1
    nextId = attempts < 8 ? nid() : nid(8)
  }
  existingIds.add(nextId)
  return nextId
}

function remapCopiedElements(input: {
  elements: ElementProps[]
  existingShapeIds: Set<string>
  project: (element: ElementProps) => ElementProps
}) {
  const oldToNewId = new Map<string, string>()
  input.elements.forEach((element) => {
    oldToNewId.set(String(element.id), allocateUniqueShapeId(input.existingShapeIds))
  })

  const membersByMaskGroupId = new Map<string, ElementProps[]>()
  input.elements.forEach((element) => {
    if (typeof element.maskGroupId !== 'string') {
      return
    }
    const members = membersByMaskGroupId.get(element.maskGroupId) ?? []
    members.push(element)
    membersByMaskGroupId.set(element.maskGroupId, members)
  })

  // Rebuild copied mask groups from copied host/source ids so new copies don't remain linked to originals.
  const nextMaskGroupIdByPrevious = new Map<string, string>()
  membersByMaskGroupId.forEach((members, previousMaskGroupId) => {
    const host = members.find((element) => element.maskRole === 'host')
    const source = members.find((element) => element.maskRole === 'source')
    const nextHostId = host ? oldToNewId.get(String(host.id)) : undefined
    const nextSourceId = source ? oldToNewId.get(String(source.id)) : undefined
    if (nextHostId && nextSourceId) {
      nextMaskGroupIdByPrevious.set(previousMaskGroupId, `mask-group:${nextHostId}:${nextSourceId}`)
    }
  })

  return input.elements.map((element) => {
    const nextElement = input.project(element)
    return {
      ...nextElement,
      id: oldToNewId.get(String(element.id)) ?? String(element.id),
      clipPathId: typeof element.clipPathId === 'string'
        ? (oldToNewId.get(element.clipPathId) ?? element.clipPathId)
        : element.clipPathId,
      maskGroupId: typeof element.maskGroupId === 'string'
        ? nextMaskGroupIdByPrevious.get(element.maskGroupId) ?? element.maskGroupId
        : element.maskGroupId,
    }
  })
}

export function resolvePastedElements(input: {
  clipboard: ElementProps[]
  pasteSerial: number
  existingShapeIds: Set<string>
  position: {x: number; y: number} | null
}) {
  if (input.clipboard.length === 0) {
    return []
  }

  const baseOffset = 24 * (input.pasteSerial + 1)
  const anchor = input.clipboard[0]
  const anchorX = anchor?.x ?? 0
  const anchorY = anchor?.y ?? 0
  const pasteTargetX = input.position ? input.position.x + baseOffset : anchorX + baseOffset
  const pasteTargetY = input.position ? input.position.y + baseOffset : anchorY + baseOffset
  const deltaX = pasteTargetX - anchorX
  const deltaY = pasteTargetY - anchorY

  return remapCopiedElements({
    elements: input.clipboard,
    existingShapeIds: input.existingShapeIds,
    project: (item) => ({
      ...offsetElementPosition(
        item,
        (item.x ?? 0) + deltaX,
        (item.y ?? 0) + deltaY,
      ),
      name: `${item.name ?? item.type} Copy`,
    }),
  })
}

export function resolveDuplicatedElements(input: {
  elements: ElementProps[]
  existingShapeIds: Set<string>
}) {
  return remapCopiedElements({
    elements: input.elements,
    existingShapeIds: input.existingShapeIds,
    project: (item) => ({
      ...offsetElementPosition(item, (item.x ?? 0) + 24, (item.y ?? 0) + 24),
      name: `${item.name ?? item.type} Copy`,
    }),
  })
}

export function resolveSelectionModifyCommand(data: unknown): EditorRuntimeCommand | null {
  if (!data || typeof data !== 'object' || !('idSet' in data)) {
    return null
  }

  const nextIds = Array.from(data.idSet as Set<string>)
  const mode =
    'mode' in data && typeof data.mode === 'string'
      ? data.mode as 'replace' | 'add' | 'remove' | 'toggle' | 'clear'
      : 'replace'

  return {
    type: 'selection.set',
    shapeIds: nextIds,
    mode,
  }
}

export function resolveDroppedImageElement(input: {
  asset: {
    id?: string
    name?: string
    objectUrl?: string
    imageRef?: unknown
  } | null
  position: {x: number; y: number}
  viewportWidth: number
  viewportHeight: number
  imageInsertViewportRatio: number
  existingShapeIds: Set<string>
}): ElementProps {
  const imageRef = input.asset?.imageRef as {naturalWidth?: number; naturalHeight?: number} | undefined
  const naturalWidth = imageRef?.naturalWidth ?? 160
  const naturalHeight = imageRef?.naturalHeight ?? 120
  const maxWidth = input.viewportWidth * input.imageInsertViewportRatio
  const maxHeight = input.viewportHeight * input.imageInsertViewportRatio
  const scale = Math.min(
    1,
    maxWidth / naturalWidth,
    maxHeight / naturalHeight,
  )
  const width = naturalWidth * scale
  const height = naturalHeight * scale

  return {
    id: allocateUniqueShapeId(input.existingShapeIds),
    type: 'image',
    name: input.asset?.name ?? 'Image',
    asset: input.asset?.id,
    assetUrl: input.asset?.objectUrl,
    x: input.position.x - width / 2,
    y: input.position.y - height / 2,
    width,
    height,
    rotation: 0,
    opacity: 1,
  }
}

export function resolveViewportShiftFromExecuteAction(data: unknown) {
  if (!data || typeof data !== 'object' || !('x' in data) || !('y' in data)) {
    return null
  }

  return {
    x: Number(data.x),
    y: Number(data.y),
  }
}

export function resolveViewportZoomFromExecuteAction(data: unknown) {
  if (data === 'fit') {
    return {
      mode: 'fit' as const,
    }
  }

  if (!data || typeof data !== 'object' || !('zoomFactor' in data)) {
    return null
  }

  return {
    mode: 'zoom' as const,
    zoomFactor: Number(data.zoomFactor),
    point: 'physicalPoint' in data
      ? data.physicalPoint as {x: number; y: number} | undefined
      : undefined,
  }
}

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

export function resolveElementModifyCommands(input: {
  shape: DocumentNode
  props: Partial<ElementProps>
}) {
  const commands: EditorRuntimeCommand[] = []

  const nextX = typeof input.props.x === 'number' ? input.props.x : input.shape.x
  const nextY = typeof input.props.y === 'number' ? input.props.y : input.shape.y
  const nextWidth = typeof input.props.width === 'number' ? input.props.width : input.shape.width
  const nextHeight = typeof input.props.height === 'number' ? input.props.height : input.shape.height
  const nextRotation = typeof input.props.rotation === 'number' ? input.props.rotation : (input.shape.rotation ?? 0)
  const nextName = typeof input.props.name === 'string' ? input.props.name : input.shape.text ?? input.shape.name

  if (nextName !== (input.shape.text ?? input.shape.name)) {
    commands.push({
      type: 'shape.rename',
      shapeId: input.shape.id,
      name: nextName,
      text: input.shape.type === 'text' ? nextName : input.shape.text,
    })
  }

  if (nextX !== input.shape.x || nextY !== input.shape.y) {
    commands.push({
      type: 'shape.move',
      shapeId: input.shape.id,
      x: nextX,
      y: nextY,
    })
  }

  if (nextWidth !== input.shape.width || nextHeight !== input.shape.height) {
    commands.push({
      type: 'shape.resize',
      shapeId: input.shape.id,
      width: nextWidth,
      height: nextHeight,
    })
  }

  if (nextRotation !== (input.shape.rotation ?? 0)) {
    commands.push({
      type: 'shape.rotate',
      shapeId: input.shape.id,
      rotation: nextRotation,
    })
  }

  const stylePatch: {
    fill?: DocumentNode['fill']
    stroke?: DocumentNode['stroke']
    shadow?: DocumentNode['shadow']
    cornerRadius?: number
    cornerRadii?: DocumentNode['cornerRadii']
    ellipseStartAngle?: number
    ellipseEndAngle?: number
  } = {}

  if (Object.prototype.hasOwnProperty.call(input.props, 'fill')) {
    const incoming = input.props.fill
    stylePatch.fill = incoming && typeof incoming === 'object'
      ? {
          ...(input.shape.fill ?? {}),
          ...(incoming as Record<string, unknown>),
        }
      : undefined
  }

  if (Object.prototype.hasOwnProperty.call(input.props, 'stroke')) {
    const incoming = input.props.stroke
    stylePatch.stroke = incoming && typeof incoming === 'object'
      ? {
          ...(input.shape.stroke ?? {}),
          ...(incoming as Record<string, unknown>),
        }
      : undefined
  }

  if (Object.prototype.hasOwnProperty.call(input.props, 'shadow')) {
    const incoming = input.props.shadow
    stylePatch.shadow = incoming && typeof incoming === 'object'
      ? {
          ...(input.shape.shadow ?? {}),
          ...(incoming as Record<string, unknown>),
        }
      : undefined
  }

  if (typeof input.props.cornerRadius === 'number') {
    stylePatch.cornerRadius = input.props.cornerRadius
  }

  if (Object.prototype.hasOwnProperty.call(input.props, 'cornerRadii')) {
    const incoming = input.props.cornerRadii
    stylePatch.cornerRadii = incoming && typeof incoming === 'object'
      ? {
          ...(input.shape.cornerRadii ?? {}),
          ...(incoming as Record<string, unknown>),
        }
      : undefined
  }

  if (typeof input.props.ellipseStartAngle === 'number') {
    stylePatch.ellipseStartAngle = input.props.ellipseStartAngle
  }

  if (typeof input.props.ellipseEndAngle === 'number') {
    stylePatch.ellipseEndAngle = input.props.ellipseEndAngle
  }

  if (Object.keys(stylePatch).length > 0) {
    commands.push({
      type: 'shape.patch',
      shapeId: input.shape.id,
      patch: stylePatch,
    })
  }

  return commands
}

export function resolveGroupableShapeIds(input: {
  selectedShapeIds: string[]
  shapes: DocumentNode[]
}) {
  const shapeById = new Map(input.shapes.map((shape) => [shape.id, shape]))
  const document: EditorDocument = {
    id: 'groupable-selection',
    name: 'groupable-selection',
    width: 0,
    height: 0,
    shapes: input.shapes,
  }
  // Keep UI grouping affordances aligned with worker grouping by expanding linked mask members first.
  const expandedSelectedShapeIds = [...new Set(
    input.selectedShapeIds.flatMap((shapeId) => resolveMaskLinkedShapeIds(document, shapeId)),
  )]
  const expandedSelectedShapeIdSet = new Set(expandedSelectedShapeIds)

  return expandedSelectedShapeIds.filter((shapeId) => {
    const shape = shapeById.get(shapeId)
    if (!shape || shape.type === 'frame') {
      return false
    }

    let parentId = shape.parentId
    while (parentId) {
      if (expandedSelectedShapeIdSet.has(parentId)) {
        return false
      }
      parentId = shapeById.get(parentId)?.parentId ?? null
    }

    return true
  })
}

export function resolveSelectedGroups(input: {
  selectedShapeIds: string[]
  shapes: DocumentNode[]
}) {
  const shapeById = new Map(input.shapes.map((shape) => [shape.id, shape]))

  return input.selectedShapeIds
    .map((shapeId) => shapeById.get(shapeId))
    .filter((shape): shape is DocumentNode => Boolean(shape && shape.type === 'group'))
}

export function resolveIsolationShapeIdSet(input: {
  shapes: DocumentNode[]
  groupId: string | null
}) {
  if (!input.groupId) {
    return null
  }

  const shapeById = new Map(input.shapes.map((shape) => [shape.id, shape]))
  if (!shapeById.has(input.groupId)) {
    return null
  }

  const childIdsByParent = new Map<string, string[]>()
  input.shapes.forEach((shape) => {
    if (!shape.parentId) {
      return
    }

    const nextChildren = childIdsByParent.get(shape.parentId) ?? []
    nextChildren.push(shape.id)
    childIdsByParent.set(shape.parentId, nextChildren)
  })

  const visibleIds = new Set<string>()
  const queue = [input.groupId]
  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId || visibleIds.has(currentId)) {
      continue
    }

    visibleIds.add(currentId)
    const currentShape = shapeById.get(currentId)
    const explicitChildren = currentShape?.childIds?.filter((childId) => shapeById.has(childId)) ?? []
    const inferredChildren = childIdsByParent.get(currentId) ?? []
    for (const childId of explicitChildren.length > 0 ? explicitChildren : inferredChildren) {
      queue.push(childId)
    }
  }

  return visibleIds
}

export function filterDocumentToShapeSet<TDocument extends EditorDocument>(
  document: TDocument,
  visibleIds: ReadonlySet<string> | null,
) {
  if (!visibleIds) {
    return document
  }

  return {
    ...document,
    shapes: document.shapes.filter((shape) => visibleIds.has(shape.id)),
  }
}

export function filterSnapshotsToShapeSet<TShape extends {id: string}>(
  shapes: TShape[],
  visibleIds: ReadonlySet<string> | null,
) {
  if (!visibleIds) {
    return shapes
  }

  return shapes.filter((shape) => visibleIds.has(shape.id))
}

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