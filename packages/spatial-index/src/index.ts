import RBush from 'rbush'

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface SpatialItem<TMeta = unknown> extends Bounds {
  id: string
  meta: TMeta
}

export interface SpatialIndex<TMeta = unknown> {
  clear: () => void
  load: (items: Array<SpatialItem<TMeta>>) => void
  search: (bounds: Bounds) => Array<SpatialItem<TMeta>>
}

/**
 * The adapter only exposes the coarse-query contract that worker code needs.
 *
 * Why:
 * - Keep `rbush` as an implementation detail.
 * - Let future apps swap the backing index without rewriting worker logic.
 */

/**
 * Shared spatial index adapter around `rbush`.
 *
 * Why:
 * - Keep worker-side hit-testing independent from the third-party library API.
 * - Let future apps reuse the same coarse-query contract with different data.
 *
 * Not:
 * - document parsing
 * - fine-grained geometry hit-testing
 * - file format concerns
 */
export function createSpatialIndex<TMeta = unknown>(): SpatialIndex<TMeta> {
  const tree = new RBush<SpatialItem<TMeta>>()

  return {
    clear() {
      tree.clear()
    },
    load(items) {
      tree.clear()
      tree.load(items)
    },
    search(bounds) {
      return tree.search(bounds)
    },
  }
}
