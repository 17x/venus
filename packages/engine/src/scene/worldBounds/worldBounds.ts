import type {
  EngineRect,
  EngineRenderableNode,
  EngineShapeNode,
} from '../types/types.ts'
import {
  resolveEngineShapeGeometry,
  resolveEngineShapeGeometryBounds,
} from '../geometry/canonicalGeometry.ts'
import { estimateTextWidth as estimateTextWidthShared } from '../../core/text/shaper.ts'

export type EngineBoundsMatrix = readonly [number, number, number, number, number, number]

const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2
const IDENTITY_BOUNDS_MATRIX: EngineBoundsMatrix = [1, 0, 0, 0, 1, 0]

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
 * Resolves authoritative world bounds for one renderable node, including groups.
 * Group bounds are derived from descendants and never from group-owned geometry.
 * @param node Target renderable node.
 * @param worldMatrix Node world transform matrix.
 */
export function resolveRenderableNodeWorldBounds(
  node: EngineRenderableNode,
  worldMatrix: EngineBoundsMatrix,
): EngineRect | null {
  if (node.type === 'group') {
    return resolveRenderableNodesWorldBounds(node.children, worldMatrix)
  }

  return resolveLeafNodeWorldBounds(node, worldMatrix)
}

/**
 * Resolves aggregate world bounds for a renderable subtree list.
 * @param nodes Nodes to inspect.
 * @param parentMatrix Parent world matrix applied before each node transform.
 */
export function resolveRenderableNodesWorldBounds(
  nodes: readonly EngineRenderableNode[],
  parentMatrix: EngineBoundsMatrix = IDENTITY_BOUNDS_MATRIX,
): EngineRect | null {
  let aggregate: EngineRect | null = null

  for (const node of nodes) {
    const nodeMatrix = multiplyBoundsMatrix(
      parentMatrix,
      node.transform?.matrix ?? IDENTITY_BOUNDS_MATRIX,
    )
    const bounds = resolveRenderableNodeWorldBounds(node, nodeMatrix)
    if (!bounds) {
      continue
    }

    aggregate = aggregate
      ? unionRectBounds(aggregate, bounds)
      : bounds
  }

  return aggregate
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
 * For points-primary shapes (line/polygon/star/path), geometry is computed from
 * points/bezierPoints. For ellipse, prefers {@link EngineEllipseGeometry}.
 * Falls back to the node's x/y/width/height with zero defaults.
 * @param node Target shape node.
 * @returns The resolved local bounding rect (never null).
 */
export function resolveShapeBounds(node: EngineShapeNode): EngineRect {
  return resolveEngineShapeGeometryBounds(node)
}

/**
 * Handles resolveShapeLocalBounds.
 * @param node Target node.
 */
function resolveShapeLocalBounds(node: EngineShapeNode): EngineRect {
  return resolveEngineShapeGeometry(node).strokeBounds
}

/**
 * Unions two axis-aligned world bounds.
 * @param left Existing bounds.
 * @param right Bounds to include.
 */
function unionRectBounds(left: EngineRect, right: EngineRect): EngineRect {
  const minX = Math.min(left.x, right.x)
  const minY = Math.min(left.y, right.y)
  const maxX = Math.max(left.x + left.width, right.x + right.width)
  const maxY = Math.max(left.y + left.height, right.y + right.height)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Multiplies affine bounds matrices in engine 6-element layout.
 * @param left Matrix applied before the right matrix.
 * @param right Matrix applied after the left matrix.
 */
function multiplyBoundsMatrix(
  left: EngineBoundsMatrix,
  right: EngineBoundsMatrix,
): EngineBoundsMatrix {
  const [l00, l01, l02, l10, l11, l12] = left
  const [r00, r01, r02, r10, r11, r12] = right
  return [
    l00 * r00 + l01 * r10,
    l00 * r01 + l01 * r11,
    l00 * r02 + l01 * r12 + l02,
    l10 * r00 + l11 * r10,
    l10 * r01 + l11 * r11,
    l10 * r02 + l11 * r12 + l12,
  ]
}

/**
 * Estimates text width for world-bounds using the shared engine text pipeline
 * estimator. Delegates to {@link estimateTextWidth} from core/text.
 * @param node Target text node.
 */
function estimateTextWidth(node: Extract<EngineRenderableNode, {type: 'text'}>) {
  if (node.runs && node.runs.length > 0) {
    let width = 0
    for (const run of node.runs) {
      width += estimateTextWidthShared(
        run.text,
        run.style?.fontSize ?? node.style.fontSize,
      )
    }
    return width
  }

  return estimateTextWidthShared(node.text ?? '', node.style.fontSize)
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
