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
  insert: (item: SpatialItem<TMeta>) => void
  load: (items: Array<SpatialItem<TMeta>>) => void
  remove: (id: string) => void
  search: (bounds: Bounds) => Array<SpatialItem<TMeta>>
  update: (item: SpatialItem<TMeta>) => void
}

interface MutableTree<TMeta> {
  clear(): void
  insert(item: SpatialItem<TMeta>): void
  load(items: Array<SpatialItem<TMeta>>): void
  remove(
    item: SpatialItem<TMeta>,
    equals?: (left: SpatialItem<TMeta>, right: SpatialItem<TMeta>) => boolean,
  ): void
  search(bounds: Bounds): Array<SpatialItem<TMeta>>
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
  const tree = new RBush<SpatialItem<TMeta>>() as unknown as MutableTree<TMeta>
  const itemMap = new Map<string, SpatialItem<TMeta>>()

  return {
    clear() {
      tree.clear()
      itemMap.clear()
    },
    insert(item) {
      const previous = itemMap.get(item.id)
      if (previous) {
        tree.remove(previous, (left, right) => left.id === right.id)
      }

      tree.insert(item)
      itemMap.set(item.id, item)
    },
    load(items) {
      tree.clear()
      tree.load(items)
      itemMap.clear()
      items.forEach((item) => {
        itemMap.set(item.id, item)
      })
    },
    remove(id) {
      const previous = itemMap.get(id)
      if (!previous) {
        return
      }

      tree.remove(previous, (left, right) => left.id === right.id)
      itemMap.delete(id)
    },
    search(bounds) {
      return tree.search(bounds)
    },
    update(item) {
      const previous = itemMap.get(item.id)
      if (previous) {
        tree.remove(previous, (left, right) => left.id === right.id)
      }

      tree.insert(item)
      itemMap.set(item.id, item)
    },
  }
}
