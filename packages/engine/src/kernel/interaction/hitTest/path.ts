import {
  isPointInsidePolygon,
  isPointNearLineSegment,
  isPointNearPolygonEdge,
} from './geometry.ts'
import { resolveBezierSegmentsPerCurve, sampleBezierPathPolygon } from './pathBezier.ts'
import {
  createPathStrokeSpatialGrid,
  resolveCandidateSegmentsForPointer,
  type PathStrokeSegment,
  type PathStrokeSpatialGridEntry,
} from './pathSpatialIndex.ts'
import type {
  EngineEditorHitTestNode,
  EngineEditorPoint,
} from '../hitTest.ts'

export { sampleBezierPathPolygon } from './pathBezier.ts'

const CLOSED_SHAPE_EPSILON = 1.5
const MIN_CLOSED_POLYGON_POINTS = 3
const MIN_MULTI_CONTOUR_PATH_POINTS = 4
const MIN_BEZIER_FILL_POINTS = 3
const TOLERANCE_ROUNDING_MIN = 0.5
const TOLERANCE_ROUNDING_SCALE = 100
const CLOSED_CONTOUR_MIN_POINTS = 4
const PATH_STROKE_CACHE_MAX_ENTRIES = 48

interface PathStrokeCacheEntry {
  signature: string
  segments: PathStrokeSegment[]
  grid: PathStrokeSpatialGridEntry | null
}

const pathStrokeCache = new Map<string, PathStrokeCacheEntry>()

// Keep path-specific hit logic in one module so the main hitTest entry stays
// focused on shape-type routing instead of contour and bezier details.
/**
 * Handles isPathStrokeHit.
 * @param pointer Pointer position.
 * @param shape shape parameter.
 * @param tolerance tolerance parameter.
 * @param closedShape closedShape parameter.
 */
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

  const strokeCacheEntry = resolvePathStrokeCacheEntry(shape, tolerance)
  const segments = strokeCacheEntry.segments
  const candidateSegments = resolveCandidateSegmentsForPointer(
    pointer,
    segments,
    strokeCacheEntry.grid,
  )
  for (const segment of candidateSegments) {
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

/**
 * Handles isPathFillHit.
 * @param pointer Pointer position.
 * @param shape shape parameter.
 * @param tolerance tolerance parameter.
 * @param closedShape closedShape parameter.
 */
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

  const polygon = resolvePathPolygon(shape, tolerance)
  if (polygon.length < MIN_CLOSED_POLYGON_POINTS) {
    return false
  }

  return isPointInsidePolygon(pointer, polygon) || isPointNearPolygonEdge(pointer, polygon, tolerance)
}

/**
 * Handles isClosedPathShape.
 * @param shape shape parameter.
 */
export function isClosedPathShape(shape: EngineEditorHitTestNode) {
  if (typeof shape.closed === 'boolean') {
    return shape.closed
  }

  const compare = (left: EngineEditorPoint, right: EngineEditorPoint) => {
    return Math.hypot(left.x - right.x, left.y - right.y) <= CLOSED_SHAPE_EPSILON
  }

  if (shape.bezierPoints && shape.bezierPoints.length >= MIN_CLOSED_POLYGON_POINTS) {
    return compare(shape.bezierPoints[0].anchor, shape.bezierPoints[shape.bezierPoints.length - 1].anchor)
  }

  if (shape.points && shape.points.length >= MIN_CLOSED_POLYGON_POINTS) {
    return compare(shape.points[0], shape.points[shape.points.length - 1])
  }

  return false
}

// Detect point-based closed shapes that may contain multiple independent contours.
/**
 * Handles hasMultiContourPointPathCandidate.
 * @param shape shape parameter.
 * @param closedShape closedShape parameter.
 */
function hasMultiContourPointPathCandidate(
  shape: EngineEditorHitTestNode,
  closedShape: boolean,
) {
  return Boolean(
    closedShape &&
    shape.points &&
    shape.points.length >= MIN_MULTI_CONTOUR_PATH_POINTS &&
    (!shape.bezierPoints || shape.bezierPoints.length === 0),
  )
}

// Resolve path stroke segments with tolerance-aware bezier sampling density.
/**
 * Handles resolvePathSegments.
 * @param shape shape parameter.
 * @param tolerance tolerance parameter.
 */
