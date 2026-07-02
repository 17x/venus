/**
 * Venus Geometry Cache Service — multi-tier geometry cache for hit-test and rendering.
 *
 * Tier 0 (AABB): axis-aligned bounding box — fastest lookup, used for culling.
 * Future tiers (not yet implemented):
 *   Tier 1 (OBB): oriented bounding box for rotated hit-test.
 *   Tier 2 (PATH): precise path data for exact collision detection.
 *   Tier 3 (SIMPLIFIED): LOD-degraded path for zoomed-out rendering.
 *
 * Cache entries are keyed by node id. Invalidation clears all tiers for the
 * affected ids.
 */
import type { VenusGeometryCacheService } from '../../Venus.ts'

interface AABB {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Creates a geometry cache service with AABB tier enabled.
 */
export function createVenusGeometryCacheService(): VenusGeometryCacheService {
  const aabbCache = new Map<string, AABB>()

  return {
    invalidate(ids: readonly string[]) {
      for (const id of ids) {
        aabbCache.delete(id)
      }
    },

    getAABB(id: string) {
      return aabbCache.get(id) ?? null
    },

    setAABB(id: string, aabb: AABB) {
      aabbCache.set(id, aabb)
    },

    clear() {
      aabbCache.clear()
    },
  }
}
