/**
 * Declares one geometry cache entry used by base-layer geometry reuse.
 */
export interface GeometryCacheEntry<TValue> {
  /** Stores cache key for retrieval and invalidation. */
  key: string
  /** Stores cached geometry payload. */
  value: TValue
}

/**
 * Provides minimal geometry cache map for base-layer render reuse.
 */
export class GeometryCache<TValue> {
  private readonly cache = new Map<string, TValue>()

  /**
   * Resolves cached geometry payload by key.
    * @param key Lookup key.
*/
  get(key: string) {
    return this.cache.get(key) ?? null
  }

  /**
   * Stores geometry payload under key.
    * @param entry entry parameter.
*/
  set(entry: GeometryCacheEntry<TValue>) {
    this.cache.set(entry.key, entry.value)
  }

  /**
   * Deletes one key from cache.
    * @param key Lookup key.
*/
  delete(key: string) {
    this.cache.delete(key)
  }

  /**
   * Clears entire cache content.
   */
  clear() {
    this.cache.clear()
  }
}
