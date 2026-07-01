declare module 'rbush' {
  export default class RBush<T> {
    clear(): void
    insert(item: T): void
    load(items: T[]): void
    remove(item: T, equals?: (left: T, right: T) => boolean): void
    search(bounds: {minX: number, minY: number, maxX: number, maxY: number}): T[]
  }
}
