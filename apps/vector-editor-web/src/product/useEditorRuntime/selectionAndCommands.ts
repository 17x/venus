import type {DocumentNode, EditorDocument} from '../../runtime/model/index.ts'
import type {ElementProps, EditorFileDocument} from '../../runtime/types/index.ts'
import type {EditorRuntimeCommand} from '../../runtime/worker/index.ts'
import type {PathSubSelection} from '../../runtime/interaction/index.ts'
import {resolveMaskLinkedShapeIds} from '../../runtime/interaction/maskGroup.ts'
import type {SelectedElementProps} from './types.ts'

/**
 * Resolves shape-modify commands from partial element prop updates.
 * @param input Selected shape and incoming partial props.
 */
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

/**
 * Resolves selectable groupable shape ids after mask-linked expansion.
 * @param input Candidate selection and shape list.
 */
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

/**
 * Resolves selected nodes that are groups.
 * @param input Selected ids and all shapes.
 */
export function resolveSelectedGroups(input: {
  selectedShapeIds: string[]
  shapes: DocumentNode[]
}) {
  const shapeById = new Map(input.shapes.map((shape) => [shape.id, shape]))

  return input.selectedShapeIds
    .map((shapeId) => shapeById.get(shapeId))
    .filter((shape): shape is DocumentNode => Boolean(shape && shape.type === 'group'))
}

/**
 * Resolves isolated visibility id set for one group subtree.
 * @param input Shapes and optional target group id.
 */
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

/**
 * Filters one editor document to one visible id set.
 * @param document Source document.
 * @param visibleIds Visibility allow-list.
 */
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

/**
 * Filters snapshot arrays to one visible id set.
 * @param shapes Snapshot list.
 * @param visibleIds Visibility allow-list.
 */
export function filterSnapshotsToShapeSet<TShape extends {id: string}>(
  shapes: TShape[],
  visibleIds: ReadonlySet<string> | null,
) {
  if (!visibleIds) {
    return shapes
  }

  return shapes.filter((shape) => visibleIds.has(shape.id))
}

/**
 * Formats selected shape names for compact shell display.
 * @param document Source document.
 * @param selectedIds Selected shape ids.
 */
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

/**
 * Adds image-related selected metadata when current node is image.
 * @param selectedProps Current selected props.
 * @param selectedNode Current selected node.
 * @param file Source file payload.
 */
export function resolveSelectedProps(
  selectedProps: SelectedElementProps | null,
  selectedNode: DocumentNode | null,
  file: EditorFileDocument | null,
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

/**
 * Compares two path sub-selection payloads for structural equality.
 * @param left Left value.
 * @param right Right value.
 */
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

/**
 * Applies interval+distance budget to hover hit recomputation.
 * @param point Current pointer point.
 * @param budget Previous budget state.
 * @param options Budget configuration.
 */
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

/**
 * Resolves pointer-down state for path sub-selection interactions.
 * @param nextPathSubSelection Current path sub-selection.
 */
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
