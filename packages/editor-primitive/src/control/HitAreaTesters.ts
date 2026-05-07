import type {Point2D} from '@venus/lib'
import type {
  ArcSectorHitArea,
  CircleHitArea,
  ControlHitArea,
  PathHitArea,
  PointHitArea,
  PolygonHitArea,
  PolylineHitArea,
  RectHitArea,
  RotatedRectHitArea,
  SegmentHitArea,
} from './HitArea.ts'

/**
 * Defines optional path-tester injection so callers can plug engine path hit
 * tests without taking a hard dependency on the engine package.
 */
export interface ControlHitAreaTesters {
  /** Stores optional path tester for path hit areas. */
  testPath?: (pathId: string, pointer: Point2D, options?: {tolerance?: number; closed?: boolean}) => boolean
}

/**
 * Resolves whether a pointer hits a single overlay control hit area.
 *
 * Each branch keeps math local so callers can reuse this from runtime/UI
 * without pulling rendering dependencies. Path/custom branches delegate so
 * element-specific elements can extend without modifying core code.
 */
export function isPointerInsideControlHitArea(
  pointer: Point2D,
  area: ControlHitArea,
  testers?: ControlHitAreaTesters,
): boolean {
  switch (area.kind) {
    case 'point':
      return testPointHit(pointer, area)
    case 'rect':
      return testRectHit(pointer, area)
    case 'rotated-rect':
      return testRotatedRectHit(pointer, area)
    case 'segment':
      return testSegmentHit(pointer, area)
    case 'circle':
      return testCircleHit(pointer, area)
    case 'arc-sector':
      return testArcSectorHit(pointer, area)
    case 'polygon':
      return testPolygonHit(pointer, area)
    case 'polyline':
      return testPolylineHit(pointer, area)
    case 'path':
      return testPathHit(pointer, area, testers)
    case 'custom':
      // Delegate fully to host tester so element-specific elements stay open.
      return area.test(pointer)
    default:
      return false
  }
}

// Resolve point-vs-circle distance check using tolerance as radius.
function testPointHit(pointer: Point2D, area: PointHitArea) {
  const dx = pointer.x - area.center.x
  const dy = pointer.y - area.center.y
  return Math.hypot(dx, dy) <= area.tolerance
}

// Resolve axis-aligned rect membership including optional tolerance band.
function testRectHit(pointer: Point2D, area: RectHitArea) {
  const tolerance = area.tolerance ?? 0
  return (
    pointer.x >= area.minX - tolerance &&
    pointer.x <= area.maxX + tolerance &&
    pointer.y >= area.minY - tolerance &&
    pointer.y <= area.maxY + tolerance
  )
}

// Resolve rotated rect membership through polygon containment.
function testRotatedRectHit(pointer: Point2D, area: RotatedRectHitArea) {
  if (isPointInsidePolygon(pointer, area.corners)) {
    return true
  }

  const tolerance = area.tolerance ?? 0
  if (tolerance <= 0) {
    return false
  }

  // Tolerance band falls back to four-edge segment proximity for rotated rects.
  for (let index = 0; index < area.corners.length; index += 1) {
    const from = area.corners[index]
    const to = area.corners[(index + 1) % area.corners.length]
    if (distancePointToSegment(pointer, from, to) <= tolerance) {
      return true
    }
  }

  return false
}

// Resolve perpendicular distance to the segment, clamped to ends.
function testSegmentHit(pointer: Point2D, area: SegmentHitArea) {
  return distancePointToSegment(pointer, area.from, area.to) <= area.tolerance
}

// Resolve circle membership without sqrt by squaring radius.
function testCircleHit(pointer: Point2D, area: CircleHitArea) {
  const dx = pointer.x - area.center.x
  const dy = pointer.y - area.center.y
  return dx * dx + dy * dy <= area.radius * area.radius
}

// Resolve arc-sector ring membership including wrapped angle ranges.
function testArcSectorHit(pointer: Point2D, area: ArcSectorHitArea) {
  const dx = pointer.x - area.center.x
  const dy = pointer.y - area.center.y
  const distance = Math.hypot(dx, dy)
  if (distance < area.innerRadius || distance > area.outerRadius) {
    return false
  }

  const angle = normalizeDegrees((Math.atan2(dy, dx) * 180) / Math.PI)
  return isAngleInsideRange(angle, area.startAngleDegrees, area.endAngleDegrees)
}

// Resolve polygon containment via ray casting.
function testPolygonHit(pointer: Point2D, area: PolygonHitArea) {
  return isPointInsidePolygon(pointer, area.points)
}

// Resolve open polyline stroke proximity by checking segment distances.
function testPolylineHit(pointer: Point2D, area: PolylineHitArea) {
  for (let index = 0; index < area.points.length - 1; index += 1) {
    const from = area.points[index]
    const to = area.points[index + 1]
    if (distancePointToSegment(pointer, from, to) <= area.tolerance) {
      return true
    }
  }
  return false
}

// Resolve path tester through host adapter; missing adapter means no hit.
function testPathHit(pointer: Point2D, area: PathHitArea, testers?: ControlHitAreaTesters) {
  if (!testers?.testPath) {
    // Path hit area requires host wiring; without it, treat as miss to avoid
    // coupling primitive package to engine internals.
    return false
  }
  return testers.testPath(area.pathId, pointer, {
    tolerance: area.tolerance,
    closed: area.closed,
  })
}

/**
 * Resolves pointer-to-segment distance with end clamping.
 */
export function distancePointToSegment(pointer: Point2D, from: Point2D, to: Point2D) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared <= Number.EPSILON) {
    return Math.hypot(pointer.x - from.x, pointer.y - from.y)
  }

  const projected = ((pointer.x - from.x) * dx + (pointer.y - from.y) * dy) / lengthSquared
  const clamped = Math.max(0, Math.min(1, projected))
  const closestX = from.x + clamped * dx
  const closestY = from.y + clamped * dy
  return Math.hypot(pointer.x - closestX, pointer.y - closestY)
}

/**
 * Resolves whether a point sits inside a closed polygon via ray casting.
 */
export function isPointInsidePolygon(pointer: Point2D, polygon: readonly Point2D[]) {
  if (polygon.length < 3) {
    return false
  }

  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    const intersects =
      (a.y > pointer.y) !== (b.y > pointer.y) &&
      pointer.x < ((b.x - a.x) * (pointer.y - a.y)) / (b.y - a.y + Number.EPSILON) + a.x
    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

// Normalize raw degrees into [0, 360) for stable wrap comparisons.
function normalizeDegrees(value: number) {
  let normalized = value % 360
  if (normalized < 0) {
    normalized += 360
  }
  return normalized
}

// Resolve whether normalized angle falls inside (possibly wrapped) range.
function isAngleInsideRange(angle: number, startDegrees: number, endDegrees: number) {
  const normalizedAngle = normalizeDegrees(angle)
  const normalizedStart = normalizeDegrees(startDegrees)
  const normalizedEnd = normalizeDegrees(endDegrees)
  if (normalizedStart <= normalizedEnd) {
    return normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd
  }
  return normalizedAngle >= normalizedStart || normalizedAngle <= normalizedEnd
}
