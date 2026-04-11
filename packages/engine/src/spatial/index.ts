import RBush from 'rbush'

export interface EngineSpatialBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface EngineSpatialItem<TMeta = unknown> extends EngineSpatialBounds {
  id: string
  meta: TMeta
}

export interface EngineSpatialIndex<TMeta = unknown> {
  clear: () => void
  insert: (item: EngineSpatialItem<TMeta>) => void
  load: (items: Array<EngineSpatialItem<TMeta>>) => void
  remove: (id: string) => void
  search: (bounds: EngineSpatialBounds) => Array<EngineSpatialItem<TMeta>>
  update: (item: EngineSpatialItem<TMeta>) => void
}

interface MutableTree<TMeta> {
  clear(): void
  insert(item: EngineSpatialItem<TMeta>): void
  load(items: Array<EngineSpatialItem<TMeta>>): void
  remove(
    item: EngineSpatialItem<TMeta>,
    equals?: (left: EngineSpatialItem<TMeta>, right: EngineSpatialItem<TMeta>) => boolean,
  ): void
  search(bounds: EngineSpatialBounds): Array<EngineSpatialItem<TMeta>>
}

/**
 * Shared coarse spatial query mechanism for engine/runtime/worker consumers.
 *
 * This intentionally exposes a tiny adapter surface while keeping `rbush`
 * as an implementation detail.
 */
export function createEngineSpatialIndex<TMeta = unknown>(): EngineSpatialIndex<TMeta> {
  const tree = new RBush<EngineSpatialItem<TMeta>>() as unknown as MutableTree<TMeta>
  // Keep stable object references by id so remove/update can evict the
  // previous RBush entry before inserting a replacement.
  const itemMap = new Map<string, EngineSpatialItem<TMeta>>()

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
      // Rebuild id lookup after bulk-load so subsequent remove/update calls
      // can target the same entry objects RBush currently holds.
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
