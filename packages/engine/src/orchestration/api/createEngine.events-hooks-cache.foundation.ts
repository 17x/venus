import type {
  EngineEventListener,
  EngineHookListener,
  EngineHookStage,
} from "./public-types";

/**
 * Defines one event listener metadata record used for sampling/throttling controls.
 */
type EngineEventListenerMetadata = {
  /** Scope token used by bulk removal operations. */
  scope?: "global" | "session" | "trace";
  /** Optional fractional sample rate in (0, 1). */
  sampleRate?: number;
  /** Optional minimum delivery interval in milliseconds. */
  throttleMs?: number;
};

/**
 * Defines one cache entry record stored per namespace key.
 */
type EngineCacheEntryRecord = {
  /** Opaque cached payload value. */
  value: unknown;
  /** Normalized tag list used by invalidate-by-tag operations. */
  tags: readonly string[];
  /** Optional policy envelope associated with the cache entry. */
  policy: { ttlMs?: number; pinned?: boolean; tags?: readonly string[] } | undefined;
};

/**
 * Defines one cache namespace stats record.
 */
type EngineCacheNamespaceStats = {
  /** Number of cache hits for the namespace. */
  hitCount: number;
  /** Number of cache misses for the namespace. */
  missCount: number;
};

/**
 * Defines dependencies required to assemble event/hook/cache foundation helpers.
 */
type EngineEventsHooksCacheFoundationDependencies = {
  /** Event listener registry keyed by event type token. */
  eventListeners: Map<string, Set<(payload: unknown) => void>>;
  /** Event listener metadata registry keyed by event type and listener callback. */
  eventListenerMetadata: Map<string, Map<(payload: unknown) => void, EngineEventListenerMetadata>>;
  /** Event types paused for delivery. */
  pausedEventTypes: Set<string>;
  /** Per-type delivery counters used by sampling logic. */
  eventTypeDeliveryCounters: Map<string, number>;
  /** Per-type/per-listener timestamp registry used by throttling logic. */
  eventListenerLastDeliveredAt: Map<string, Map<(payload: unknown) => void, number>>;
  /** Hook stage ordering used for deterministic stats and bulk removal. */
  hookStages: readonly EngineHookStage[];
  /** Hook listener registry keyed by hook stage token. */
  hookListeners: Map<EngineHookStage, Set<EngineHookListener>>;
  /** Hook listener metadata keyed by stage and listener callback. */
  hookListenerMetadata: Map<EngineHookStage, Map<EngineHookListener, { scope?: "global" | "session" | "trace" }>>;
  /** Cache entry registries keyed by namespace and cache key. */
  cacheNamespaces: Map<string, Map<string, EngineCacheEntryRecord>>;
  /** Cache namespace stats keyed by namespace token. */
  cacheNamespaceStats: Map<string, EngineCacheNamespaceStats>;
  /** Security audit log sink. */
  securityAuditLog: Array<Readonly<Record<string, unknown>>>;
  /** Reads the current security audit sequence counter. */
  getSecurityAuditCounter: () => number;
  /** Updates the security audit sequence counter. */
  setSecurityAuditCounter: (nextCounter: number) => void;
  /** Provides monotonic timestamp values. */
  resolveNow: () => number;
  /** Engine identifier emitted on event/hook envelopes. */
  engineId: string;
  /** Resolves current document revision for event/hook envelopes. */
  resolveRevision: () => number;
};

/**
 * Assembles event/hook/cache helper functions shared by public facade namespaces.
 * @param deps Shared mutable state registries and envelope context providers.
 */
