import type {
  EnginePoint,
  EngineRect,
  EngineRenderableNode,
  EngineShapeNode,
} from '../types/types.ts'
import {getBoundingRectFromBezierPoints} from '../geometry/bezier.ts'

export type EngineBoundsMatrix = readonly [number, number, number, number, number, number]

const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2
const STROKE_INSET_DIVISOR = 2
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
 * Resolves the authoritative local bounding rect for any shape node.
 * For points-primary shapes (line/polygon/path), geometry is computed from
 * points/bezierPoints. For ellipse, prefers {@link EngineEllipseGeometry}.
 * Falls back to the node's x/y/width/height with zero defaults.
 * @param node Target shape node.
 * @returns The resolved local bounding rect (never null).
 */
export function resolveShapeBounds(node: EngineShapeNode): EngineRect {
  const geometryBounds = resolveShapeGeometryLocalBounds(node)
  if (geometryBounds) {
    return geometryBounds
  }

  return {
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 0,
    height: node.height ?? 0,
  }
}

/**
 * Handles resolveShapeLocalBounds.
 * @param node Target node.
 */
function resolveShapeLocalBounds(node: EngineShapeNode): EngineRect {
  const geometryBounds = resolveShapeGeometryLocalBounds(node) ?? resolveShapeBounds(node)
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
  // Ellipse: prefer center+radii form when available.
  if (node.shape === 'ellipse' && node.ellipseGeometry) {
    const { cx, cy, rx, ry } = node.ellipseGeometry
    return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }
  }

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
