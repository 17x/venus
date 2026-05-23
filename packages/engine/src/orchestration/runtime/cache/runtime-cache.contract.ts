/**
 * Runtime cache API level classifications.
 */
export type EngineRuntimeCacheLevel = "developer";

/**
 * Runtime cache API stability classifications.
 */
export type EngineRuntimeCacheStability = "beta";

/**
 * Error codes reserved for runtime cache APIs.
 */
export type EngineRuntimeCacheErrorCode =
  | "ENGINE_CACHE_INVALID_NAMESPACE"
  | "ENGINE_CACHE_INVALID_KEY"
  | "ENGINE_CACHE_INVALID_TAG";

/**
 * Cache entry policy contract accepted by cache.set.
 */
export interface EngineCacheEntryPolicy {
  /** Optional time-to-live in milliseconds. */
  ttlMs?: number;
  /** Optional pin flag for GC protection. */
  pinned?: boolean;
}

/**
 * Cache stats snapshot contract returned by cache.getStats.
 */
export interface EngineCacheStatsSnapshot {
  /** Number of cache hits in current namespace. */
  hitCount: number;
  /** Number of cache misses in current namespace. */
  missCount: number;
  /** Number of entries in current namespace. */
  entryCount: number;
}

/**
 * API descriptor contract for one runtime cache endpoint.
 */
export interface EngineRuntimeCacheApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.cache.get"
    | "engine.cache.set"
    | "engine.cache.invalidate"
    | "engine.cache.invalidateByTag"
    | "engine.cache.getStats";
  /** API layering classification. */
  level: EngineRuntimeCacheLevel;
  /** API stability tag. */
  stability: EngineRuntimeCacheStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeCacheErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime cache descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_CACHE_API = {
  get: {
    name: "engine.cache.get",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_CACHE_INVALID_NAMESPACE", "ENGINE_CACHE_INVALID_KEY"],
    determinism: "Same namespace, key, and cache state yield the same value lookup result.",
  },
  set: {
    name: "engine.cache.set",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_CACHE_INVALID_NAMESPACE", "ENGINE_CACHE_INVALID_KEY"],
    determinism: "Same namespace, key, value, and policy yield the same stored entry state.",
  },
  invalidate: {
    name: "engine.cache.invalidate",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_CACHE_INVALID_NAMESPACE", "ENGINE_CACHE_INVALID_KEY"],
    determinism: "Same namespace, key filter, and cache state yield the same invalidation result.",
  },
  invalidateByTag: {
    name: "engine.cache.invalidateByTag",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_CACHE_INVALID_TAG"],
    determinism: "Same tag and cache-tag index state yield the same invalidation result.",
  },
  getStats: {
    name: "engine.cache.getStats",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_CACHE_INVALID_NAMESPACE"],
    determinism: "Same namespace cache state yields the same stats snapshot.",
  },
} as const satisfies Readonly<
  Record<"get" | "set" | "invalidate" | "invalidateByTag" | "getStats", EngineRuntimeCacheApiDescriptor>
>;

/**
 * Resolves one runtime cache API descriptor by key.
 * @param apiKey Descriptor key from the runtime cache descriptor map.
 */
export function resolveEngineRuntimeCacheApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_CACHE_API,
): EngineRuntimeCacheApiDescriptor {
  return ENGINE_RUNTIME_CACHE_API[apiKey];
}
