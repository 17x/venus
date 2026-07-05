import type { EngineBezierPoint, EnginePoint, EngineRect } from '../types/types.ts'

const CUBIC_BEZIER_BLEND_COEFFICIENT = 3
const QUADRATIC_DOUBLE = 2
const QUADRATIC_DISCRIMINANT_FACTOR = 4

/**
 * Samples one cubic bezier curve into a polyline using fixed segment count.
  * @param points points parameter.
 * @param segments segments parameter.
*/
export function sampleBezierCurve(
  points: { start: EngineBezierPoint; end: EngineBezierPoint },
  segments = 16,
): EnginePoint[] {
  const safeSegments = Math.max(1, Math.floor(segments))
  const startAnchor = points.start.anchor
  const endAnchor = points.end.anchor
  const cp1 = points.start.cp2 ?? startAnchor
  const cp2 = points.end.cp1 ?? endAnchor
  const sampled: EnginePoint[] = []

  for (let index = 0; index <= safeSegments; index += 1) {
    const t = index / safeSegments
    const mt = 1 - t
    sampled.push({
      x:
        mt * mt * mt * startAnchor.x +
        CUBIC_BEZIER_BLEND_COEFFICIENT * mt * mt * t * cp1.x +
        CUBIC_BEZIER_BLEND_COEFFICIENT * mt * t * t * cp2.x +
        t * t * t * endAnchor.x,
      y:
        mt * mt * mt * startAnchor.y +
        CUBIC_BEZIER_BLEND_COEFFICIENT * mt * mt * t * cp1.y +
        CUBIC_BEZIER_BLEND_COEFFICIENT * mt * t * t * cp2.y +
        t * t * t * endAnchor.y,
    })
  }

  return sampled
}

/**
 * Computes one cubic bezier point for parameter t.
 * @param t Curve parameter in [0, 1].
 * @param p0 First control point.
 * @param p1 Second control point.
 * @param p2 Third control point.
 * @param p3 Fourth control point.
 */
export function cubicBezierPoint(
  t: number,
  p0: EnginePoint,
  p1: EnginePoint,
  p2: EnginePoint,
  p3: EnginePoint,
): EnginePoint {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t

  return {
    x:
      mt2 * mt * p0.x +
      CUBIC_BEZIER_BLEND_COEFFICIENT * mt2 * t * p1.x +
      CUBIC_BEZIER_BLEND_COEFFICIENT * mt * t2 * p2.x +
      t2 * t * p3.x,
    y:
      mt2 * mt * p0.y +
      CUBIC_BEZIER_BLEND_COEFFICIENT * mt2 * t * p1.y +
      CUBIC_BEZIER_BLEND_COEFFICIENT * mt * t2 * p2.y +
      t2 * t * p3.y,
  }
}

/**
 * Computes tight-ish axis-aligned bounds for a bezier path.
 * @param points Ordered bezier anchors.
 */
export function getBoundingRectFromBezierPoints(points: readonly EngineBezierPoint[]): EngineRect {
  if (points.length === 0) {
    return {x: 0, y: 0, width: 0, height: 0}
  }

  const curvePoints: EnginePoint[] = []

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const p0 = previous.anchor
    const p1 = previous.cp2 ?? previous.anchor
    const p2 = current.cp1 ?? current.anchor
    const p3 = current.anchor
    const ts = new Set<number>([0, 1])

    for (const t of getCubicExtrema(p0.x, p1.x, p2.x, p3.x)) {
      ts.add(t)
    }

    for (const t of getCubicExtrema(p0.y, p1.y, p2.y, p3.y)) {
      ts.add(t)
    }

    for (const t of ts) {
      curvePoints.push(cubicBezierPoint(t, p0, p1, p2, p3))
    }
  }

  if (points.length === 1) {
    curvePoints.push(points[0].anchor)
  }

  return getBoundingRectFromPoints(curvePoints)
}

/**
 * Computes normalized cubic derivative roots for extrema discovery.
 * @param p0 Cubic first point axis value.
 * @param p1 Cubic second point axis value.
 * @param p2 Cubic third point axis value.
 * @param p3 Cubic fourth point axis value.
 */
export function getCubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + CUBIC_BEZIER_BLEND_COEFFICIENT * p1 - CUBIC_BEZIER_BLEND_COEFFICIENT * p2 + p3
  const b = CUBIC_BEZIER_BLEND_COEFFICIENT * p0 -
    (CUBIC_BEZIER_BLEND_COEFFICIENT * QUADRATIC_DOUBLE) * p1 +
    CUBIC_BEZIER_BLEND_COEFFICIENT * p2
  const c = -CUBIC_BEZIER_BLEND_COEFFICIENT * p0 + CUBIC_BEZIER_BLEND_COEFFICIENT * p1

  return solveQuadratic(CUBIC_BEZIER_BLEND_COEFFICIENT * a, QUADRATIC_DOUBLE * b, c)
}

/**
 * Resolves bounds for a point set.
 * @param points Points to bound.
 */
function getBoundingRectFromPoints(points: readonly EnginePoint[]): EngineRect {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Solves one quadratic and returns roots constrained to open unit interval.
 * @param a Quadratic coefficient.
 * @param b Linear coefficient.
 * @param c Constant coefficient.
 */
function solveQuadratic(a: number, b: number, c: number): number[] {
  const epsilon = 1e-9

  if (Math.abs(a) <= epsilon) {
    if (Math.abs(b) <= epsilon) {
      return []
    }

    const root = clampUnitInterval(-c / b)
    return root === null ? [] : [root]
  }

  const discriminant = b * b - QUADRATIC_DISCRIMINANT_FACTOR * a * c
  if (discriminant < -epsilon) {
    return []
  }

  if (Math.abs(discriminant) <= epsilon) {
    const root = clampUnitInterval(-b / (QUADRATIC_DOUBLE * a))
    return root === null ? [] : [root]
  }

  const sqrtDiscriminant = Math.sqrt(discriminant)
  const first = clampUnitInterval((-b + sqrtDiscriminant) / (QUADRATIC_DOUBLE * a))
  const second = clampUnitInterval((-b - sqrtDiscriminant) / (QUADRATIC_DOUBLE * a))

  return [first, second].filter((value): value is number => value !== null)
}

/**
 * Clamps values into open unit interval and returns null for out-of-range values.
 * @param value Candidate root.
 */
function clampUnitInterval(value: number) {
  if (value <= 0 || value >= 1) {
    return null
  }

  return value
}
