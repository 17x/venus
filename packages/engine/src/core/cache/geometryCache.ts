// Core geometry cache owns backend-neutral geometry reuse primitives; renderer
// backends may consume it, but cache contracts must not depend on renderer code.

/**
 * Declares the stable cache key used to identify one geometry cache entry.
 * Render-plan cache keys are derived from scene revision, node identity,
 * viewport, and frame-plan metadata so cached plans are never stale.
 */
export interface GeometryCacheKey {
  /** Scene revision or plan version used for coarse invalidation. */
  sceneVersion: string | number
  /** Stable reference to the node list used for identity comparison. */
  nodesRef: readonly unknown[]
  /** Viewport signature encoding scale + offset for cache isolation. */
  viewportSignature: string
  /** Frame-plan signature encoding candidate ids for cache isolation. */
  framePlanSignature: string
}

/**
 * Computes a stable string signature from a geometry cache key for map-based
 * lookup when WeakMap semantics are not suitable.
 * @param key Geometry cache key to serialize.
 */
export function computeGeometryCacheKeySignature(key: GeometryCacheKey): string {
  return `${key.sceneVersion}|${key.viewportSignature}|${key.framePlanSignature}`
}

/** Declares one geometry cache entry used by geometry reuse paths. */
export interface GeometryCacheEntry<TValue> {
  /** Stores cache key for retrieval and invalidation. */
  key: string
  /** Stores cached geometry payload. */
  value: TValue
}

/** Provides minimal geometry cache map for backend-neutral geometry reuse. */
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
   * @param entry Cache entry payload.
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

  /** Clears entire cache content. */
  clear() {
    this.cache.clear()
  }
}
