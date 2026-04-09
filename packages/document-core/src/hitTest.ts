import {
  applyAffineMatrixToPoint,
} from './geometry.ts'
import {getNormalizedBoundsFromBox, resolveNodeTransform} from './shapeTransform.ts'
import type {DocumentNode} from './index.ts'

const DEFAULT_HIT_TOLERANCE = 6
const CLOSED_SHAPE_EPSILON = 1.5

export function isPointInsideClipShape(
  pointer: {x: number; y: number},
  clipSource: DocumentNode,
  options?: {
    tolerance?: number
  },
) {
  const tolerance = options?.tolerance ?? 1.5
  const testPointer = resolveShapeHitPointer(pointer, clipSource)

  if (clipSource.type === 'rectangle' || clipSource.type === 'frame' || clipSource.type === 'group') {
    const bounds = getNormalizedBoundsFromBox(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    return (
      testPointer.x >= bounds.minX &&
      testPointer.x <= bounds.maxX &&
      testPointer.y >= bounds.minY &&
      testPointer.y <= bounds.maxY
    )
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
    return (
      isPointInsidePolygon(testPointer, points) ||
      isPointNearPolygonEdge(testPointer, points, tolerance)
    )
  }

  if (clipSource.type === 'path') {
    if (clipSource.bezierPoints && clipSource.bezierPoints.length > 1) {
      const polygon = sampleBezierPathPolygon(clipSource.bezierPoints, 16)
      if (polygon.length < 3) {
        return false
      }
      return (
        isPointInsidePolygon(testPointer, polygon) ||
        isPointNearPolygonEdge(testPointer, polygon, tolerance)
      )
    }

    if (clipSource.points && clipSource.points.length > 2) {
      return (
        isPointInsidePolygon(testPointer, clipSource.points) ||
        isPointNearPolygonEdge(testPointer, clipSource.points, tolerance)
      )
    }
  }

  return false
}

export function isPointInsideShapeHitArea(
  pointer: {x: number; y: number},
  shape: DocumentNode,
  options?: {
    allowFrameSelection?: boolean
    tolerance?: number
  },
) {
  if (shape.type === 'group') {
    return false
  }
  if (shape.type === 'frame' && options?.allowFrameSelection === false) {
    return false
  }

  const tolerance = options?.tolerance ?? DEFAULT_HIT_TOLERANCE
  const testPointer = resolveShapeHitPointer(pointer, shape)

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
    return (
      (hasShapeFillHitArea(shape) && isPointInsideBounds(testPointer, bounds)) ||
      (hasShapeStrokeHitArea(shape) && isPointNearRectEdge(testPointer, bounds, tolerance))
    )
  }

  if (shape.type === 'ellipse') {
    const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
    return (
      (hasShapeFillHitArea(shape) && isPointInsideEllipse(testPointer, bounds)) ||
      (hasShapeStrokeHitArea(shape) && isPointNearEllipseEdge(testPointer, bounds, tolerance))
    )
  }

  if (shape.type === 'polygon' || shape.type === 'star') {
    const points = shape.points
    if (!points || points.length < 3) {
      return false
    }

    return (
      (hasShapeFillHitArea(shape) && isPointInsidePolygon(testPointer, points)) ||
      (hasShapeStrokeHitArea(shape) && isPointNearPolygonEdge(testPointer, points, tolerance))
    )
  }

  if (shape.type === 'path') {
    if (hasShapeStrokeHitArea(shape) && isPathStrokeHit(testPointer, shape, tolerance)) {
      return true
    }
    return hasShapeFillHitArea(shape) && isPathFillHit(testPointer, shape, tolerance)
  }

  return false
}

function resolveShapeHitPointer(
  pointer: {x: number; y: number},
  shape: DocumentNode,
) {
  return applyAffineMatrixToPoint(resolveNodeTransform(shape).inverseMatrix, pointer)
}

function isPointInsideBounds(
  pointer: {x: number; y: number},
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
) {
  return (
    pointer.x >= bounds.minX &&
    pointer.x <= bounds.maxX &&
    pointer.y >= bounds.minY &&
    pointer.y <= bounds.maxY
  )
}

function hasShapeFillHitArea(shape: DocumentNode) {
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

function hasShapeStrokeHitArea(shape: DocumentNode) {
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
  pointer: {x: number; y: number},
  points: Array<{x: number; y: number}>,
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
  pointer: {x: number; y: number},
  points: Array<{x: number; y: number}>,
  tolerance = 6,
) {
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const edgeHit = isPointNearLineSegment(pointer, {
      x1: current.x,
      y1: current.y,
      x2: next.x,
      y2: next.y,
    }, tolerance)

    if (edgeHit) {
      return true
    }
  }

  return false
}

