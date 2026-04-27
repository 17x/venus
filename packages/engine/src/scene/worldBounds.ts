import type {
  EngineBezierPoint,
  EnginePoint,
  EngineRect,
  EngineRenderableNode,
  EngineShapeNode,
} from './types.ts'

export type EngineBoundsMatrix = readonly [number, number, number, number, number, number]

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
      const lineHeight = node.style.lineHeight ?? node.style.fontSize * 1.2
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

function resolveShapeLocalBounds(node: EngineShapeNode): EngineRect {
  const geometryBounds = resolveShapeGeometryLocalBounds(node) ?? {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  }
  const strokeInset = Math.max(0, node.strokeWidth ?? 0) / 2

  return strokeInset > 0
    ? expandRect(geometryBounds, strokeInset)
    : geometryBounds
}

function resolveShapeGeometryLocalBounds(node: EngineShapeNode): EngineRect | null {
  if (node.bezierPoints && node.bezierPoints.length > 0) {
    return getBoundingRectFromBezierPoints(node.bezierPoints)
  }

  if (node.points && node.points.length > 0) {
    return getBoundingRectFromPoints(node.points)
  }

  return null
}

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
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  }
}

function getCubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 3 * p0 - 6 * p1 + 3 * p2
  const c = -3 * p0 + 3 * p1

  return solveQuadratic(3 * a, 2 * b, c)
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

function clampUnitInterval(value: number) {
  if (value <= 0 || value >= 1) {
    return null
  }

  return value
}

function expandRect(rect: EngineRect, inset: number): EngineRect {
  return {
    x: rect.x - inset,
    y: rect.y - inset,
    width: rect.width + inset * 2,
    height: rect.height + inset * 2,
  }
}

function estimateTextWidth(node: Extract<EngineRenderableNode, {type: 'text'}>) {
  if (node.runs && node.runs.length > 0) {
    let length = 0
    node.runs.forEach((run) => {
      length += run.text.length
    })
    return length * node.style.fontSize * 0.6
  }

  return (node.text ?? '').length * node.style.fontSize * 0.6
}

function applyMatrixToPoint(matrix: EngineBoundsMatrix, point: {x: number; y: number}) {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}