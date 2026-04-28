import type {OverlayNode} from './OverlayNode.ts'

/**
 * Sorts overlay nodes by zIndex and preserves stable id order within same zIndex.
 */
export function sortOverlayNodesByZIndex<TAction = unknown>(
  nodes: OverlayNode<TAction>[],
): OverlayNode<TAction>[] {
  return [...nodes].sort((left, right) => {
    const leftZ = left.zIndex ?? 0
    const rightZ = right.zIndex ?? 0

    if (leftZ !== rightZ) {
      return leftZ - rightZ
    }

    // Use id fallback to keep deterministic ordering for equal zIndex values.
    return left.id.localeCompare(right.id)
  })
}

