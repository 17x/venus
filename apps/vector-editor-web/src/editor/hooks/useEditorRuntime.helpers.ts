import {
  getBoundingRectFromBezierPoints,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
} from '@venus/document-core'
import {doNormalizedBoundsOverlap, getNormalizedBoundsFromBox} from '@vector/runtime/engine'
import type {ElementProps} from '@lite-u/editor/types'
import type {PathSubSelection} from '../interaction/index.ts'
import type {
  SelectedElementProps,
  VisionFileType,
} from './useEditorRuntime.types.ts'

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