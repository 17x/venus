import type { EngineDrawCommand } from '../../../../render/index.ts'

/**
 * Declares cache key contract for base-layer command caching.
 */
export interface BaseRenderCacheKey {
  /** Stores scene revision for cache invalidation. */
  revision: string | number
  /** Stores viewport signature to isolate per-camera cache entries. */
  viewportSignature: string
}

/**
 * Provides a minimal base-layer command cache used by layered renderer.
 */
export class BaseRenderCache {
  private cachedKey: string | null = null
  private cachedCommands: EngineDrawCommand[] = []

  /**
   * Resolves cached commands for the given key when available.
    * @param key Lookup key.
*/
  get(key: BaseRenderCacheKey) {
    const signature = toBaseRenderCacheSignature(key)
    if (signature !== this.cachedKey) {
      return null
    }

    return [...this.cachedCommands]
  }

  /**
   * Stores one base command list under the given key.
    * @param key Lookup key.
 * @param commands commands parameter.
*/
  set(key: BaseRenderCacheKey, commands: readonly EngineDrawCommand[]) {
    this.cachedKey = toBaseRenderCacheSignature(key)
    this.cachedCommands = [...commands]
  }

  /**
   * Clears cache entry explicitly.
   */
  clear() {
    this.cachedKey = null
    this.cachedCommands = []
  }
}

/**
 * Builds one stable cache signature from cache key fields.
  * @param key Lookup key.
*/
export function toBaseRenderCacheSignature(key: BaseRenderCacheKey) {
  return `${key.revision}:${key.viewportSignature}`
}
