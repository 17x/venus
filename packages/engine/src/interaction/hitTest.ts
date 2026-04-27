import { getNormalizedBoundsFromBox } from './shapeTransform.ts'
import {
  isPointInsideBounds,
  isPointInsideEllipse,
  isPointInsidePolygon,
  isPointInsideRoundedRect,
  isPointNearEllipseEdge,
  isPointNearLineSegment,
  isPointNearPolygonEdge,
  isPointNearRectEdge,
  isPointNearRoundedRectEdge,
  resolveRoundedRectCornerRadii,
} from './hitTest/geometry.ts'
import { resolveShapeHitPointer } from './hitTest/matrix.ts'
import {
  isClosedPathShape,
  isPathFillHit,
  isPathStrokeHit,
  sampleBezierPathPolygon,
} from './hitTest/path.ts'

export type EngineEditorNodeType =
  | 'frame'
  | 'group'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'lineSegment'
  | 'path'
  | 'text'
  | 'image'

export interface EngineEditorPoint {
  x: number
  y: number
}

export interface EngineEditorBezierPoint {
  anchor: EngineEditorPoint
  cp1?: EngineEditorPoint | null
  cp2?: EngineEditorPoint | null
}

export interface EngineEditorHitTestNode {
  id: string
  type: EngineEditorNodeType
  parentId?: string | null
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
  clipPathId?: string
  fill?: {enabled?: boolean}
  stroke?: {enabled?: boolean}
  cornerRadius?: number
  cornerRadii?: {
    topLeft?: number
    topRight?: number
    bottomRight?: number
    bottomLeft?: number
  }
  points?: EngineEditorPoint[]
  bezierPoints?: EngineEditorBezierPoint[]
  closed?: boolean
  schema?: {sourceFeatureKinds?: string[]}
}

export interface EngineShapeHitTestOptions {
  allowFrameSelection?: boolean
  tolerance?: number
  strictStrokeHitTest?: boolean
  shapeById?: Map<string, EngineEditorHitTestNode>
}

export interface EngineClipHitTestOptions {
  tolerance?: number
  shapeById?: Map<string, EngineEditorHitTestNode>
}

