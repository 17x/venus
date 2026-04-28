import type {
  EngineBezierPoint,
  EnginePoint,
  EngineRect,
  EngineRenderableNode,
  EngineShapeNode,
} from '../types/types.ts'

export type EngineBoundsMatrix = readonly [number, number, number, number, number, number]

const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2
const STROKE_INSET_DIVISOR = 2
const CUBIC_BLEND_COEFFICIENT = 3
const QUADRATIC_DOUBLE = 2
const QUADRATIC_DISCRIMINANT_FACTOR = 4
const TEXT_WIDTH_ESTIMATE_MULTIPLIER = 0.6
const EXPAND_RECT_DOUBLE = 2

/**
 * Handles resolveLeafNodeWorldBounds.
 * @param node Target node.
 * @param worldMatrix worldMatrix parameter.
 */
export function resolveLeafNodeWorldBounds(
  node: Exclude<EngineRenderableNode, Extract<EngineRenderableNode, {type: 'group'}>>,
  worldMatrix: EngineBoundsMatrix,
): EngineRect | null {
  switch (node.type) {
    case 'image':
      return toWorldAxisAlignedBounds({
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      }, worldMatrix)
    case 'text': {
      const width = node.width ?? estimateTextWidth(node)
      const lineHeight = node.style.lineHeight ?? node.style.fontSize * TEXT_LINE_HEIGHT_MULTIPLIER
      const height = node.height ?? lineHeight
      return toWorldAxisAlignedBounds({
        x: node.x,
        y: node.y,
        width,
        height,
      }, worldMatrix)
    }
    case 'shape':
      return toWorldAxisAlignedBounds(resolveShapeLocalBounds(node), worldMatrix)
    default:
      return null
  }
}

/**
 * Handles toWorldAxisAlignedBounds.
 * @param rect rect parameter.
 * @param worldMatrix worldMatrix parameter.
 */
export function toWorldAxisAlignedBounds(
  rect: EngineRect,
  worldMatrix: EngineBoundsMatrix,
): EngineRect {
  const p1 = applyMatrixToPoint(worldMatrix, {x: rect.x, y: rect.y})
  const p2 = applyMatrixToPoint(worldMatrix, {x: rect.x + rect.width, y: rect.y})
  const p3 = applyMatrixToPoint(worldMatrix, {x: rect.x, y: rect.y + rect.height})
  const p4 = applyMatrixToPoint(worldMatrix, {x: rect.x + rect.width, y: rect.y + rect.height})

  const minX = Math.min(p1.x, p2.x, p3.x, p4.x)
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x)
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y)
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Handles resolveShapeLocalBounds.
 * @param node Target node.
 */
function resolveShapeLocalBounds(node: EngineShapeNode): EngineRect {
  const geometryBounds = resolveShapeGeometryLocalBounds(node) ?? {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  }
  const strokeInset = Math.max(0, node.strokeWidth ?? 0) / STROKE_INSET_DIVISOR

  return strokeInset > 0
    ? expandRect(geometryBounds, strokeInset)
    : geometryBounds
}

/**
 * Handles resolveShapeGeometryLocalBounds.
 * @param node Target node.
 */
function resolveShapeGeometryLocalBounds(node: EngineShapeNode): EngineRect | null {
  if (node.bezierPoints && node.bezierPoints.length > 0) {
    return getBoundingRectFromBezierPoints(node.bezierPoints)
  }

  if (node.points && node.points.length > 0) {
    return getBoundingRectFromPoints(node.points)
  }

  return null
}

/**
 * Handles getBoundingRectFromPoints.
 * @param points points parameter.
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
 * Handles getBoundingRectFromBezierPoints.
 * @param points points parameter.
 */
function getBoundingRectFromBezierPoints(points: readonly EngineBezierPoint[]): EngineRect {
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
      curvePoints.push(cubicBezier(t, p0, p1, p2, p3))
    }
  }

  if (points.length === 1) {
    curvePoints.push(points[0].anchor)
  }

  return getBoundingRectFromPoints(curvePoints)
}

/**
 * Handles cubicBezier.
 * @param t t parameter.
 * @param p0 p0 parameter.
 * @param p1 p1 parameter.
 * @param p2 p2 parameter.
 * @param p3 p3 parameter.
 */
function cubicBezier(
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
    x: mt2 * mt * p0.x + CUBIC_BLEND_COEFFICIENT * mt2 * t * p1.x + CUBIC_BLEND_COEFFICIENT * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + CUBIC_BLEND_COEFFICIENT * mt2 * t * p1.y + CUBIC_BLEND_COEFFICIENT * mt * t2 * p2.y + t2 * t * p3.y,
  }
}

/**
 * Handles getCubicExtrema.
 * @param p0 p0 parameter.
 * @param p1 p1 parameter.
 * @param p2 p2 parameter.
 * @param p3 p3 parameter.
 */
function getCubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + CUBIC_BLEND_COEFFICIENT * p1 - CUBIC_BLEND_COEFFICIENT * p2 + p3
  const b = CUBIC_BLEND_COEFFICIENT * p0 - (CUBIC_BLEND_COEFFICIENT * QUADRATIC_DOUBLE) * p1 + CUBIC_BLEND_COEFFICIENT * p2
  const c = -CUBIC_BLEND_COEFFICIENT * p0 + CUBIC_BLEND_COEFFICIENT * p1

  return solveQuadratic(CUBIC_BLEND_COEFFICIENT * a, QUADRATIC_DOUBLE * b, c)
}

/**
 * Handles solveQuadratic.
 * @param a a parameter.
 * @param b b parameter.
 * @param c c parameter.
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
 * Handles clampUnitInterval.
 * @param value value parameter.
 */
function clampUnitInterval(value: number) {
  if (value <= 0 || value >= 1) {
    return null
  }

  return value
}

/**
 * Handles expandRect.
 * @param rect rect parameter.
 * @param inset inset parameter.
 */
function expandRect(rect: EngineRect, inset: number): EngineRect {
  return {
    x: rect.x - inset,
    y: rect.y - inset,
    width: rect.width + inset * EXPAND_RECT_DOUBLE,
    height: rect.height + inset * EXPAND_RECT_DOUBLE,
  }
}

/**
 * Handles estimateTextWidth.
 * @param node Target node.
 */
function estimateTextWidth(node: Extract<EngineRenderableNode, {type: 'text'}>) {
  if (node.runs && node.runs.length > 0) {
    let length = 0
    node.runs.forEach((run) => {
      length += run.text.length
    })
    return length * node.style.fontSize * TEXT_WIDTH_ESTIMATE_MULTIPLIER
  }

  return (node.text ?? '').length * node.style.fontSize * TEXT_WIDTH_ESTIMATE_MULTIPLIER
}

/**
 * Handles applyMatrixToPoint.
 * @param matrix Transform matrix.
 * @param point point parameter.
 */
function applyMatrixToPoint(matrix: EngineBoundsMatrix, point: {x: number; y: number}) {
  const [m0, m1, m2, m3, m4, m5] = matrix
  return {
    x: m0 * point.x + m1 * point.y + m2,
    y: m3 * point.x + m4 * point.y + m5,
  }
}