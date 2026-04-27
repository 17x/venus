import {
  isPointInsidePolygon,
  isPointNearLineSegment,
  isPointNearPolygonEdge,
} from './geometry.ts'
import type {
  EngineEditorBezierPoint,
  EngineEditorHitTestNode,
  EngineEditorPoint,
} from '../hitTest.ts'

const CLOSED_SHAPE_EPSILON = 1.5

// Keep path-specific hit logic in one module so the main hitTest entry stays
// focused on shape-type routing instead of contour and bezier details.
export function isPathStrokeHit(
  pointer: EngineEditorPoint,
  shape: EngineEditorHitTestNode,
  tolerance: number,
  closedShape: boolean,
) {
  if (hasMultiContourPointPathCandidate(shape, closedShape)) {
    const pointPath = shape.points
    if (!pointPath) {
      return false
    }

    const contours = resolveClosedPointContours(pointPath)
    if (contours.length > 1) {
      for (const contour of contours) {
        const segments = resolveContourSegments(contour)
        for (const segment of segments) {
          if (isPointNearLineSegment(pointer, segment, tolerance)) {
            return true
          }
        }
      }
      return false
    }
  }

  const segments = resolvePathSegments(shape)
  for (const segment of segments) {
    if (isPointNearLineSegment(pointer, segment, tolerance)) {
      return true
    }
  }

  if (closedShape && segments.length > 1) {
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

export function isPathFillHit(
  pointer: EngineEditorPoint,
  shape: EngineEditorHitTestNode,
  tolerance: number,
  closedShape: boolean,
) {
  if (hasMultiContourPointPathCandidate(shape, closedShape)) {
    const pointPath = shape.points
    if (!pointPath) {
      return false
    }

    const contours = resolveClosedPointContours(pointPath)
    if (contours.length > 1) {
      for (const contour of contours) {
        if (isPointNearPolygonEdge(pointer, contour, tolerance)) {
          return true
        }
      }
      return resolveNonZeroWindingContains(pointer, contours)
    }
  }

  const polygon = resolvePathPolygon(shape)
  if (polygon.length < 3) {
    return false
  }

  return isPointInsidePolygon(pointer, polygon) || isPointNearPolygonEdge(pointer, polygon, tolerance)
}

export function isClosedPathShape(shape: EngineEditorHitTestNode) {
  if (typeof shape.closed === 'boolean') {
    return shape.closed
  }

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

function hasMultiContourPointPathCandidate(
  shape: EngineEditorHitTestNode,
  closedShape: boolean,
) {
  return Boolean(
    closedShape &&
    shape.points &&
    shape.points.length > 3 &&
    (!shape.bezierPoints || shape.bezierPoints.length === 0),
  )
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

function resolveClosedPointContours(points: EngineEditorPoint[]) {
  const contours: EngineEditorPoint[][] = []
  let cursor = 0

  while (cursor < points.length) {
    const start = points[cursor]
    if (!start) {
      break
    }

    const contour: EngineEditorPoint[] = [start]
    let closedIndex = -1

    for (let index = cursor + 1; index < points.length; index += 1) {
      const point = points[index]
      if (!point) {
        continue
      }
      contour.push(point)
      if (point.x === start.x && point.y === start.y && contour.length >= 4) {
        closedIndex = index
        break
      }
    }

    if (closedIndex < 0) {
      break
    }

    contours.push(contour)
    cursor = closedIndex + 1
  }

  return contours
}

function resolveContourSegments(contour: EngineEditorPoint[]) {
  const segments: Array<{x1: number; y1: number; x2: number; y2: number}> = []
  for (let index = 0; index < contour.length - 1; index += 1) {
    const current = contour[index]
    const next = contour[index + 1]
    segments.push({x1: current.x, y1: current.y, x2: next.x, y2: next.y})
  }
  return segments
}

function resolveNonZeroWindingContains(pointer: EngineEditorPoint, contours: EngineEditorPoint[][]) {
  const winding = contours.reduce((sum, contour) => {
    return sum + resolveContourWinding(pointer, contour)
  }, 0)

  return winding !== 0
}

function resolveContourWinding(pointer: EngineEditorPoint, contour: EngineEditorPoint[]) {
  let winding = 0

  for (let index = 0; index < contour.length - 1; index += 1) {
    const current = contour[index]
    const next = contour[index + 1]

    if (current.y <= pointer.y) {
      if (next.y > pointer.y && resolvePointCross(current, next, pointer) > 0) {
        winding += 1
      }
      continue
    }

    if (next.y <= pointer.y && resolvePointCross(current, next, pointer) < 0) {
      winding -= 1
    }
  }

  return winding
}

function resolvePointCross(
  from: EngineEditorPoint,
  to: EngineEditorPoint,
  point: EngineEditorPoint,
) {
  return (to.x - from.x) * (point.y - from.y) - (point.x - from.x) * (to.y - from.y)
}

export function sampleBezierPathPolygon(
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