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
import {cubicBezier, getCubicExtrema} from './geometry.curves.ts'
export {nearestPointOnCurve} from './geometry.curves.ts'
export {cubicBezier} from './geometry.curves.ts'

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

export function rotatePointAroundPoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rotation: number,
) {
  const dx = px - cx
  const dy = py - cy
  const angle = rotation * (Math.PI / 180)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

export function flipPointAroundPoint(
  point: Point,
  center: Point,
  flipX?: boolean,
  flipY?: boolean,
): Point {
  return {
    x: flipX ? center.x - (point.x - center.x) : point.x,
    y: flipY ? center.y - (point.y - center.y) : point.y,
  }
}

export function transformPoints(points: Point[], matrix: DOMMatrix): Point[] {
  return points.map((point) => matrix.transformPoint(point))
}

export function isPointNear(p1: Point, p2: Point, tolerance: number = 3): boolean {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  const distanceSquared = dx * dx + dy * dy

  return distanceSquared <= tolerance * tolerance
}


export const generateBoundingRectFromRect = (rect: Rect): BoundingRect => {
  const {x, y, width, height} = rect

  return {
    x,
    y,
    width,
    height,
    top: y,
    bottom: y + height,
    left: x,
    right: x + width,
    cx: x + width / 2,
    cy: y + height / 2,
  }
}

export const generateBoundingRectFromTwoPoints = (p1: Point, p2: Point): BoundingRect => {
  const minX = Math.min(p1.x, p2.x)
  const maxX = Math.max(p1.x, p2.x)
  const minY = Math.min(p1.y, p2.y)
  const maxY = Math.max(p1.y, p2.y)

  return generateBoundingRectFromRect({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  })
}

export const generateBoundingRectFromRotatedRect = (
  {x, y, width, height}: Rect,
  rotation: number,
): BoundingRect => {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rotatedWidth = Math.abs(width * cos) + Math.abs(height * sin)
  const rotatedHeight = Math.abs(width * sin) + Math.abs(height * cos)

  return generateBoundingRectFromRect({
    x: centerX - rotatedWidth / 2,
    y: centerY - rotatedHeight / 2,
    width: rotatedWidth,
    height: rotatedHeight,
  })
}

export function rectsOverlap(r1: BoundingRect, r2: BoundingRect): boolean {
  return !(
    r1.right < r2.left ||
    r1.left > r2.right ||
    r1.bottom < r2.top ||
    r1.top > r2.bottom
  )
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

export const isInsideRotatedRect = (
  {x: mouseX, y: mouseY}: Point,
  rect: Rect,
  rotation: number,
): boolean => {
  const {x: centerX, y: centerY, width, height} = rect

  if (width <= 0 || height <= 0) {
    return false
  }

  if (rotation === 0) {
    const halfWidth = width / 2
    const halfHeight = height / 2

    return (
      mouseX >= centerX - halfWidth && mouseX <= centerX + halfWidth &&
      mouseY >= centerY - halfHeight && mouseY <= centerY + halfHeight
    )
  }

  const angle = rotation * (Math.PI / 180)
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)
  const dx = mouseX - centerX
  const dy = mouseY - centerY
  const unrotatedX = dx * cosAngle + dy * sinAngle
  const unrotatedY = -dx * sinAngle + dy * cosAngle
  const halfWidth = width / 2
  const halfHeight = height / 2

  return (
    unrotatedX >= -halfWidth && unrotatedX <= halfWidth &&
    unrotatedY >= -halfHeight && unrotatedY <= halfHeight
  )
}

export function getBoundingRectFromBezierPoints(points: BezierPoint[]): BoundingRect {
  if (points.length === 0) {
    return generateBoundingRectFromRect({x: 0, y: 0, width: 0, height: 0})
  }

  const curvePoints: Point[] = []

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const current = points[i]
    const p0 = prev.anchor
    const p1 = prev.cp2 ?? prev.anchor
    const p2 = current.cp1 ?? current.anchor
    const p3 = current.anchor

    // Exact cubic bounds must include derivative extrema; endpoint sampling
    // alone can miss the true MBR on strongly curved segments.
    const ts = new Set<number>([0, 1])

    for (const t of getCubicExtrema(p0.x, p1.x, p2.x, p3.x)) {
      ts.add(t)
    }

    for (const t of getCubicExtrema(p0.y, p1.y, p2.y, p3.y)) {
      ts.add(t)
    }

    for (const t of ts) {
      curvePoints.push(cubicBezier(t, p0, p1, p2, p3))
    }
  }

  if (points.length === 1) {
    curvePoints.push(points[0].anchor)
  }

  const xs = curvePoints.map((point) => point.x)
  const ys = curvePoints.map((point) => point.y)
  const left = xs.reduce((min, x) => Math.min(min, x), Infinity)
  const right = xs.reduce((max, x) => Math.max(max, x), -Infinity)
  const top = ys.reduce((min, y) => Math.min(min, y), Infinity)
  const bottom = ys.reduce((max, y) => Math.max(max, y), -Infinity)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    left,
    right,
    top,
    bottom,
    cx: left + (right - left) / 2,
    cy: top + (bottom - top) / 2,
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
