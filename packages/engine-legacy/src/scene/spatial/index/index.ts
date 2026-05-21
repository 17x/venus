import { RBush3D, type BBox } from 'rbush-3d'

export interface EngineSpatialBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  minZ?: number
  maxZ?: number
}

export interface EngineSpatialItem<TMeta = unknown> extends EngineSpatialBounds {
  id: string
  meta: TMeta
}

/**
 * Declares spatial-dimension strategy used by the spatial index adapter.
 */
export type EngineSpatialDimension = '2d' | '3d'

/**
 * Declares options for creating one engine spatial index instance.
 */
export interface CreateEngineSpatialIndexOptions {
  /** Declares whether this index instance should run in 2D or 3D mode. */
  dimension?: EngineSpatialDimension
}

export interface EngineSpatialIndex<TMeta = unknown> {
  clear: () => void
  insert: (item: EngineSpatialItem<TMeta>) => void
  load: (items: Array<EngineSpatialItem<TMeta>>) => void
  remove: (id: string) => void
  search: (bounds: EngineSpatialBounds) => Array<EngineSpatialItem<TMeta>>
  update: (item: EngineSpatialItem<TMeta>) => void
}

interface EngineSpatialItem3D<TMeta = unknown> {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
  id: string
  meta: TMeta
}

/**
 * Declares one rbush-3d compatible bbox payload used by this adapter.
 */
type EngineSpatialBBox<TMeta = unknown> = BBox & EngineSpatialItem3D<TMeta>

/**
 * Shared coarse spatial query mechanism for engine/runtime/worker consumers.
 *
 * This intentionally exposes a tiny adapter surface while keeping `rbush-3d`
 * as an implementation detail.
 * @param options Spatial index options.
 */
export function createEngineSpatialIndex<TMeta = unknown>(
  options: CreateEngineSpatialIndexOptions = {},
): EngineSpatialIndex<TMeta> {
  const dimension: EngineSpatialDimension = options.dimension ?? '3d'
  const tree = new RBush3D()
  // Keep stable object references by id so remove/update can evict the
  // previous tree entry before inserting a replacement.
  const itemMap = new Map<string, EngineSpatialBBox<TMeta>>()

  /**
   * Intent: cast one normalized 3D item into rbush bbox payload contract.
   * @param item Normalized 3D item.
   * @returns rbush-compatible bbox payload.
   */
  function toSpatialBBox(item: EngineSpatialItem3D<TMeta>): EngineSpatialBBox<TMeta> {
    return item as EngineSpatialBBox<TMeta>
  }

  /**
   * Intent: normalize one spatial item into 3D bounds so 2D payloads remain compatible.
   * @param item Spatial item payload.
   * @returns 3D-normalized item payload.
   */
  function toSpatialItem3D(item: EngineSpatialItem<TMeta>): EngineSpatialItem3D<TMeta> {
    if (dimension === '2d') {
      // In 2D mode, force a zero-thickness Z slice so old callers preserve semantics.
      return {
        minX: item.minX,
        minY: item.minY,
        minZ: 0,
        maxX: item.maxX,
        maxY: item.maxY,
        maxZ: 0,
        id: item.id,
        meta: item.meta,
      }
    }

    return {
      minX: item.minX,
      minY: item.minY,
      minZ: item.minZ ?? 0,
      maxX: item.maxX,
      maxY: item.maxY,
      maxZ: item.maxZ ?? 0,
      id: item.id,
      meta: item.meta,
    }
  }

  /**
   * Intent: normalize one query bounds payload into 3D bounds for tree search.
   * @param bounds Query bounds payload.
   * @returns 3D-normalized query bounds.
   */
  function toSearchBounds3D(bounds: EngineSpatialBounds): EngineSpatialItem3D<TMeta> {
    return {
      minX: bounds.minX,
      minY: bounds.minY,
      // Preserve legacy 2D query behavior by searching across every Z slice
      // when callers do not provide explicit depth bounds.
      minZ: bounds.minZ ?? Number.NEGATIVE_INFINITY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      maxZ: bounds.maxZ ?? Number.POSITIVE_INFINITY,
      id: '__search__',
      meta: undefined as TMeta,
    }
  }

  /**
   * Intent: map one 3D tree item back into public spatial item contract.
   * @param item Tree item payload.
   * @returns Public spatial item payload.
   */
  function toSpatialItem2D3D(item: EngineSpatialItem3D<TMeta>): EngineSpatialItem<TMeta> {
    return {
      minX: item.minX,
      minY: item.minY,
      minZ: item.minZ,
      maxX: item.maxX,
      maxY: item.maxY,
      maxZ: item.maxZ,
      id: item.id,
      meta: item.meta,
    }
  }

  return {
    clear() {
      tree.clear()
      itemMap.clear()
    },
    /**
     * Handles insert.
     * @param item item parameter.
     */
    insert(item) {
      const normalizedItem = toSpatialItem3D(item)
      const normalizedBbox = toSpatialBBox(normalizedItem)
      const previous = itemMap.get(normalizedItem.id)
      if (previous) {
        tree.remove(previous, (left, right) => left.id === right.id)
      }

      tree.insert(normalizedBbox)
      itemMap.set(normalizedItem.id, normalizedBbox)
    },
    /**
     * Handles load.
     * @param items items parameter.
     */
    load(items) {
      const normalizedItems = items.map((item) => toSpatialBBox(toSpatialItem3D(item)))
      tree.clear()
      tree.load(normalizedItems)
      // Rebuild id lookup after bulk-load so subsequent remove/update calls
      // can target the same entry objects the tree currently holds.
      itemMap.clear()
      normalizedItems.forEach((item) => {
        itemMap.set(item.id, item)
      })
    },
    /**
     * Handles remove.
     * @param id Identifier value.
     */
    remove(id) {
      const previous = itemMap.get(id)
      if (!previous) {
        return
      }

      tree.remove(previous, (left, right) => left.id === right.id)
      itemMap.delete(id)
    },
    /**
     * Handles search.
     * @param bounds Bounds data.
     */
    search(bounds) {
      const results = tree.search(
        toSpatialBBox(toSearchBounds3D(bounds)),
      ) as EngineSpatialBBox<TMeta>[]
      return results.map((item) => toSpatialItem2D3D(item))
    },
    /**
     * Handles update.
     * @param item item parameter.
     */
    update(item) {
      const normalizedItem = toSpatialItem3D(item)
      const normalizedBbox = toSpatialBBox(normalizedItem)
      const previous = itemMap.get(normalizedItem.id)
      if (previous) {
        tree.remove(previous, (left, right) => left.id === right.id)
      }

      tree.insert(normalizedBbox)
      itemMap.set(normalizedItem.id, normalizedBbox)
    },
  }
}
