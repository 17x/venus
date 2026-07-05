import {
  applyAffineMatrixToPoint as applyAffineMatrixToPointFromLib,
  createAffineMatrixAroundPoint as createAffineMatrixAroundPointFromLib,
  createIdentityAffineMatrix as createIdentityAffineMatrixFromLib,
  createRotationAffineMatrix as createRotationAffineMatrixFromLib,
  createScaleAffineMatrix as createScaleAffineMatrixFromLib,
  createTranslationAffineMatrix as createTranslationAffineMatrixFromLib,
  invertAffineMatrix as invertAffineMatrixFromLib,
  multiplyAffineMatrices as multiplyAffineMatricesFromLib,
} from '@venus/lib/math'
import {getNormalizedBoundsFromBox as getNormalizedBoundsFromBoxFromLib} from '@venus/lib/geometry'
import {
  getBoundingRectFromBezierPoints as getEngineBoundingRectFromBezierPoints,
  cubicBezierPoint,
  getCubicExtrema as getEngineCubicExtrema,
} from '@venus/engine'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface BoundingRect extends Rect {
  top: number
  bottom: number
  left: number
  right: number
  cx: number
  cy: number
}

export interface NormalizedBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface BezierPoint {
  anchor: Point
  cp1?: Point | null
  cp2?: Point | null
}

/**
 * Affine 2D transform in Canvas/SVG order:
 *
 * | a c e |
 * | b d f |
 * | 0 0 1 |
 */
export type AffineMatrix = [
  number,
  number,
  number,
  number,
  number,
  number,
]

export function createIdentityAffineMatrix(): AffineMatrix {
  // Delegate to @venus/lib so affine primitive ownership stays package-level.
  return createIdentityAffineMatrixFromLib()
}

export function createTranslationAffineMatrix(tx: number, ty: number): AffineMatrix {
  // Delegate to @venus/lib so vector model keeps API shape without duplicating mechanism.
  return createTranslationAffineMatrixFromLib(tx, ty)
}

export function createScaleAffineMatrix(scaleX: number, scaleY: number): AffineMatrix {
  // Delegate to @venus/lib so scale matrix behavior is shared across packages.
  return createScaleAffineMatrixFromLib(scaleX, scaleY)
}

export function createRotationAffineMatrix(rotationDegrees: number): AffineMatrix {
  // Delegate to @venus/lib so rotation matrix math remains single-source.
  return createRotationAffineMatrixFromLib(rotationDegrees)
}

export function multiplyAffineMatrices(left: AffineMatrix, right: AffineMatrix): AffineMatrix {
  // Delegate to @venus/lib so matrix composition semantics stay consistent in runtime + engine.
  return multiplyAffineMatricesFromLib(left, right)
}

export function invertAffineMatrix(matrix: AffineMatrix): AffineMatrix {
  // Delegate to @venus/lib so singular-matrix fallback behavior is centrally maintained.
  return invertAffineMatrixFromLib(matrix)
}

export function applyAffineMatrixToPoint(matrix: AffineMatrix, point: Point): Point {
  // Delegate to @venus/lib so point transform math remains shared and deterministic.
  return applyAffineMatrixToPointFromLib(matrix, point)
}

export function createAffineMatrixAroundPoint(
  center: Point,
  options?: {
    rotationDegrees?: number
    scaleX?: number
    scaleY?: number
  },
): AffineMatrix {
  // Delegate to @venus/lib so around-point composition does not drift between model/runtime usages.
  return createAffineMatrixAroundPointFromLib(center, options)
}

export function getNormalizedBoundsFromBox(
  x: number,
  y: number,
  width: number,
  height: number,
): NormalizedBounds {
  // Delegate to @venus/lib so normalized bounds are produced by one package-owned implementation.
  return getNormalizedBoundsFromBoxFromLib(x, y, width, height)
}

export function getBoundingRectFromBezierPoints(points: BezierPoint[]): BoundingRect {
  const bounds = getEngineBoundingRectFromBezierPoints(points)
  const left = bounds.x
  const right = bounds.x + bounds.width
  const top = bounds.y
  const bottom = bounds.y + bounds.height

  return {
    ...bounds,
    left,
    right,
    top,
    bottom,
    cx: left + bounds.width / 2,
    cy: top + bounds.height / 2,
  }
}

export function convertDrawPointsToBezierPoints(points: Point[], tension = 0.3): {
  points: BezierPoint[]
  closed: boolean
} {
  const filtered: Point[] = []
  const offsetThreshold = 2
  const closeThreshold = 20

  for (let index = 0; index < points.length; index += 1) {
    if (index === 0) {
      filtered.push(points[index])
      continue
    }

    const previous = filtered[filtered.length - 1]
    const dx = points[index].x - previous.x
    const dy = points[index].y - previous.y

    if (Math.hypot(dx, dy) >= offsetThreshold) {
      filtered.push(points[index])
    }
  }

  const closed =
    filtered.length > 2 &&
    Math.hypot(
      filtered[0].x - filtered[filtered.length - 1].x,
      filtered[0].y - filtered[filtered.length - 1].y,
    ) < closeThreshold

  const bezierPoints: BezierPoint[] = []

  for (let index = 0; index < filtered.length; index += 1) {
    const previous =
      filtered[index - 1] ?? (closed ? filtered[filtered.length - 2] : filtered[index])
    const current = filtered[index]
    const next =
      filtered[index + 1] ?? (closed ? filtered[(index + 1) % filtered.length] : filtered[index])
    const dx = (next.x - previous.x) * tension
    const dy = (next.y - previous.y) * tension

    let cp1: Point | null = null
    let cp2: Point | null = null

    if (index !== 0 || closed) {
      cp1 = {
        x: current.x - dx,
        y: current.y - dy,
      }
    }

    if (index !== filtered.length - 1 || closed) {
      cp2 = cp1
        ? {
            x: current.x * 2 - cp1.x,
            y: current.y * 2 - cp1.y,
          }
        : {
            x: current.x + dx,
            y: current.y + dy,
          }
    }

    bezierPoints.push({
      anchor: {...current},
      cp1,
      cp2,
    })
  }

  return {
    points: bezierPoints,
    closed,
  }
}

/**
 * Computes one cubic bezier point for parameter t.
 * Delegates to @venus/engine for deterministic bezier sampling.
 * @param t Curve parameter in [0, 1].
 * @param p0 First control point.
 * @param p1 Second control point.
 * @param p2 Third control point.
 * @param p3 Fourth control point.
 */
export function cubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  return cubicBezierPoint(t, p0, p1, p2, p3)
}

/**
 * Solves normalized cubic derivative roots for extrema discovery.
 * Delegates to @venus/engine for shared extrema computation.
 * @param p0 Cubic first point axis value.
 * @param p1 Cubic second point axis value.
 * @param p2 Cubic third point axis value.
 * @param p3 Cubic fourth point axis value.
 */
export function getCubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  return getEngineCubicExtrema(p0, p1, p2, p3)
}
