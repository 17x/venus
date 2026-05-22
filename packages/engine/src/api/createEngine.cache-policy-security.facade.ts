import type {
  EngineCacheApi,
  EnginePolicyApi,
  EngineSecurityApi,
} from "./public-types";

/**
 * Builds cache, policy, and security namespace facades for the engine handle.
 * @param deps Shared registries and state accessors consumed by cache/policy/security APIs.
 */
export function createEngineCachePolicySecurityFacade(deps: {
  cacheNamespaces: Map<string, Map<string, {
    value: unknown;
    tags: readonly string[];
    policy: { ttlMs?: number; pinned?: boolean; tags?: readonly string[] } | undefined;
  }>>;
  resolveCacheNamespace: (
    namespace: string,
    createWhenMissing: boolean,
  ) => {
    entries: Map<string, {
      value: unknown;
      tags: readonly string[];
      policy: { ttlMs?: number; pinned?: boolean; tags?: readonly string[] } | undefined;
    }>;
    stats: { hitCount: number; missCount: number };
  };
  getPolicyRenderState: () => Readonly<Record<string, unknown>>;
  setPolicyRenderState: (state: Readonly<Record<string, unknown>>) => void;
  getPolicyResourceState: () => Readonly<Record<string, unknown>>;
  setPolicyResourceState: (state: Readonly<Record<string, unknown>>) => void;
  getPolicyFallbackState: () => Readonly<Record<string, unknown>>;
  setPolicyFallbackState: (state: Readonly<Record<string, unknown>>) => void;
  getSecurityTrustLevel: () => "low" | "standard" | "high";
  setSecurityTrustLevel: (level: "low" | "standard" | "high") => void;
  getSecurityResourceAccessPolicy: () => Readonly<Record<string, unknown>>;
  setSecurityResourceAccessPolicy: (policy: Readonly<Record<string, unknown>>) => void;
  getSecurityAuditLog: () => ReadonlyArray<Readonly<Record<string, unknown>>>;
  appendSecurityAuditLog: (type: string, payload: Readonly<Record<string, unknown>>) => void;
}): {
  cache: EngineCacheApi;
  policy: EnginePolicyApi;
  security: EngineSecurityApi;
} {
  return {
    cache: {
      /**
       * Returns cached value from one namespace and key pair.
       * @param namespace Cache namespace token.
       * @param key Cache key token.
       */
      get: (namespace, key) => {
        if (typeof key !== "string" || key.length === 0) {
          throw new Error("ENGINE_CACHE_INVALID_KEY");
        }
        const { entries, stats } = deps.resolveCacheNamespace(namespace, false);
        if (!entries.has(key)) {
          stats.missCount += 1;
          return undefined;
        }
        stats.hitCount += 1;
        return entries.get(key)?.value;
      },
      /**
       * Sets cached value for one namespace and key pair.
       * @param namespace Cache namespace token.
       * @param key Cache key token.
       * @param value Cache entry value payload.
       * @param policy Optional cache policy payload.
       */
      set: (namespace, key, value, policy) => {
        if (typeof key !== "string" || key.length === 0) {
          throw new Error("ENGINE_CACHE_INVALID_KEY");
        }
        const { entries } = deps.resolveCacheNamespace(namespace, true);
        entries.set(key, {
          value,
          tags: Array.isArray(policy?.tags) ? [...policy!.tags] : [],
          policy,
        });
      },
      /**
       * Invalidates cache entries for one namespace with optional key.
       * @param namespace Cache namespace token.
       * @param key Optional cache key token.
       */
      invalidate: (namespace, key) => {
        const { entries } = deps.resolveCacheNamespace(namespace, false);
        if (key === undefined) {
          entries.clear();
          return;
        }
        if (typeof key !== "string" || key.length === 0) {
          throw new Error("ENGINE_CACHE_INVALID_KEY");
        }
        entries.delete(key);
      },
      /**
       * Invalidates cache entries matching one tag token.
       * @param tag Cache tag token used for invalidation.
       */
      invalidateByTag: (tag) => {
        if (typeof tag !== "string" || tag.length === 0) {
          throw new Error("ENGINE_CACHE_INVALID_TAG");
        }
        for (const entries of deps.cacheNamespaces.values()) {
          for (const [key, entry] of entries) {
            if (entry.tags.includes(tag)) {
              entries.delete(key);
            }
          }
        }
      },
      /**
       * Returns cache stats snapshot for one namespace.
       * @param namespace Cache namespace token.
       */
      getStats: (namespace) => {
        const { entries, stats } = deps.resolveCacheNamespace(namespace, false);
        return {
          hitCount: stats.hitCount,
          missCount: stats.missCount,
          entryCount: entries.size,
        };
      },
    },
    policy: {
      /**
       * Sets render policy payload.
       * @param policy Render policy payload.
       */
      setRenderPolicy: (policy) => {
        if (!policy || typeof policy !== "object") {
          throw new Error("ENGINE_POLICY_INVALID_INPUT");
        }
        deps.setPolicyRenderState({ ...policy });
      },
      /**
       * Sets resource policy payload.
       * @param policy Resource policy payload.
       */
      setResourcePolicy: (policy) => {
        if (!policy || typeof policy !== "object") {
          throw new Error("ENGINE_POLICY_INVALID_INPUT");
        }
        deps.setPolicyResourceState({ ...policy });
      },
      /**
       * Sets fallback policy payload.
       * @param policy Fallback policy payload.
       */
      setFallbackPolicy: (policy) => {
        if (!policy || typeof policy !== "object") {
          throw new Error("ENGINE_POLICY_INVALID_INPUT");
        }
        deps.setPolicyFallbackState({ ...policy });
      },
      /**
       * Returns effective policy snapshot.
       */
      getEffectivePolicy: () => ({
        render: deps.getPolicyRenderState(),
        resource: deps.getPolicyResourceState(),
        fallback: deps.getPolicyFallbackState(),
      }),
    },
    security: {
      /**
       * Sets security trust-level token.
       * @param level Trust-level token.
       */
      setTrustLevel: (level) => {
        if (level !== "low" && level !== "standard" && level !== "high") {
          throw new Error("ENGINE_SECURITY_INVALID_TRUST_LEVEL");
        }
        deps.setSecurityTrustLevel(level);
        deps.appendSecurityAuditLog("engine.security.setTrustLevel", {
          level,
        });
      },
      /**
       * Sets security resource-access policy.
       * @param policy Resource-access policy payload.
       */
      setResourceAccessPolicy: (policy) => {
        if (!policy || typeof policy !== "object") {
          throw new Error("ENGINE_SECURITY_INVALID_POLICY");
        }
        const quota = (policy as { quota?: unknown }).quota;
        if (typeof quota === "number" && quota < 0) {
          throw new Error("ENGINE_SECURITY_QUOTA_EXCEEDED");
        }
        deps.setSecurityResourceAccessPolicy({ ...policy });
        deps.appendSecurityAuditLog("engine.security.setResourceAccessPolicy", {
          trustLevel: deps.getSecurityTrustLevel(),
          quota,
        });
      },
      /**
       * Returns latest security audit log entries.
       * @param options Optional audit-log query options.
       */
      getAuditLog: (options) => {
        const auditLog = deps.getSecurityAuditLog();
        const limit = typeof options?.limit === "number" && Number.isFinite(options.limit)
          ? Math.max(0, Math.floor(options.limit))
          : auditLog.length;
        if (limit === 0) {
          return [];
        }
        const start = Math.max(0, auditLog.length - limit);
        return auditLog.slice(start).map((entry) => ({
          ...entry,
          policy: deps.getSecurityResourceAccessPolicy(),
        }));
      },
    },
  };
}
