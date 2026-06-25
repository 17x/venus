// Core tile cache owns backend-neutral tile keying primitives; renderer
// backends may store backend payloads in it without owning the cache contract.

/** Declares one tile cache key shape used by layered tile caching. */
export interface LayeredTileCacheKey {
  /** Stores tile x index. */
  x: number
  /** Stores tile y index. */
  y: number
  /** Stores zoom bucket value. */
  zoomBucket: number
}

/** Provides minimal tile cache map for layered tile payloads. */
export class LayeredTileCache<TValue> {
  private readonly cache = new Map<string, TValue>()

  /**
   * Resolves cached tile payload by tile key.
   * @param key Lookup key.
   */
  get(key: LayeredTileCacheKey) {
    return this.cache.get(toLayeredTileCacheSignature(key)) ?? null
  }

  /**
   * Stores tile payload under tile key.
   * @param key Lookup key.
   * @param value Cached tile payload.
   */
  set(key: LayeredTileCacheKey, value: TValue) {
    this.cache.set(toLayeredTileCacheSignature(key), value)
  }

  /**
   * Deletes one tile entry by key.
   * @param key Lookup key.
   */
  delete(key: LayeredTileCacheKey) {
    this.cache.delete(toLayeredTileCacheSignature(key))
  }

  /** Clears all tile entries. */
  clear() {
    this.cache.clear()
  }
}

/**
 * Builds stable cache signature from tile coordinates and zoom bucket.
 * @param key Lookup key.
 */
export function toLayeredTileCacheSignature(key: LayeredTileCacheKey) {
  return `${key.zoomBucket}:${key.x}:${key.y}`
}
