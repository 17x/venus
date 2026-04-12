import { getNormalizedBoundsFromBox } from './shapeTransform.ts'

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
  points?: EngineEditorPoint[]
  bezierPoints?: EngineEditorBezierPoint[]
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
const CLOSED_SHAPE_EPSILON = 1.5

type Matrix2D = readonly [number, number, number, number, number, number]
const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 0, 1, 0]

export function isPointInsideEngineClipShape(
  pointer: EngineEditorPoint,
  clipSource: EngineEditorHitTestNode,
  options?: EngineClipHitTestOptions,
) {
  const tolerance = options?.tolerance ?? 1.5
  const testPointer = resolveShapeHitPointer(pointer, clipSource, options?.shapeById)

  if (clipSource.type === 'rectangle' || clipSource.type === 'frame' || clipSource.type === 'group') {
    const bounds = getNormalizedBoundsFromBox(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    return isPointInsideBounds(testPointer, bounds)
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
    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const strokeOnly = strictStrokeHitTest && hasStrokeArea
    return (
      (hasStrokeArea && isPointNearRectEdge(testPointer, bounds, tolerance)) ||
      (!strokeOnly && hasShapeFillHitArea(shape) && isPointInsideBounds(testPointer, bounds))
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
    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const strokeOnly = strictStrokeHitTest && hasStrokeArea
    if (hasStrokeArea && isPathStrokeHit(testPointer, shape, tolerance)) {
      return true
    }
    return !strokeOnly && hasShapeFillHitArea(shape) && isPathFillHit(testPointer, shape, tolerance)
  }

  return false
}

function resolveShapeHitPointer(
  pointer: EngineEditorPoint,
  shape: EngineEditorHitTestNode,
  shapeById?: Map<string, EngineEditorHitTestNode>,
) {
  const world = resolveWorldMatrix(shape, shapeById)
  const inverse = invertMatrix(world)
  if (!inverse) {
    return pointer
  }

  return {
    x: inverse[0] * pointer.x + inverse[1] * pointer.y + inverse[2],
    y: inverse[3] * pointer.x + inverse[4] * pointer.y + inverse[5],
  }
}

function resolveWorldMatrix(
  shape: EngineEditorHitTestNode,
  shapeById?: Map<string, EngineEditorHitTestNode>,
  cache = new Map<string, Matrix2D>(),
): Matrix2D {
  const cached = cache.get(shape.id)
  if (cached) {
    return cached
  }

  const local = resolveLocalMatrix(shape)
  const parentId = shape.parentId
  if (!parentId || !shapeById) {
    cache.set(shape.id, local)
    return local
  }

  const parent = shapeById.get(parentId)
  if (!parent) {
    cache.set(shape.id, local)
    return local
  }

  const world = multiplyMatrix(resolveWorldMatrix(parent, shapeById, cache), local)
  cache.set(shape.id, world)
  return world
}

function resolveLocalMatrix(shape: EngineEditorHitTestNode): Matrix2D {
  const rotation = shape.rotation ?? 0
  const flipX = shape.flipX ? -1 : 1
  const flipY = shape.flipY ? -1 : 1
  if (Math.abs(rotation) <= 1e-6 && flipX === 1 && flipY === 1) {
    return IDENTITY_MATRIX
  }

  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const centerX = shape.x + shape.width / 2
  const centerY = shape.y + shape.height / 2

  const rotationScale: Matrix2D = [
    cos * flipX,
    -sin * flipY,
    0,
    sin * flipX,
    cos * flipY,
    0,
  ]

  return multiplyMatrix(
    multiplyMatrix([1, 0, centerX, 0, 1, centerY], rotationScale),
    [1, 0, -centerX, 0, 1, -centerY],
  )
}

function multiplyMatrix(left: Matrix2D, right: Matrix2D): Matrix2D {
  return [
    left[0] * right[0] + left[1] * right[3],
    left[0] * right[1] + left[1] * right[4],
    left[0] * right[2] + left[1] * right[5] + left[2],
    left[3] * right[0] + left[4] * right[3],
    left[3] * right[1] + left[4] * right[4],
    left[3] * right[2] + left[4] * right[5] + left[5],
  ]
}

function invertMatrix(matrix: Matrix2D): Matrix2D | null {
  const determinant = matrix[0] * matrix[4] - matrix[1] * matrix[3]
  if (Math.abs(determinant) < 1e-8) {
    return null
  }

  const inv = 1 / determinant
  return [
    matrix[4] * inv,
    -matrix[1] * inv,
    (matrix[1] * matrix[5] - matrix[4] * matrix[2]) * inv,
    -matrix[3] * inv,
    matrix[0] * inv,
    (matrix[3] * matrix[2] - matrix[0] * matrix[5]) * inv,
  ]
}

function isPointInsideBounds(
  pointer: EngineEditorPoint,
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
) {
  return (
    pointer.x >= bounds.minX &&
    pointer.x <= bounds.maxX &&
    pointer.y >= bounds.minY &&
    pointer.y <= bounds.maxY
  )
}

function hasShapeFillHitArea(shape: EngineEditorHitTestNode) {
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

  return shape.type === 'path' && isClosedPathShape(shape)
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

function isPointInsidePolygon(
  pointer: EngineEditorPoint,
  points: EngineEditorPoint[],
) {
  let inside = false

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const current = points[index]
    const last = points[previous]
    const intersects =
      ((current.y > pointer.y) !== (last.y > pointer.y)) &&
      pointer.x < ((last.x - current.x) * (pointer.y - current.y)) / ((last.y - current.y) || 1e-9) + current.x

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

function isPointNearPolygonEdge(
  pointer: EngineEditorPoint,
  points: EngineEditorPoint[],
  tolerance = 6,
) {
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    if (isPointNearLineSegment(pointer, {x1: current.x, y1: current.y, x2: next.x, y2: next.y}, tolerance)) {
      return true
    }
  }

  return false
}

function isPointInsideEllipse(
  pointer: EngineEditorPoint,
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
) {
  const radiusX = (bounds.maxX - bounds.minX) / 2
  const radiusY = (bounds.maxY - bounds.minY) / 2
  if (radiusX <= 0 || radiusY <= 0) {
    return false
  }

  const centerX = bounds.minX + radiusX
  const centerY = bounds.minY + radiusY
  const normalized =
    ((pointer.x - centerX) * (pointer.x - centerX)) / (radiusX * radiusX) +
    ((pointer.y - centerY) * (pointer.y - centerY)) / (radiusY * radiusY)

  return normalized <= 1
}

function isPointNearEllipseEdge(
  pointer: EngineEditorPoint,
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
  tolerance: number,
) {
  const radiusX = (bounds.maxX - bounds.minX) / 2
  const radiusY = (bounds.maxY - bounds.minY) / 2
  if (radiusX <= 0 || radiusY <= 0) {
    return false
  }

  const centerX = bounds.minX + radiusX
  const centerY = bounds.minY + radiusY
  const deltaX = pointer.x - centerX
  const deltaY = pointer.y - centerY

  const normalized =
    (deltaX * deltaX) / ((radiusX + tolerance) * (radiusX + tolerance)) +
    (deltaY * deltaY) / ((radiusY + tolerance) * (radiusY + tolerance))
  const inner = Math.max(0, tolerance)
  const innerRadiusX = Math.max(1e-6, radiusX - inner)
  const innerRadiusY = Math.max(1e-6, radiusY - inner)
  const normalizedInner =
    (deltaX * deltaX) / (innerRadiusX * innerRadiusX) +
    (deltaY * deltaY) / (innerRadiusY * innerRadiusY)

  return normalized <= 1 && normalizedInner >= 1
}

function isPointNearRectEdge(
  pointer: EngineEditorPoint,
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
  tolerance: number,
) {
  const expanded = {
    minX: bounds.minX - tolerance,
    minY: bounds.minY - tolerance,
    maxX: bounds.maxX + tolerance,
    maxY: bounds.maxY + tolerance,
  }
  if (!isPointInsideBounds(pointer, expanded)) {
    return false
  }

  const inner = {
    minX: bounds.minX + tolerance,
    minY: bounds.minY + tolerance,
    maxX: bounds.maxX - tolerance,
    maxY: bounds.maxY - tolerance,
  }

  if (inner.minX > inner.maxX || inner.minY > inner.maxY) {
    return true
  }

  return !isPointInsideBounds(pointer, inner)
}

function isPointNearLineSegment(
  pointer: EngineEditorPoint,
  segment: {x1: number; y1: number; x2: number; y2: number},
  tolerance: number,
) {
  const dx = segment.x2 - segment.x1
  const dy = segment.y2 - segment.y1
  const lengthSq = dx * dx + dy * dy
  if (lengthSq <= 1e-9) {
    return Math.hypot(pointer.x - segment.x1, pointer.y - segment.y1) <= tolerance
  }

  const projected = ((pointer.x - segment.x1) * dx + (pointer.y - segment.y1) * dy) / lengthSq
  const clamped = Math.max(0, Math.min(1, projected))
  const closestX = segment.x1 + clamped * dx
  const closestY = segment.y1 + clamped * dy

  return Math.hypot(pointer.x - closestX, pointer.y - closestY) <= tolerance
}

function isPathStrokeHit(
  pointer: EngineEditorPoint,
  shape: EngineEditorHitTestNode,
  tolerance: number,
) {
  const segments = resolvePathSegments(shape)
  for (const segment of segments) {
    if (isPointNearLineSegment(pointer, segment, tolerance)) {
      return true
    }
  }

  if (isClosedPathShape(shape) && segments.length > 1) {
    const first = segments[0]
    const last = segments[segments.length - 1]
    if (isPointNearLineSegment(pointer, {
      x1: last.x2,
      y1: last.y2,
      x2: first.x1,
      y2: first.y1,
    }, tolerance)) {
      return true
    }
  }

  return false
}

function isPathFillHit(
  pointer: EngineEditorPoint,
  shape: EngineEditorHitTestNode,
  tolerance: number,
) {
  const polygon = resolvePathPolygon(shape)
  if (polygon.length < 3) {
    return false
  }

  return isPointInsidePolygon(pointer, polygon) || isPointNearPolygonEdge(pointer, polygon, tolerance)
}

function resolvePathSegments(shape: EngineEditorHitTestNode) {
  if (shape.bezierPoints && shape.bezierPoints.length > 1) {
    const samples = sampleBezierPathPolygon(shape.bezierPoints, 12)
    const segments: Array<{x1: number; y1: number; x2: number; y2: number}> = []
    for (let index = 0; index < samples.length - 1; index += 1) {
      const current = samples[index]
      const next = samples[index + 1]
      segments.push({x1: current.x, y1: current.y, x2: next.x, y2: next.y})
    }
    return segments
  }

  if (shape.points && shape.points.length > 1) {
    const segments: Array<{x1: number; y1: number; x2: number; y2: number}> = []
    for (let index = 0; index < shape.points.length - 1; index += 1) {
      const current = shape.points[index]
      const next = shape.points[index + 1]
      segments.push({x1: current.x, y1: current.y, x2: next.x, y2: next.y})
    }
    return segments
  }

  return []
}

function resolvePathPolygon(shape: EngineEditorHitTestNode) {
  if (shape.bezierPoints && shape.bezierPoints.length > 2) {
    return sampleBezierPathPolygon(shape.bezierPoints, 16)
  }

  return shape.points ? [...shape.points] : []
}

function sampleBezierPathPolygon(
  points: EngineEditorBezierPoint[],
  segmentsPerCurve = 12,
) {
  if (points.length < 2) {
    return []
  }

  const polygon: EngineEditorPoint[] = []

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const cp1 = current.cp2 ?? current.anchor
    const cp2 = next.cp1 ?? next.anchor

    for (let segment = 0; segment <= segmentsPerCurve; segment += 1) {
      if (index > 0 && segment === 0) {
        continue
      }

      const t = segment / segmentsPerCurve
      polygon.push(sampleCubicBezierPoint(current.anchor, cp1, cp2, next.anchor, t))
    }
  }

  return polygon
}

function sampleCubicBezierPoint(
  p0: EngineEditorPoint,
  p1: EngineEditorPoint,
  p2: EngineEditorPoint,
  p3: EngineEditorPoint,
  t: number,
) {
  const oneMinusT = 1 - t
  const oneMinusTSq = oneMinusT * oneMinusT
  const tSq = t * t

  return {
    x:
      oneMinusT * oneMinusTSq * p0.x +
      3 * oneMinusTSq * t * p1.x +
      3 * oneMinusT * tSq * p2.x +
      tSq * t * p3.x,
    y:
      oneMinusT * oneMinusTSq * p0.y +
      3 * oneMinusTSq * t * p1.y +
      3 * oneMinusT * tSq * p2.y +
      tSq * t * p3.y,
  }
}

function isClosedPathShape(shape: EngineEditorHitTestNode) {
  const compare = (left: EngineEditorPoint, right: EngineEditorPoint) => {
    return Math.hypot(left.x - right.x, left.y - right.y) <= CLOSED_SHAPE_EPSILON
  }

  if (shape.bezierPoints && shape.bezierPoints.length >= 3) {
    return compare(shape.bezierPoints[0].anchor, shape.bezierPoints[shape.bezierPoints.length - 1].anchor)
  }

  if (shape.points && shape.points.length >= 3) {
    return compare(shape.points[0], shape.points[shape.points.length - 1])
  }

  return false
}
