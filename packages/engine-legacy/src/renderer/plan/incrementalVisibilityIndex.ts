// Module responsibility: keep a lightweight incremental visibility index for viewport-priority queries.
// Non-responsibility: scene graph ownership.

import type { EngineRect } from '../../scene/types/types.ts'

/**
 * Describes one indexed visibility entry.
 */
export interface EngineIncrementalVisibilityEntry {
  /** Node id for the indexed object. */
  nodeId: string
  /** Latest world-space bounds. */
  bounds: EngineRect
  /** Revision used for incremental updates. */
  revision: number
}

/**
 * Describes one incremental visibility index snapshot.
 */
export interface EngineIncrementalVisibilityIndex {
  /** Indexed entries by node id. */
  entries: Record<string, EngineIncrementalVisibilityEntry>
}

/**
 * Intent: apply one incremental index update and keep highest revision per node.
 * @param index Existing index snapshot.
 * @param updates Incremental entry updates.
 * @returns Updated index snapshot.
 */
export function applyEngineIncrementalVisibilityUpdates(
  index: EngineIncrementalVisibilityIndex,
  updates: readonly EngineIncrementalVisibilityEntry[],
): EngineIncrementalVisibilityIndex {
  const nextEntries = { ...index.entries }
  for (const update of updates) {
    const previous = nextEntries[update.nodeId]
    if (!previous || update.revision >= previous.revision) {
      nextEntries[update.nodeId] = update
    }
  }

  return {
    entries: nextEntries,
  }
}

/**
 * Intent: query entries intersecting viewport bounds with stable ordering.
 * @param index Index snapshot.
 * @param viewportBounds Viewport bounds.
 * @returns Matching node ids sorted by node id.
 */
export function queryEngineIncrementalVisibility(
  index: EngineIncrementalVisibilityIndex,
  viewportBounds: EngineRect,
): string[] {
  const result: string[] = []
  const viewportMinX = viewportBounds.x
  const viewportMinY = viewportBounds.y
  const viewportMaxX = viewportBounds.x + viewportBounds.width
  const viewportMaxY = viewportBounds.y + viewportBounds.height

  for (const entry of Object.values(index.entries)) {
    const minX = entry.bounds.x
    const minY = entry.bounds.y
    const maxX = entry.bounds.x + entry.bounds.width
    const maxY = entry.bounds.y + entry.bounds.height
    if (maxX >= viewportMinX && minX <= viewportMaxX && maxY >= viewportMinY && minY <= viewportMaxY) {
      result.push(entry.nodeId)
    }
  }

  return result.sort()
}
