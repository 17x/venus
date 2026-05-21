import type {DocumentNode} from '../../model/index.ts'

/**
 * Declares worker spatial item payload used by worker scene index operations.
 */
export interface WorkerSpatialItem<TMeta = {
  shapeId: string
  type: DocumentNode['type']
  order: number
}> {
  /** Stores stable item id. */
  id: string
  /** Stores min x bound. */
  minX: number
  /** Stores min y bound. */
  minY: number
  /** Stores max x bound. */
  maxX: number
  /** Stores max y bound. */
  maxY: number
  /** Stores worker/runtime metadata. */
  meta: TMeta
}

/**
 * Declares worker spatial index operations consumed by scene/hittest paths.
 */
export interface WorkerSpatialIndex<TMeta = {
  shapeId: string
  type: DocumentNode['type']
  order: number
}> {
  /** Replaces all items in one operation. */
  load: (items: Array<WorkerSpatialItem<TMeta>>) => void
  /** Upserts one item by id. */
  update: (item: WorkerSpatialItem<TMeta>) => void
  /** Removes one item by id. */
  remove: (id: string) => void
  /** Returns all items overlapping query bounds. */
  search: (bounds: {minX: number; minY: number; maxX: number; maxY: number}) => Array<WorkerSpatialItem<TMeta>>
}

/**
 * AI-TEMP: engine public surface currently lacks stable spatial index exports for vector worker;
 * remove when engine exposes canonical worker-safe spatial index contract; ref vector-engine-vnext-hard-cut-blockers-2026-05-21.
 * Creates one lightweight worker-local spatial index implementation.
 */
export function createWorkerSpatialIndex<TMeta = {
  shapeId: string
  type: DocumentNode['type']
  order: number
}>(): WorkerSpatialIndex<TMeta> {
  const itemsById = new Map<string, WorkerSpatialItem<TMeta>>()

  return {
    load: (items) => {
      itemsById.clear()
      items.forEach((item) => {
        itemsById.set(item.id, item)
      })
    },
    update: (item) => {
      itemsById.set(item.id, item)
    },
    remove: (id) => {
      itemsById.delete(id)
    },
    search: (bounds) => {
      const result: Array<WorkerSpatialItem<TMeta>> = []
      itemsById.forEach((item) => {
        const overlaps =
          item.maxX >= bounds.minX &&
          item.minX <= bounds.maxX &&
          item.maxY >= bounds.minY &&
          item.minY <= bounds.maxY
        if (overlaps) {
          result.push(item)
        }
      })
      return result
    },
  }
}
