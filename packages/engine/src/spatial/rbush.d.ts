declare module 'rbush' {
  export interface BBox {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }

  export default class RBush<T extends BBox = BBox> {
    constructor(maxEntries?: number)

    all(): T[]
    clear(): void
    insert(item: T): this
    load(items: T[]): this
    remove(item: T, equalsFn?: (a: T, b: T) => boolean): this
    search(bbox: BBox): T[]
    collides(bbox: BBox): boolean
    toJSON(): unknown
    fromJSON(data: unknown): this
  }
}
