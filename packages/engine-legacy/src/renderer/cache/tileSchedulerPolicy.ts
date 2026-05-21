// Module responsibility: schedule tile queue by viewport priority and starvation safety.
// Non-responsibility: tile rendering or upload.

/**
 * Describes one tile request descriptor for scheduler policy.
 */
export interface EngineTileRequest {
  /** Tile id. */
  id: string
  /** Whether tile intersects current viewport. */
  viewportVisible: boolean
  /** Whether tile is in predictor prefetch zone. */
  predicted: boolean
  /** Number of frames this request waited in queue. */
  waitingFrames: number
}

/**
 * Intent: sort tile requests by viewport/prediction priority with starvation protection.
 * @param requests Tile request descriptors.
 * @returns Request descriptors in dequeue order.
 */
export function resolveEngineTileSchedulerOrder(
  requests: readonly EngineTileRequest[],
): EngineTileRequest[] {
  return [...requests].sort((left, right) => {
    const leftPriority = left.viewportVisible ? 0 : left.predicted ? 1 : 2
    const rightPriority = right.viewportVisible ? 0 : right.predicted ? 1 : 2
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    // Promote old requests first within the same priority lane to prevent starvation.
    return right.waitingFrames - left.waitingFrames
  })
}
