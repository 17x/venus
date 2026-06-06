import type { EngineEditorPoint } from '../hitTest.ts'
import {
  isPointInsideEllipse,
  isPointNearEllipseEdge,
  isPointNearLineSegment,
} from './geometry.ts'

const ARC_EPSILON_DEGREES = 1e-3
const DEGREES_FULL_CIRCLE = 360
const DEGREES_HALF_CIRCLE = 180
const HALF_DIVISOR = 2
const BEZIER_SEGMENT_MIN_TOLERANCE = 0.5
const BEZIER_SEGMENT_HIGH_TOLERANCE = 8
const BEZIER_SEGMENT_MEDIUM_TOLERANCE = 4
const BEZIER_SEGMENT_HIGH_FILL = 8
const BEZIER_SEGMENT_HIGH_STROKE = 6
const BEZIER_SEGMENT_MEDIUM_FILL = 12
const BEZIER_SEGMENT_MEDIUM_STROKE = 10
const BEZIER_SEGMENT_LOW_FILL = 18
const BEZIER_SEGMENT_LOW_STROKE = 14

/**
 * Stores normalized bounds used by arc hit-test helpers.
 */
interface EllipseBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Stores the minimal ellipse-arc angle payload required by arc helpers.
 */
interface EllipseArcNodeLike {
  ellipseStartAngle?: number
  ellipseEndAngle?: number
}

// Resolve whether ellipse node should be treated as an arc-sector instead of a full ellipse.
/**
 * Handles hasEllipseArcHitRange.
 * @param shape shape parameter.
 */
export function hasEllipseArcHitRange(shape: EllipseArcNodeLike) {
  if (typeof shape.ellipseStartAngle !== 'number' || typeof shape.ellipseEndAngle !== 'number') {
    return false
  }

  const sweep = Math.abs(shape.ellipseEndAngle - shape.ellipseStartAngle) % DEGREES_FULL_CIRCLE
  return sweep > ARC_EPSILON_DEGREES && sweep < DEGREES_FULL_CIRCLE - ARC_EPSILON_DEGREES
}

// Resolve point-in-ellipse-arc-sector fill hit so missing wedges do not register.
/**
 * Handles isPointInsideEllipseArcSector.
 * @param pointer Pointer position.
 * @param bounds Bounds data.
 * @param shape shape parameter.
 */
export function isPointInsideEllipseArcSector(
  pointer: EngineEditorPoint,
  bounds: EllipseBounds,
  shape: EllipseArcNodeLike,
) {
  if (!isPointInsideEllipse(pointer, bounds)) {
    return false
  }

  const angle = resolveEllipseAngleDegrees(pointer, bounds)
  return isAngleInsideArcDegrees(
    angle,
    shape.ellipseStartAngle ?? 0,
    shape.ellipseEndAngle ?? DEGREES_FULL_CIRCLE,
  )
}

// Resolve stroke hit for ellipse arcs: curved arc edge + two radial boundaries.
/**
 * Handles isPointNearEllipseArcSectorEdge.
 * @param pointer Pointer position.
 * @param bounds Bounds data.
 * @param shape shape parameter.
 * @param tolerance tolerance parameter.
 */
export function isPointNearEllipseArcSectorEdge(
  pointer: EngineEditorPoint,
  bounds: EllipseBounds,
  shape: EllipseArcNodeLike,
  tolerance: number,
) {
  const startDegrees = shape.ellipseStartAngle ?? 0
  const endDegrees = shape.ellipseEndAngle ?? DEGREES_FULL_CIRCLE
  const pointAngle = resolveEllipseAngleDegrees(pointer, bounds)

  // Keep curved arc stroke hit bounded to active sweep.
  if (
    isAngleInsideArcDegrees(pointAngle, startDegrees, endDegrees) &&
    isPointNearEllipseEdge(pointer, bounds, tolerance)
  ) {
    return true
  }

  const center = resolveEllipseCenter(bounds)
  const startPoint = resolveEllipseArcBoundaryPoint(bounds, startDegrees)
  const endPoint = resolveEllipseArcBoundaryPoint(bounds, endDegrees)

  // Include radial edges because wedge sectors render/clip with center connection.
  return (
    isPointNearLineSegment(pointer, {x1: center.x, y1: center.y, x2: startPoint.x, y2: startPoint.y}, tolerance) ||
    isPointNearLineSegment(pointer, {x1: center.x, y1: center.y, x2: endPoint.x, y2: endPoint.y}, tolerance)
  )
}

