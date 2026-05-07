import type {Point} from './geometry.ts'

/**
 * Computes one cubic bezier point for parameter t.
 * @param t Curve parameter in [0, 1].
 * @param p0 First control point.
 * @param p1 Second control point.
 * @param p2 Third control point.
 * @param p3 Fourth control point.
 */
export function cubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t

  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  }
}

/**
 * Solves normalized cubic derivative roots for extrema discovery.
 * @param p0 Cubic first point axis value.
 * @param p1 Cubic second point axis value.
 * @param p2 Cubic third point axis value.
 * @param p3 Cubic fourth point axis value.
 */
export function getCubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 3 * p0 - 6 * p1 + 3 * p2
  const c = -3 * p0 + 3 * p1

  return solveQuadratic(3 * a, 2 * b, c)
}

/**
 * Finds one nearest point on quadratic/cubic/linear segment by sampling.
 * @param anchor Segment start anchor.
 * @param cp1 Optional first control point.
 * @param cp2 Optional second control point.
 * @param nextAnchor Segment end anchor.
 * @param target Probe point.
 * @param steps Sampling step count.
 */
export function nearestPointOnCurve(
  anchor: Point,
  cp1: Point | null,
  cp2: Point | null,
  nextAnchor: Point,
  target: Point,
  steps = 100,
): Point {
  function lerp(p1: Point, p2: Point, t: number): Point {
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    }
  }

  function cubicCurve(t: number, localCp1: Point, localCp2: Point): Point {
    const u = 1 - t

    return {
      x:
        u ** 3 * anchor.x +
        3 * u ** 2 * t * localCp1.x +
        3 * u * t ** 2 * localCp2.x +
        t ** 3 * nextAnchor.x,
      y:
        u ** 3 * anchor.y +
        3 * u ** 2 * t * localCp1.y +
        3 * u * t ** 2 * localCp2.y +
        t ** 3 * nextAnchor.y,
    }
  }

  function quadraticCurve(t: number): Point {
    const u = 1 - t

    return {
      x:
        u ** 2 * anchor.x +
        2 * u * t * (cp1?.x ?? anchor.x) +
        t ** 2 * nextAnchor.x,
      y:
        u ** 2 * anchor.y +
        2 * u * t * (cp1?.y ?? anchor.y) +
        t ** 2 * nextAnchor.y,
    }
  }

  let minDistSq = Infinity
  let closest: Point = anchor

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    let point: Point

    if (cp1 && cp2) {
      point = cubicCurve(t, cp1, cp2)
    } else if (cp1) {
      point = quadraticCurve(t)
    } else if (cp2) {
      point = cubicCurve(t, {
        x: nextAnchor.x * 2 - cp2.x,
        y: nextAnchor.y * 2 - cp2.y,
      }, cp2)
    } else {
      point = lerp(anchor, nextAnchor, t)
    }

    const dx = point.x - target.x
    const dy = point.y - target.y
    const distSq = dx * dx + dy * dy

    if (distSq < minDistSq) {
      minDistSq = distSq
      closest = point
    }
  }

  return closest
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

  const discriminant = b * b - 4 * a * c
  if (discriminant < -epsilon) {
    return []
  }

  if (Math.abs(discriminant) <= epsilon) {
    const root = clampUnitInterval(-b / (2 * a))
    return root === null ? [] : [root]
  }

  const sqrtDiscriminant = Math.sqrt(discriminant)
  const first = clampUnitInterval((-b + sqrtDiscriminant) / (2 * a))
  const second = clampUnitInterval((-b - sqrtDiscriminant) / (2 * a))

  return [first, second].filter((value): value is number => value !== null)
}
