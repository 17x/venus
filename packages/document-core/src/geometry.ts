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
  return [1, 0, 0, 1, 0, 0]
}

export function createTranslationAffineMatrix(tx: number, ty: number): AffineMatrix {
  return [1, 0, 0, 1, tx, ty]
}

export function createScaleAffineMatrix(scaleX: number, scaleY: number): AffineMatrix {
  return [scaleX, 0, 0, scaleY, 0, 0]
}

export function createRotationAffineMatrix(rotationDegrees: number): AffineMatrix {
  const angle = rotationDegrees * (Math.PI / 180)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return [cos, sin, -sin, cos, 0, 0]
}

export function multiplyAffineMatrices(left: AffineMatrix, right: AffineMatrix): AffineMatrix {
  const [la, lb, lc, ld, le, lf] = left
  const [ra, rb, rc, rd, re, rf] = right

  return [
    la * ra + lc * rb,
    lb * ra + ld * rb,
    la * rc + lc * rd,
    lb * rc + ld * rd,
    la * re + lc * rf + le,
    lb * re + ld * rf + lf,
  ]
}

export function invertAffineMatrix(matrix: AffineMatrix): AffineMatrix {
  const [a, b, c, d, e, f] = matrix
  const determinant = a * d - b * c

  if (Math.abs(determinant) <= 1e-9) {
    return createIdentityAffineMatrix()
  }

  const inverseDeterminant = 1 / determinant
  const nextA = d * inverseDeterminant
  const nextB = -b * inverseDeterminant
  const nextC = -c * inverseDeterminant
  const nextD = a * inverseDeterminant

  return [
    nextA,
    nextB,
    nextC,
    nextD,
    -(nextA * e + nextC * f),
    -(nextB * e + nextD * f),
  ]
}

export function applyAffineMatrixToPoint(matrix: AffineMatrix, point: Point): Point {
  return {
    x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
    y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
  }
}

export function createAffineMatrixAroundPoint(
  center: Point,
  options?: {
    rotationDegrees?: number
    scaleX?: number
    scaleY?: number
  },
): AffineMatrix {
  const rotationDegrees = options?.rotationDegrees ?? 0
  const scaleX = options?.scaleX ?? 1
  const scaleY = options?.scaleY ?? 1

  return multiplyAffineMatrices(
    multiplyAffineMatrices(
      createTranslationAffineMatrix(center.x, center.y),
      multiplyAffineMatrices(
        createRotationAffineMatrix(rotationDegrees),
        createScaleAffineMatrix(scaleX, scaleY),
      ),
    ),
    createTranslationAffineMatrix(-center.x, -center.y),
  )
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

export function cubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t

  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  }
}

function clampUnitInterval(value: number) {
  if (value <= 0 || value >= 1) {
    return null
  }

  return value
}

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

function getCubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 3 * p0 - 6 * p1 + 3 * p2
  const c = -3 * p0 + 3 * p1

  return solveQuadratic(3 * a, 2 * b, c)
}

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
