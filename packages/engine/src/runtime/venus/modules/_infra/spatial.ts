/**
 * Venus Spatial Service — wraps the RBush spatial index as a typed internal service.
 *
 * Provides coarse AABB-based spatial queries used by hit-test, geometry payload,
 * and snapping modules. The underlying RBush implementation is an implementation
 * detail not exposed to service consumers.
 */
import { createEngineSpatialIndex, type EngineSpatialIndex } from '../../../../scene/spatial/index.ts'
import type { VenusSpatialService } from '../../Venus.ts'

/**
 * Creates a spatial service backed by an RBush R-tree.
 * The service maintains its own index; consumers query by AABB and receive
 * intersecting item ids.
 */
export function createVenusSpatialService(): VenusSpatialService {
  const index: EngineSpatialIndex<{ id: string }> = createEngineSpatialIndex()

  return {
    upsert(id: string, bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
      // Remove any existing entry before inserting to keep the index consistent.
      index.remove(id)
      index.insert({ id, ...bounds, meta: { id } })
    },

    remove(id: string) {
      index.remove(id)
    },

    search(bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
      return index.search(bounds).map((item) => item.id)
    },

    clear() {
      index.clear()
    },
  }
}
