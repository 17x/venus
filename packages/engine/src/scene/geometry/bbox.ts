import type { EngineRenderableNode } from '../types/types.ts'

const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2
const TEXT_WIDTH_ESTIMATE_MULTIPLIER = 0.6

/**
 * Declares shared axis-aligned bounds shape used by geometry helpers.
 */
export interface EngineGeometryBounds {
  /** Stores minimum world x. */
  x: number
  /** Stores minimum world y. */
  y: number
  /** Stores width in world units. */
  width: number
  /** Stores height in world units. */
  height: number
}

/**
 * Resolves axis-aligned bounds for one renderable node in world space.
  * @param node Target node.
*/
export function resolveRenderableNodeBounds(node: EngineRenderableNode): EngineGeometryBounds {
  if (node.type === 'group') {
    return resolveGroupBounds(node.children)
  }

  if (node.type === 'text') {
    return {
      x: node.x,
      y: node.y,
      width: node.width ?? estimateTextWidth(node),
      height: node.height ?? (node.style.lineHeight ?? node.style.fontSize * TEXT_LINE_HEIGHT_MULTIPLIER),
    }
  }

  return {
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 0,
    height: node.height ?? 0,
  }
}

/**
 * Resolves one group union bounds from all descendants.
  * @param nodes nodes parameter.
*/
export function resolveGroupBounds(nodes: readonly EngineRenderableNode[]): EngineGeometryBounds {
  let union: EngineGeometryBounds | null = null

  for (const node of nodes) {
    const next = resolveRenderableNodeBounds(node)
    union = union ? unionBounds(union, next) : next
  }

  return union ?? {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }
}

/**
 * Checks whether two axis-aligned bounds overlap.
  * @param left left parameter.
 * @param right right parameter.
*/
export function doBoundsOverlap(
  left: EngineGeometryBounds,
  right: EngineGeometryBounds,
): boolean {
  return (
    left.x <= right.x + right.width &&
    left.x + left.width >= right.x &&
    left.y <= right.y + right.height &&
    left.y + left.height >= right.y
  )
}

/**
 * Expands two bounds into one union bounds.
  * @param left left parameter.
 * @param right right parameter.
*/
export function unionBounds(
  left: EngineGeometryBounds,
  right: EngineGeometryBounds,
): EngineGeometryBounds {
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
 * Estimates plain-text width for fallback bounds resolution.
  * @param node Target node.
*/
function estimateTextWidth(node: Extract<EngineRenderableNode, { type: 'text' }>) {
  if (node.runs && node.runs.length > 0) {
    let width = 0
    for (const run of node.runs) {
      width += run.text.length * (run.style?.fontSize ?? node.style.fontSize) * TEXT_WIDTH_ESTIMATE_MULTIPLIER
    }
    return width
  }

  return (node.text ?? '').length * node.style.fontSize * TEXT_WIDTH_ESTIMATE_MULTIPLIER
}