function isPointInsideEllipse(
  pointer: {x: number; y: number},
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

function isPointNearRectEdge(
  pointer: {x: number; y: number},
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
  tolerance: number,
) {
  return (
    isPointNearLineSegment(pointer, {
      x1: bounds.minX,
      y1: bounds.minY,
      x2: bounds.maxX,
      y2: bounds.minY,
    }, tolerance) ||
    isPointNearLineSegment(pointer, {
      x1: bounds.maxX,
      y1: bounds.minY,
      x2: bounds.maxX,
      y2: bounds.maxY,
    }, tolerance) ||
    isPointNearLineSegment(pointer, {
      x1: bounds.maxX,
      y1: bounds.maxY,
      x2: bounds.minX,
      y2: bounds.maxY,
    }, tolerance) ||
    isPointNearLineSegment(pointer, {
      x1: bounds.minX,
      y1: bounds.maxY,
      x2: bounds.minX,
      y2: bounds.minY,
    }, tolerance)
  )
}

function isPointNearEllipseEdge(
  pointer: {x: number; y: number},
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
  const dx = pointer.x - centerX
  const dy = pointer.y - centerY
  const outerRadiusX = radiusX + tolerance
  const outerRadiusY = radiusY + tolerance
  const insideOuter =
    (dx * dx) / (outerRadiusX * outerRadiusX) +
    (dy * dy) / (outerRadiusY * outerRadiusY) <= 1

  if (!insideOuter) {
    return false
  }

  const innerRadiusX = radiusX - tolerance
  const innerRadiusY = radiusY - tolerance
  if (innerRadiusX <= 0 || innerRadiusY <= 0) {
    return true
  }

  const insideInner =
    (dx * dx) / (innerRadiusX * innerRadiusX) +
    (dy * dy) / (innerRadiusY * innerRadiusY) <= 1

  return !insideInner
}

function isPointNearLineSegment(
  pointer: {x: number; y: number},
  line: {x1: number; y1: number; x2: number; y2: number},
  tolerance = 6,
) {
  const dx = line.x2 - line.x1
  const dy = line.y2 - line.y1
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    const distanceSquared =
      (pointer.x - line.x1) * (pointer.x - line.x1) +
      (pointer.y - line.y1) * (pointer.y - line.y1)
    return distanceSquared <= tolerance * tolerance
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointer.x - line.x1) * dx + (pointer.y - line.y1) * dy) / lengthSquared,
    ),
  )
  const nearestX = line.x1 + t * dx
  const nearestY = line.y1 + t * dy
  const distanceSquared =
    (pointer.x - nearestX) * (pointer.x - nearestX) +
    (pointer.y - nearestY) * (pointer.y - nearestY)

  return distanceSquared <= tolerance * tolerance
}

function isPointNearPolyline(
  pointer: {x: number; y: number},
  points: Array<{x: number; y: number}>,
  tolerance = DEFAULT_HIT_TOLERANCE,
) {
  for (let index = 1; index < points.length; index += 1) {
    if (
      isPointNearLineSegment(pointer, {
        x1: points[index - 1].x,
        y1: points[index - 1].y,
        x2: points[index].x,
        y2: points[index].y,
      }, tolerance)
    ) {
      return true
    }
  }

  return false
}

function isPathStrokeHit(
  pointer: {x: number; y: number},
  shape: DocumentNode,
  tolerance: number,
) {
  if (shape.bezierPoints && shape.bezierPoints.length > 1) {
    for (let index = 1; index < shape.bezierPoints.length; index += 1) {
      const sampled = sampleBezierPathPolygon([
        shape.bezierPoints[index - 1],
        shape.bezierPoints[index],
      ], 24)
      if (isPointNearPolyline(pointer, sampled, tolerance)) {
        return true
      }
    }

    return false
  }

  if (shape.points && shape.points.length > 1) {
    return isPointNearPolyline(pointer, shape.points, tolerance)
  }

  return false
}

function isPathFillHit(
  pointer: {x: number; y: number},
  shape: DocumentNode,
  tolerance: number,
) {
  if (shape.bezierPoints && shape.bezierPoints.length > 1) {
    const polygon = sampleBezierPathPolygon(shape.bezierPoints, 24)
    return polygon.length >= 3 && (
      isPointInsidePolygon(pointer, polygon) ||
      isPointNearPolygonEdge(pointer, polygon, tolerance)
    )
  }

  if (shape.points && shape.points.length > 2) {
    return (
      isPointInsidePolygon(pointer, shape.points) ||
      isPointNearPolygonEdge(pointer, shape.points, tolerance)
    )
  }

  return false
}

function isClosedPathShape(shape: DocumentNode) {
  if (shape.bezierPoints && shape.bezierPoints.length > 2) {
    const first = shape.bezierPoints[0]?.anchor
    const last = shape.bezierPoints[shape.bezierPoints.length - 1]?.anchor
    if (first && last) {
      return Math.hypot(first.x - last.x, first.y - last.y) <= CLOSED_SHAPE_EPSILON
    }
  }

  if (shape.points && shape.points.length > 2) {
    const first = shape.points[0]
    const last = shape.points[shape.points.length - 1]
    return Math.hypot(first.x - last.x, first.y - last.y) <= CLOSED_SHAPE_EPSILON
  }

  return false
}

function sampleBezierPathPolygon(
  points: Array<{
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }>,
  stepsPerSegment = 16,
) {
  if (points.length < 2) {
    return []
  }

  const sampled: Array<{x: number; y: number}> = [{...points[0].anchor}]

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const cp1 = current.cp2 ?? current.anchor
    const cp2 = next.cp1 ?? next.anchor

    for (let step = 1; step <= stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment
      sampled.push(sampleCubicBezierPoint(current.anchor, cp1, cp2, next.anchor, t))
    }
  }

  return sampled
}

function sampleCubicBezierPoint(
  p0: {x: number; y: number},
  p1: {x: number; y: number},
  p2: {x: number; y: number},
  p3: {x: number; y: number},
  t: number,
) {
  const inv = 1 - t
  const a = inv * inv * inv
  const b = 3 * inv * inv * t
  const c = 3 * inv * t * t
  const d = t * t * t

  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  }
}