// Resolve bezier sampling density from tolerance for clip path checks.
/**
 * Handles resolveBezierSegmentsPerCurveFromTolerance.
 * @param tolerance tolerance parameter.
 * @param mode mode parameter.
 */
export function resolveBezierSegmentsPerCurveFromTolerance(
  tolerance: number,
  mode: 'stroke' | 'fill',
) {
  const safeTolerance = Math.max(BEZIER_SEGMENT_MIN_TOLERANCE, tolerance)
  if (safeTolerance >= BEZIER_SEGMENT_HIGH_TOLERANCE) {
    return mode === 'fill' ? BEZIER_SEGMENT_HIGH_FILL : BEZIER_SEGMENT_HIGH_STROKE
  }
  if (safeTolerance >= BEZIER_SEGMENT_MEDIUM_TOLERANCE) {
    return mode === 'fill' ? BEZIER_SEGMENT_MEDIUM_FILL : BEZIER_SEGMENT_MEDIUM_STROKE
  }
  return mode === 'fill' ? BEZIER_SEGMENT_LOW_FILL : BEZIER_SEGMENT_LOW_STROKE
}

// Resolve pointer polar angle on normalized ellipse coordinates in degrees.
/**
 * Handles resolveEllipseAngleDegrees.
 * @param pointer Pointer position.
 * @param bounds Bounds data.
 */
function resolveEllipseAngleDegrees(
  pointer: EngineEditorPoint,
  bounds: EllipseBounds,
) {
  const radiusX = Math.max(Number.EPSILON, (bounds.maxX - bounds.minX) / HALF_DIVISOR)
  const radiusY = Math.max(Number.EPSILON, (bounds.maxY - bounds.minY) / HALF_DIVISOR)
  const center = resolveEllipseCenter(bounds)
  const normalizedX = (pointer.x - center.x) / radiusX
  // Screen/world Y grows downward: 0deg right and +90deg down.
  const normalizedY = (pointer.y - center.y) / radiusY
  return normalizeAngleDegrees((Math.atan2(normalizedY, normalizedX) * DEGREES_HALF_CIRCLE) / Math.PI)
}

// Resolve ellipse center from normalized bounds.
/**
 * Handles resolveEllipseCenter.
 * @param bounds Bounds data.
 */
function resolveEllipseCenter(bounds: EllipseBounds) {
  return {
    x: (bounds.minX + bounds.maxX) / HALF_DIVISOR,
    y: (bounds.minY + bounds.maxY) / HALF_DIVISOR,
  }
}

// Resolve one boundary point on ellipse for radial edge checks.
/**
 * Handles resolveEllipseArcBoundaryPoint.
 * @param bounds Bounds data.
 * @param angleDegrees angleDegrees parameter.
 */
function resolveEllipseArcBoundaryPoint(
  bounds: EllipseBounds,
  angleDegrees: number,
) {
  const center = resolveEllipseCenter(bounds)
  const radiusX = (bounds.maxX - bounds.minX) / HALF_DIVISOR
  const radiusY = (bounds.maxY - bounds.minY) / HALF_DIVISOR
  const radians = (angleDegrees * Math.PI) / DEGREES_HALF_CIRCLE
  return {
    x: center.x + radiusX * Math.cos(radians),
    // Screen/world Y grows downward: +90deg is the bottom boundary.
    y: center.y + radiusY * Math.sin(radians),
  }
}

// Normalize degrees into [0, 360) for arc comparisons.
/**
 * Handles normalizeAngleDegrees.
 * @param value value parameter.
 */
function normalizeAngleDegrees(value: number) {
  let normalized = value % DEGREES_FULL_CIRCLE
  if (normalized < 0) {
    normalized += DEGREES_FULL_CIRCLE
  }
  return normalized
}

// Resolve whether angle falls inside arc range, including wrapped sweeps.
/**
 * Handles isAngleInsideArcDegrees.
 * @param angle angle parameter.
 * @param startAngle startAngle parameter.
 * @param endAngle endAngle parameter.
 */
function isAngleInsideArcDegrees(angle: number, startAngle: number, endAngle: number) {
  const normalizedAngle = normalizeAngleDegrees(angle)
  const normalizedStart = normalizeAngleDegrees(startAngle)
  const normalizedEnd = normalizeAngleDegrees(endAngle)

  if (normalizedStart <= normalizedEnd) {
    return normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd
  }

  return normalizedAngle >= normalizedStart || normalizedAngle <= normalizedEnd
}