export function createEngineEventsHooksCacheFoundation(deps: EngineEventsHooksCacheFoundationDependencies): {
  registerEventListener: (
    type: string,
    listener: EngineEventListener,
    scope?: "global" | "session" | "trace",
    options?: { sampleRate?: number; throttleMs?: number },
  ) => void;
  unregisterEventListener: (type: string, listener: EngineEventListener) => void;
  unregisterAllEventListeners: (scope?: "global" | "session" | "trace") => void;
  assertValidEventType: (type: string) => void;
  assertValidEventListener: (listener: EngineEventListener) => void;
  emitEvent: (type: string, payload: unknown) => void;
  registerHookListener: (
    stage: EngineHookStage,
    listener: EngineHookListener,
    scope?: "global" | "session" | "trace",
  ) => { dispose: () => void };
  unregisterAllHookListeners: (scope?: "global" | "session" | "trace") => void;
  emitHook: (stage: EngineHookStage, context?: unknown) => void;
  resolveHookListenerStats: () => {
    totalListeners: number;
    perStage: Readonly<Record<EngineHookStage, number>>;
  };
  resolveEventListenerStats: () => {
    totalListeners: number;
    pausedTypes: readonly string[];
    perType: Readonly<Record<string, number>>;
  };
  appendSecurityAuditLog: (type: string, payload: Readonly<Record<string, unknown>>) => void;
  resolveCacheNamespace: (
    namespace: string,
    createWhenMissing: boolean,
  ) => {
    entries: Map<string, EngineCacheEntryRecord>;
    stats: EngineCacheNamespaceStats;
  };
} {
  /**
   * Resolves the listener set for one event type, creating it when requested.
   * @param type Event type token used as listener registry key.
   * @param createWhenMissing Whether to create registry records when absent.
   */
  function resolveEventListenerSet(
    type: string,
    createWhenMissing: boolean,
  ): Set<(payload: unknown) => void> | undefined {
    const existing = deps.eventListeners.get(type);
    if (existing || !createWhenMissing) {
      return existing;
    }
    const created = new Set<(payload: unknown) => void>();
    deps.eventListeners.set(type, created);
    return created;
  }

  /**
   * Validates one event type token and throws canonical error on invalid input.
   * @param type Event type input from events API calls.
   */
  function assertValidEventType(type: string): void {
    if (typeof type !== "string" || type.length === 0) {
      throw new Error("ENGINE_EVENTS_INVALID_TYPE");
    }
  }

  /**
   * Validates one event listener callback and throws canonical error on invalid input.
   * @param listener Event listener callback from events API calls.
   */
  function assertValidEventListener(listener: EngineEventListener): void {
    if (typeof listener !== "function") {
      throw new Error("ENGINE_EVENTS_INVALID_LISTENER");
    }
  }

  /**
   * Registers one event listener with optional scope metadata.
   * @param type Event type token used as listener registry key.
   * @param listener Event listener callback.
   * @param scope Optional listener scope token used by offAll operations.
   * @param options Optional listener delivery options.
   */
  function registerEventListener(
    type: string,
    listener: EngineEventListener,
    scope?: "global" | "session" | "trace",
    options?: { sampleRate?: number; throttleMs?: number },
  ): void {
    assertValidEventType(type);
    assertValidEventListener(listener);
    const listeners = resolveEventListenerSet(type, true);
    listeners?.add(listener);
      const metadataMap: Map<(payload: unknown) => void, EngineEventListenerMetadata> =
        deps.eventListenerMetadata.get(type) ?? new Map();
    metadataMap.set(listener, {
      scope,
      sampleRate: options?.sampleRate,
      throttleMs: options?.throttleMs,
    });
    deps.eventListenerMetadata.set(type, metadataMap);
  }

  /**
   * Unregisters one event listener and cleans empty registry records.
   * @param type Event type token used as listener registry key.
   * @param listener Event listener callback.
   */
  function unregisterEventListener(type: string, listener: EngineEventListener): void {
    assertValidEventType(type);
    assertValidEventListener(listener);
    const listeners = deps.eventListeners.get(type);
    listeners?.delete(listener);
    const metadataMap = deps.eventListenerMetadata.get(type);
    metadataMap?.delete(listener);
    if (metadataMap && metadataMap.size === 0) {
      deps.eventListenerMetadata.delete(type);
    }
    const listenerDeliveryMap = deps.eventListenerLastDeliveredAt.get(type);
    listenerDeliveryMap?.delete(listener);
    if (listenerDeliveryMap && listenerDeliveryMap.size === 0) {
      deps.eventListenerLastDeliveredAt.delete(type);
    }
    if (listeners && listeners.size === 0) {
      deps.eventListeners.delete(type);
      deps.eventListenerMetadata.delete(type);
      deps.eventTypeDeliveryCounters.delete(type);
      deps.eventListenerLastDeliveredAt.delete(type);
    }
  }

  /**
   * Removes listeners either globally or by one scope token.
   * @param scope Optional scope token used to filter listener removals.
   */
  function unregisterAllEventListeners(scope?: "global" | "session" | "trace"): void {
    if (!scope) {
      deps.eventListeners.clear();
      deps.eventListenerMetadata.clear();
      deps.pausedEventTypes.clear();
      deps.eventTypeDeliveryCounters.clear();
      deps.eventListenerLastDeliveredAt.clear();
      return;
    }
    for (const [type, listeners] of deps.eventListeners) {
      const metadataMap = deps.eventListenerMetadata.get(type);
      if (!metadataMap) {
        continue;
      }
      for (const [listener, metadata] of metadataMap) {
        if (metadata.scope === scope) {
          listeners.delete(listener);
          metadataMap.delete(listener);
          deps.eventListenerLastDeliveredAt.get(type)?.delete(listener);
        }
      }
      if (metadataMap.size === 0) {
        deps.eventListenerMetadata.delete(type);
      }
      if (listeners.size === 0) {
        deps.eventListeners.delete(type);
        deps.eventTypeDeliveryCounters.delete(type);
        deps.eventListenerLastDeliveredAt.delete(type);
      }
    }
  }

  /**
   * Emits one event envelope to registered listeners with pause/sample/throttle controls.
   * @param type Event type token.
   * @param payload Event payload object.
   */
  function emitEvent(type: string, payload: unknown): void {
    if (deps.pausedEventTypes.has(type)) {
      return;
    }
    const listeners = deps.eventListeners.get(type);
    if (!listeners || listeners.size === 0) {
      return;
    }
    const deliveryCount = (deps.eventTypeDeliveryCounters.get(type) ?? 0) + 1;
    deps.eventTypeDeliveryCounters.set(type, deliveryCount);
    const metadataMap = deps.eventListenerMetadata.get(type);
      const lastDeliveredMap: Map<(payload: unknown) => void, number> =
        deps.eventListenerLastDeliveredAt.get(type) ?? new Map();
    deps.eventListenerLastDeliveredAt.set(type, lastDeliveredMap);
    const timestamp = deps.resolveNow();
    const envelope = {
      type,
      timestamp,
      engineId: deps.engineId,
      revision: String(deps.resolveRevision()),
      payload,
    };
    for (const listener of [...listeners]) {
      const metadata = metadataMap?.get(listener);
      const sampleRate = metadata?.sampleRate;
      if (typeof sampleRate === "number" && sampleRate > 0 && sampleRate < 1) {
        const interval = Math.max(1, Math.floor(1 / sampleRate));
        if (deliveryCount % interval !== 0) {
          continue;
        }
      }
      const throttleMs = metadata?.throttleMs;
      if (typeof throttleMs === "number" && throttleMs > 0) {
        const lastDeliveredAt = lastDeliveredMap.get(listener);
        if (typeof lastDeliveredAt === "number" && timestamp - lastDeliveredAt < throttleMs) {
          continue;
        }
      }
      try {
        listener(envelope);
        lastDeliveredMap.set(listener, timestamp);
      } catch (error) {
        if (type !== "engine.diagnostics.error") {
          emitEvent("engine.diagnostics.error", {
            code: "ENGINE_EVENTS_LISTENER_FAILURE",
            sourceType: type,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Resolves one hook-listener set and creates records when requested.
   * @param stage Hook stage token used as listener registry key.
   * @param createWhenMissing Whether to create registry records when absent.
   */
  function resolveHookListenerSet(
    stage: EngineHookStage,
    createWhenMissing: boolean,
  ): Set<EngineHookListener> | undefined {
    const existing = deps.hookListeners.get(stage);
    if (existing || !createWhenMissing) {
      return existing;
    }
    const created = new Set<EngineHookListener>();
    deps.hookListeners.set(stage, created);
    return created;
  }

  /**
   * Validates one hook listener callback.
   * @param listener Hook listener callback from hooks API calls.
   */
  function assertValidHookListener(listener: EngineHookListener): void {
    if (typeof listener !== "function") {
      throw new Error("ENGINE_HOOKS_INVALID_LISTENER");
    }
  }

  /**
   * Unregisters one hook listener for provided stage token.
   * @param stage Hook stage token used as listener registry key.
   * @param listener Hook listener callback.
   */
  function unregisterHookListener(stage: EngineHookStage, listener: EngineHookListener): void {
    assertValidHookListener(listener);
    const listeners = deps.hookListeners.get(stage);
    listeners?.delete(listener);
    const metadataMap = deps.hookListenerMetadata.get(stage);
    metadataMap?.delete(listener);
    if (metadataMap && metadataMap.size === 0) {
      deps.hookListenerMetadata.delete(stage);
    }
    if (listeners && listeners.size === 0) {
      deps.hookListeners.delete(stage);
      deps.hookListenerMetadata.delete(stage);
    }
  }

  /**
   * Registers one hook listener for provided stage token.
   * @param stage Hook stage token used as listener registry key.
   * @param listener Hook listener callback.
   * @param scope Optional listener scope token used by offAll operations.
   */
  function registerHookListener(
    stage: EngineHookStage,
    listener: EngineHookListener,
    scope?: "global" | "session" | "trace",
  ): { dispose: () => void } {
    assertValidHookListener(listener);
    const listeners = resolveHookListenerSet(stage, true);
    listeners?.add(listener);
    const metadataMap = deps.hookListenerMetadata.get(stage) ?? new Map<EngineHookListener, { scope?: "global" | "session" | "trace" }>();
    metadataMap.set(listener, {
      scope,
    });
    deps.hookListenerMetadata.set(stage, metadataMap);
    return {
      dispose: () => {
        unregisterHookListener(stage, listener);
      },
    };
  }

  /**
   * Removes hook listeners either globally or by one scope token.
   * @param scope Optional scope token used to filter listener removals.
   */
  function unregisterAllHookListeners(scope?: "global" | "session" | "trace"): void {
    if (!scope) {
      deps.hookListeners.clear();
      deps.hookListenerMetadata.clear();
      return;
    }
    for (const stage of deps.hookStages) {
      const listeners = deps.hookListeners.get(stage);
      const metadataMap = deps.hookListenerMetadata.get(stage);
      if (!listeners || !metadataMap) {
        continue;
      }
      for (const [listener, metadata] of metadataMap) {
        if (metadata.scope === scope) {
          listeners.delete(listener);
          metadataMap.delete(listener);
        }
      }
      if (metadataMap.size === 0) {
        deps.hookListenerMetadata.delete(stage);
      }
      if (listeners.size === 0) {
        deps.hookListeners.delete(stage);
      }
    }
  }

  /**
   * Emits one hook-stage envelope to registered listeners.
   * @param stage Hook stage token.
   * @param context Optional stage-specific context payload.
   */
  function emitHook(stage: EngineHookStage, context?: unknown): void {
    const listeners = deps.hookListeners.get(stage);
    if (!listeners || listeners.size === 0) {
      return;
    }
    const envelope = {
      stage,
      timestamp: deps.resolveNow(),
      engineId: deps.engineId,
      revision: String(deps.resolveRevision()),
      context,
    };
    for (const listener of [...listeners]) {
      try {
        listener(envelope);
      } catch (error) {
        emitEvent("engine.diagnostics.error", {
          code: "ENGINE_HOOKS_LISTENER_FAILURE",
          stage,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Returns deterministic hook-listener stats snapshot.
   */
  function resolveHookListenerStats(): {
    totalListeners: number;
    perStage: Readonly<Record<EngineHookStage, number>>;
  } {
    let totalListeners = 0;
    const perStage = {
      beforeCompile: 0,
      afterCompile: 0,
      beforeRenderPlan: 0,
      afterRenderPlan: 0,
      beforeSubmit: 0,
      afterSubmit: 0,
    } satisfies Record<EngineHookStage, number>;
    for (const stage of deps.hookStages) {
      const count = deps.hookListeners.get(stage)?.size ?? 0;
      perStage[stage] = count;
      totalListeners += count;
    }
    return {
      totalListeners,
      perStage,
    };
  }

  /**
   * Returns deterministic event-listener stats snapshot.
   */
  function resolveEventListenerStats(): {
    totalListeners: number;
    pausedTypes: readonly string[];
    perType: Readonly<Record<string, number>>;
  } {
    const perTypeEntries = [...deps.eventListeners.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([type, listeners]) => [type, listeners.size] as const);
    let totalListeners = 0;
    const perType: Record<string, number> = {};
    for (const [type, count] of perTypeEntries) {
      totalListeners += count;
      perType[type] = count;
    }
    return {
      totalListeners,
      pausedTypes: [...deps.pausedEventTypes].sort(),
      perType,
    };
  }

  /**
   * Records one security audit entry for governance operations.
   * @param type Audit event type token.
   * @param payload Audit payload object.
   */
  function appendSecurityAuditLog(type: string, payload: Readonly<Record<string, unknown>>): void {
    const nextCounter = deps.getSecurityAuditCounter() + 1;
    deps.setSecurityAuditCounter(nextCounter);
    deps.securityAuditLog.push({
      id: `audit-${nextCounter}`,
      type,
      timestamp: deps.resolveNow(),
      payload,
    });
  }

  /**
   * Resolves one cache namespace entry map and optional stats records.
   * @param namespace Cache namespace token.
   * @param createWhenMissing Whether to create records when namespace is missing.
   */
  function resolveCacheNamespace(
    namespace: string,
    createWhenMissing: boolean,
  ): {
    entries: Map<string, EngineCacheEntryRecord>;
    stats: EngineCacheNamespaceStats;
  } {
    if (typeof namespace !== "string" || namespace.length === 0) {
      throw new Error("ENGINE_CACHE_INVALID_NAMESPACE");
    }
    const existingEntries = deps.cacheNamespaces.get(namespace);
    const existingStats = deps.cacheNamespaceStats.get(namespace);
    if (!existingEntries || !existingStats) {
      if (!createWhenMissing) {
        return {
          entries: new Map(),
          stats: { hitCount: 0, missCount: 0 },
        };
      }
      const createdEntries = new Map<string, EngineCacheEntryRecord>();
      const createdStats = { hitCount: 0, missCount: 0 };
      deps.cacheNamespaces.set(namespace, createdEntries);
      deps.cacheNamespaceStats.set(namespace, createdStats);
      return {
        entries: createdEntries,
        stats: createdStats,
      };
    }
    return {
      entries: existingEntries,
      stats: existingStats,
    };
  }

  return {
    registerEventListener,
    unregisterEventListener,
    unregisterAllEventListeners,
    assertValidEventType,
    assertValidEventListener,
    emitEvent,
    registerHookListener,
    unregisterAllHookListeners,
    emitHook,
    resolveHookListenerStats,
    resolveEventListenerStats,
    appendSecurityAuditLog,
    resolveCacheNamespace,
  };
}