function resolvePathSegments(shape: EngineEditorHitTestNode, tolerance: number) {
  if (shape.bezierPoints && shape.bezierPoints.length > 1) {
    const samples = sampleBezierPathPolygon(shape.bezierPoints, resolveBezierSegmentsPerCurve(tolerance, 'stroke'))
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

// Resolve one cached stroke-preprocess entry (segments + optional grid) for repeat hit tests.
/**
 * Handles resolvePathStrokeCacheEntry.
 * @param shape shape parameter.
 * @param tolerance tolerance parameter.
 */
function resolvePathStrokeCacheEntry(shape: EngineEditorHitTestNode, tolerance: number) {
  const signature = resolvePathStrokeCacheSignature(shape, tolerance)
  const cached = pathStrokeCache.get(signature)
  if (cached) {
    // Promote recency in LRU map order.
    pathStrokeCache.delete(signature)
    pathStrokeCache.set(signature, cached)
    return cached
  }

  const segments = resolvePathSegments(shape, tolerance)
  const grid = createPathStrokeSpatialGrid(segments, tolerance)
  const entry: PathStrokeCacheEntry = {
    signature,
    segments,
    grid,
  }

  pathStrokeCache.set(signature, entry)
  while (pathStrokeCache.size > PATH_STROKE_CACHE_MAX_ENTRIES) {
    const oldestKey = pathStrokeCache.keys().next().value
    if (typeof oldestKey !== 'string') {
      break
    }
    pathStrokeCache.delete(oldestKey)
  }

  return entry
}

// Resolve path fill polygon with tolerance-aware bezier sampling density.
/**
 * Handles resolvePathPolygon.
 * @param shape shape parameter.
 * @param tolerance tolerance parameter.
 */
function resolvePathPolygon(shape: EngineEditorHitTestNode, tolerance: number) {
  if (shape.bezierPoints && shape.bezierPoints.length >= MIN_BEZIER_FILL_POINTS) {
    return sampleBezierPathPolygon(shape.bezierPoints, resolveBezierSegmentsPerCurve(tolerance, 'fill'))
  }

  return shape.points ? [...shape.points] : []
}

// Resolve one stable cache signature for stroke preprocessing inputs.
/**
 * Handles resolvePathStrokeCacheSignature.
 * @param shape shape parameter.
 * @param tolerance tolerance parameter.
 */
function resolvePathStrokeCacheSignature(
  shape: EngineEditorHitTestNode,
  tolerance: number,
) {
  const strokeSegmentsPerCurve = resolveBezierSegmentsPerCurve(tolerance, 'stroke')
const roundTolerance =
      Math.round(
        Math.max(TOLERANCE_ROUNDING_MIN, tolerance) * TOLERANCE_ROUNDING_SCALE,
      ) / TOLERANCE_ROUNDING_SCALE

  if (shape.bezierPoints && shape.bezierPoints.length > 1) {
    return [
      shape.id,
      'bezier',
      strokeSegmentsPerCurve,
      roundTolerance,
      shape.bezierPoints.length,
      shape.bezierPoints[0]?.anchor?.x ?? 0,
      shape.bezierPoints[0]?.anchor?.y ?? 0,
      shape.bezierPoints[shape.bezierPoints.length - 1]?.anchor?.x ?? 0,
      shape.bezierPoints[shape.bezierPoints.length - 1]?.anchor?.y ?? 0,
      shape.width,
      shape.height,
    ].join('|')
  }

  const pointCount = shape.points?.length ?? 0
  const firstPoint = pointCount > 0 ? shape.points?.[0] : null
  const lastPoint = pointCount > 0 ? shape.points?.[pointCount - 1] : null
  return [
    shape.id,
    'points',
    strokeSegmentsPerCurve,
    roundTolerance,
    pointCount,
    firstPoint?.x ?? 0,
    firstPoint?.y ?? 0,
    lastPoint?.x ?? 0,
    lastPoint?.y ?? 0,
    shape.width,
    shape.height,
  ].join('|')
}

// Split a point path into closed contours by scanning repeated start points.
/**
 * Handles resolveClosedPointContours.
 * @param points points parameter.
 */
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
      if (point.x === start.x && point.y === start.y && contour.length >= CLOSED_CONTOUR_MIN_POINTS) {
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

// Convert one contour polyline into adjacent line segments for edge checks.
/**
 * Handles resolveContourSegments.
 * @param contour contour parameter.
 */
function resolveContourSegments(contour: EngineEditorPoint[]) {
  const segments: Array<{x1: number; y1: number; x2: number; y2: number}> = []
  for (let index = 0; index < contour.length - 1; index += 1) {
    const current = contour[index]
    const next = contour[index + 1]
    segments.push({x1: current.x, y1: current.y, x2: next.x, y2: next.y})
  }
  return segments
}

// Apply non-zero winding across all contours so holes and nested rings are handled deterministically.
/**
 * Handles resolveNonZeroWindingContains.
 * @param pointer Pointer position.
 * @param contours contours parameter.
 */
function resolveNonZeroWindingContains(pointer: EngineEditorPoint, contours: EngineEditorPoint[][]) {
  const winding = contours.reduce((sum, contour) => {
    return sum + resolveContourWinding(pointer, contour)
  }, 0)

  return winding !== 0
}

// Resolve one contour's winding contribution relative to the query point.
/**
 * Handles resolveContourWinding.
 * @param pointer Pointer position.
 * @param contour contour parameter.
 */
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

// Compute 2D cross product sign used by winding edge tests.
/**
 * Handles resolvePointCross.
 * @param from from parameter.
 * @param to to parameter.
 * @param point point parameter.
 */
function resolvePointCross(
  from: EngineEditorPoint,
  to: EngineEditorPoint,
  point: EngineEditorPoint,
) {
  return (to.x - from.x) * (point.y - from.y) - (point.x - from.x) * (to.y - from.y)
}
