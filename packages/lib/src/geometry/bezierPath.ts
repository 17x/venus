import type {Point2D} from '../math/matrix.ts'

/**
 * Defines one cubic bezier anchor point with optional in/out control points.
 */
export interface BezierPathPoint {
  /** Stores the curve anchor point. */
  readonly anchor: Point2D
  /** Stores optional incoming control point from previous segment. */
  readonly cp1?: Point2D | null
  /** Stores optional outgoing control point to next segment. */
  readonly cp2?: Point2D | null
}

/**
 * Samples chained cubic bezier segments into a polyline approximation.
 */
export function sampleBezierPathPolygon(
  points: readonly BezierPathPoint[],
  segmentsPerCurve = 12,
): Point2D[] {
  if (points.length < 2) {
    return []
  }

  const polygon: Point2D[] = []

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

/**
 * Evaluates one cubic bezier point at parametric position t.
 */
function sampleCubicBezierPoint(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number,
): Point2D {
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