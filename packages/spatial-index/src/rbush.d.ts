declare module 'rbush' {
  export default class RBush<T extends { minX: number; minY: number; maxX: number; maxY: number }> {
    constructor(maxEntries?: number)
    clear(): this
    load(items: T[]): this
    search(box: { minX: number; minY: number; maxX: number; maxY: number }): T[]
  }
}