const DEFAULT_HIT_TOLERANCE = 6
export function isPointInsideEngineClipShape(
  pointer: EngineEditorPoint,
  clipSource: EngineEditorHitTestNode,
  options?: EngineClipHitTestOptions,
) {
  const tolerance = options?.tolerance ?? 1.5
  const testPointer = resolveShapeHitPointer(pointer, clipSource, options?.shapeById)

  if (clipSource.type === 'rectangle' || clipSource.type === 'frame' || clipSource.type === 'group') {
    const bounds = getNormalizedBoundsFromBox(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    const cornerRadii = resolveRoundedRectCornerRadii(clipSource, bounds)
    const hasRoundedCorners = cornerRadii.topLeft > 0 || cornerRadii.topRight > 0 || cornerRadii.bottomRight > 0 || cornerRadii.bottomLeft > 0
    return hasRoundedCorners
      ? isPointInsideRoundedRect(testPointer, bounds, cornerRadii)
      : isPointInsideBounds(testPointer, bounds)
  }

  if (clipSource.type === 'ellipse') {
    const bounds = getNormalizedBoundsFromBox(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    const radiusX = bounds.width / 2
    const radiusY = bounds.height / 2
    if (radiusX <= 0 || radiusY <= 0) {
      return false
    }
    const centerX = bounds.minX + radiusX
    const centerY = bounds.minY + radiusY
    const normalized =
      ((testPointer.x - centerX) * (testPointer.x - centerX)) / (radiusX * radiusX) +
      ((testPointer.y - centerY) * (testPointer.y - centerY)) / (radiusY * radiusY)

    return normalized <= 1
  }

  if (clipSource.type === 'polygon' || clipSource.type === 'star') {
    const points = clipSource.points
    if (!points || points.length < 3) {
      return false
    }
    return isPointInsidePolygon(testPointer, points) || isPointNearPolygonEdge(testPointer, points, tolerance)
  }

  if (clipSource.type === 'path') {
    if (clipSource.bezierPoints && clipSource.bezierPoints.length > 1) {
      const polygon = sampleBezierPathPolygon(clipSource.bezierPoints, 16)
      if (polygon.length < 3) {
        return false
      }
      return isPointInsidePolygon(testPointer, polygon) || isPointNearPolygonEdge(testPointer, polygon, tolerance)
    }

    if (clipSource.points && clipSource.points.length > 2) {
      return isPointInsidePolygon(testPointer, clipSource.points) || isPointNearPolygonEdge(testPointer, clipSource.points, tolerance)
    }
  }

  return false
}

export function isPointInsideEngineShapeHitArea(
  pointer: EngineEditorPoint,
  shape: EngineEditorHitTestNode,
  options?: EngineShapeHitTestOptions,
) {
  if (shape.type === 'group') {
    return false
  }
  if (shape.type === 'frame' && options?.allowFrameSelection === false) {
    return false
  }

  const tolerance = options?.tolerance ?? DEFAULT_HIT_TOLERANCE
  const strictStrokeHitTest = options?.strictStrokeHitTest ?? false
  const testPointer = resolveShapeHitPointer(pointer, shape, options?.shapeById)

  if (shape.type === 'image' || shape.type === 'text') {
    return isPointInsideBounds(testPointer, getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height))
  }

  if (shape.type === 'lineSegment') {
    return isPointNearLineSegment(testPointer, {
      x1: shape.x,
      y1: shape.y,
      x2: shape.x + shape.width,
      y2: shape.y + shape.height,
    }, tolerance)
  }

  if (shape.type === 'rectangle' || shape.type === 'frame') {
    const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
    const cornerRadii = resolveRoundedRectCornerRadii(shape, bounds)
    const hasRoundedCorners = cornerRadii.topLeft > 0 || cornerRadii.topRight > 0 || cornerRadii.bottomRight > 0 || cornerRadii.bottomLeft > 0
    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const hasFillArea = hasShapeFillHitArea(shape)
    const fillHit = hasFillArea && (
      hasRoundedCorners
        ? isPointInsideRoundedRect(testPointer, bounds, cornerRadii)
        : isPointInsideBounds(testPointer, bounds)
    )
    const strokeOnly = strictStrokeHitTest && hasStrokeArea
    return (
      (hasStrokeArea && (
        hasRoundedCorners
          ? isPointNearRoundedRectEdge(testPointer, bounds, cornerRadii, tolerance)
          : isPointNearRectEdge(testPointer, bounds, tolerance)
      )) ||
      (!strokeOnly && fillHit)
    )
  }

  if (shape.type === 'ellipse') {
    const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const strokeOnly = strictStrokeHitTest && hasStrokeArea
    return (
      (hasStrokeArea && isPointNearEllipseEdge(testPointer, bounds, tolerance)) ||
      (!strokeOnly && hasShapeFillHitArea(shape) && isPointInsideEllipse(testPointer, bounds))
    )
  }

  if (shape.type === 'polygon' || shape.type === 'star') {
    const points = shape.points
    if (!points || points.length < 3) {
      return false
    }

    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const strokeOnly = strictStrokeHitTest && hasStrokeArea
    return (
      (hasStrokeArea && isPointNearPolygonEdge(testPointer, points, tolerance)) ||
      (!strokeOnly && hasShapeFillHitArea(shape) && isPointInsidePolygon(testPointer, points))
    )
  }

  if (shape.type === 'path') {
    const closedShape = isClosedPathShape(shape)
    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const strokeOnly = strictStrokeHitTest && hasStrokeArea
    if (hasStrokeArea && isPathStrokeHit(testPointer, shape, tolerance, closedShape)) {
      return true
    }
    return !strokeOnly && hasShapeFillHitArea(shape, closedShape) && isPathFillHit(testPointer, shape, tolerance, closedShape)
  }

  return false
}

function hasShapeFillHitArea(shape: EngineEditorHitTestNode, closedPathHint?: boolean) {
  if (shape.type === 'image' || shape.type === 'text') {
    return true
  }
  if (shape.type === 'group' || shape.type === 'lineSegment') {
    return false
  }
  if (shape.fill?.enabled === false) {
    return false
  }
  if (shape.fill) {
    return true
  }

  const featureKinds = shape.schema?.sourceFeatureKinds ?? []
  if (featureKinds.some((kind) => String(kind).toUpperCase() === 'FILL')) {
    return true
  }

  return shape.type === 'path' && (closedPathHint ?? isClosedPathShape(shape))
}

function hasShapeStrokeHitArea(shape: EngineEditorHitTestNode) {
  if (shape.type === 'image' || shape.type === 'text' || shape.type === 'group') {
    return false
  }
  if (shape.stroke?.enabled === false) {
    return false
  }
  if (shape.stroke) {
    return true
  }

  return (
    shape.type === 'rectangle' ||
    shape.type === 'frame' ||
    shape.type === 'ellipse' ||
    shape.type === 'polygon' ||
    shape.type === 'star' ||
    shape.type === 'lineSegment' ||
    shape.type === 'path'
  )
}

