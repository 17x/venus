import type { EngineDiagnosticsRuntimeCapability } from "./core-foundation.types";

/**
 * Graph validation output payload exposed by developer-level graph APIs.
 */
export interface EngineGraphValidationOutput {
  /** True when graph input satisfies minimal runtime constraints. */
  valid: boolean;
  /** Deterministic issue list for invalid graph payloads. */
  issues: readonly string[];
}

/**
 * Viewport/world point payload used by projection helper APIs.
 */
export interface EnginePoint2 {
  /** Point x coordinate. */
  x: number;
  /** Point y coordinate. */
  y: number;
}

/**
 * Rectangle payload used by rect-pick helper APIs.
 */
export interface EngineRectInput {
  /** Rectangle x coordinate. */
  x: number;
  /** Rectangle y coordinate. */
  y: number;
  /** Rectangle width. */
  width: number;
  /** Rectangle height. */
  height: number;
}

/**
 * Lasso path payload used by lasso-pick helper APIs.
 */
export interface EngineLassoInput {
  /** Ordered lasso points in screen/world space. */
  points: readonly EnginePoint2[];
}

/**
 * Engine-level event listener function contract.
 */
export interface EngineEventListener {
  /**
   * Handles one emitted event payload.
   * @param payload Event payload object.
   */
  (payload: unknown): void;
}

/**
 * Event-subscription options for engine.events APIs.
 */
export interface EngineEventSubscriptionOptions {
  /** Optional scope token used by offAll operations. */
  scope?: "global" | "session" | "trace";
  /** Optional sampling ratio for high-frequency events in range (0, 1]. */
  sampleRate?: number;
  /** Optional throttle interval in milliseconds for high-frequency events. */
  throttleMs?: number;
}

/**
 * Listener stats snapshot returned by engine.events.getListenerStats().
 */
export interface EngineEventListenerStats {
  /** Total listener count registered across all event types. */
  totalListeners: number;
  /** Event types currently paused by engine.events.pause(type). */
  pausedTypes: readonly string[];
  /** Deterministic per-event listener count snapshot. */
  perType: Readonly<Record<string, number>>;
}

/**
 * Canonical stage tokens accepted by engine.hooks.* APIs.
 */
export type EngineHookStage =
  | "beforeCompile"
  | "afterCompile"
  | "beforeRenderPlan"
  | "afterRenderPlan"
  | "beforeSubmit"
  | "afterSubmit";

/**
 * Hook listener function contract.
 */
export interface EngineHookListener {
  /**
   * Handles one hook-stage envelope payload.
   * @param payload Hook-stage envelope payload.
   */
  (payload: {
    /** Hook stage token for this callback invocation. */
    stage: EngineHookStage;
    /** Monotonic timestamp in milliseconds. */
    timestamp: number;
    /** Stable engine session identifier. */
    engineId: string;
    /** Current document revision emitted by runtime state. */
    revision: string;
    /** Optional stage-specific context payload. */
    context?: unknown;
  }): void;
}

/**
 * Hook-subscription options for engine.hooks APIs.
 */
export interface EngineHookSubscriptionOptions {
  /** Optional scope token used by offAll operations. */
  scope?: "global" | "session" | "trace";
}

/**
 * Hook listener stats snapshot returned by engine.hooks.getStats().
 */
export interface EngineHookListenerStats {
  /** Total listener count registered across all hook stages. */
  totalListeners: number;
  /** Deterministic per-stage listener count snapshot. */
  perStage: Readonly<Record<EngineHookStage, number>>;
}

/**
 * Events namespace API contract exposed under engine.events.
 */
export interface EngineEventsApi {
  /** Registers one listener for a given event type. */
  on: (type: string, listener: EngineEventListener, options?: EngineEventSubscriptionOptions) => void;
  /** Unregisters one listener for a given event type. */
  off: (type: string, listener: EngineEventListener) => void;
  /** Registers one one-shot listener for a given event type. */
  once: (type: string, listener: EngineEventListener, options?: EngineEventSubscriptionOptions) => void;
  /** Registers one listener for multiple event types in one call. */
  onMany: (
    types: readonly string[],
    listener: EngineEventListener,
    options?: EngineEventSubscriptionOptions,
  ) => void;
  /** Removes listeners for one optional scope token, or all listeners when scope is omitted. */
  offAll: (scope?: EngineEventSubscriptionOptions["scope"]) => void;
  /** Pauses delivery for one event type. */
  pause: (type: string) => void;
  /** Resumes delivery for one event type. */
  resume: (type: string) => void;
  /** Returns current listener stats snapshot. */
  getListenerStats: () => EngineEventListenerStats;
}

/**
 * Hooks namespace API contract exposed under engine.hooks.
 */
export interface EngineHooksApi {
  /**
   * Registers one listener for compile-start stage.
   * @param listener Hook listener callback.
   * @param options Optional hook subscription controls.
   */
  beforeCompile: (
    listener: EngineHookListener,
    options?: EngineHookSubscriptionOptions,
  ) => { dispose: () => void };
  /**
   * Registers one listener for compile-complete stage.
   * @param listener Hook listener callback.
   * @param options Optional hook subscription controls.
   */
  afterCompile: (
    listener: EngineHookListener,
    options?: EngineHookSubscriptionOptions,
  ) => { dispose: () => void };
  /**
   * Registers one listener before render-plan orchestration.
   * @param listener Hook listener callback.
   * @param options Optional hook subscription controls.
   */
  beforeRenderPlan: (
    listener: EngineHookListener,
    options?: EngineHookSubscriptionOptions,
  ) => { dispose: () => void };
  /**
   * Registers one listener after render-plan orchestration.
   * @param listener Hook listener callback.
   * @param options Optional hook subscription controls.
   */
  afterRenderPlan: (
    listener: EngineHookListener,
    options?: EngineHookSubscriptionOptions,
  ) => { dispose: () => void };
  /**
   * Registers one listener before runtime submit boundary.
   * @param listener Hook listener callback.
   * @param options Optional hook subscription controls.
   */
  beforeSubmit: (
    listener: EngineHookListener,
    options?: EngineHookSubscriptionOptions,
  ) => { dispose: () => void };
  /**
   * Registers one listener after runtime submit boundary.
   * @param listener Hook listener callback.
   * @param options Optional hook subscription controls.
   */
  afterSubmit: (
    listener: EngineHookListener,
    options?: EngineHookSubscriptionOptions,
  ) => { dispose: () => void };
  /**
   * Removes listeners globally or by scope token.
   * @param scope Optional scope token used to filter listener removals.
   */
  offAll: (scope?: EngineHookSubscriptionOptions["scope"]) => void;
  /**
   * Returns current hook listener stats snapshot.
   * @returns Deterministic hook listener stats.
   */
  getStats: () => EngineHookListenerStats;
}

/**
 * Extension plugin contract exposed to engine.extension.register.
 */
export interface EngineExtensionPluginInput {
  /** Stable plugin identifier. */
  id: string;
  /** Optional display name for diagnostics output. */
  name?: string;
  /** Optional version token for compatibility checks. */
  version?: string;
}

/**
 * Extension namespace API contract exposed under engine.extension.
 */
export interface EngineExtensionApi {
  /** Registers one plugin in extension registry. */
  register: (plugin: EngineExtensionPluginInput) => { pluginId: string; state: string };
  /** Unregisters one plugin by id. */
  unregister: (pluginId: string) => { removed: boolean };
  /** Lists registered plugins with lifecycle states. */
  list: () => readonly { pluginId: string; state: string }[];
  /** Returns lifecycle state for one plugin id. */
  getState: (pluginId: string) => { pluginId: string; state: string };
}

/**
 * Scheduler namespace API contract exposed under engine.scheduler.
 */
export interface EngineSchedulerApi {
  /** Schedules one task with optional priority, budget, and queue options. */
  schedule: (
    task: unknown,
    options?: { priority?: "low" | "normal" | "high"; budgetMs?: number; queue?: string },
  ) => { taskId: string };
  /** Cancels one scheduled task by id. */
  cancel: (taskId: string) => { cancelled: boolean };
  /** Flushes pending tasks for one optional queue. */
  flush: (queue?: string) => { flushed: number };
  /** Returns scheduler queue stats snapshot. */
  getQueueStats: () => { pending: number; running: number; budgetMs: number };
}

/**
 * Cache namespace API contract exposed under engine.cache.
 */
export interface EngineCacheApi {
  /** Returns cached value for namespace+key, or undefined when not found. */
  get: (namespace: string, key: string) => unknown;
  /** Sets cached value for namespace+key with optional policy. */
  set: (
    namespace: string,
    key: string,
    value: unknown,
    policy?: { ttlMs?: number; pinned?: boolean; tags?: readonly string[] },
  ) => void;
  /** Invalidates one key or whole namespace when key is omitted. */
  invalidate: (namespace: string, key?: string) => void;
  /** Invalidates cache entries tagged with provided tag. */
  invalidateByTag: (tag: string) => void;
  /** Returns cache stats snapshot for one namespace. */
  getStats: (namespace: string) => { hitCount: number; missCount: number; entryCount: number };
}

/**
 * Policy namespace API contract exposed under engine.policy.
 */
export interface EnginePolicyApi {
  /** Sets render-policy payload. */
  setRenderPolicy: (policy: Readonly<Record<string, unknown>>) => void;
  /** Sets resource-policy payload. */
  setResourcePolicy: (policy: Readonly<Record<string, unknown>>) => void;
  /** Sets fallback-policy payload. */
  setFallbackPolicy: (policy: Readonly<Record<string, unknown>>) => void;
  /** Returns effective merged policy snapshot. */
  getEffectivePolicy: () => {
    render: Readonly<Record<string, unknown>>;
    resource: Readonly<Record<string, unknown>>;
    fallback: Readonly<Record<string, unknown>>;
  };
}

/**
 * Security namespace API contract exposed under engine.security.
 */
export interface EngineSecurityApi {
  /** Sets current trust level. */
  setTrustLevel: (level: "low" | "standard" | "high") => void;
  /** Sets resource access policy payload. */
  setResourceAccessPolicy: (policy: Readonly<Record<string, unknown>>) => void;
  /** Returns security audit log snapshot. */
  getAuditLog: (options?: { limit?: number }) => readonly Readonly<Record<string, unknown>>[];
}

/**
 * Asset state payload returned by developer-level asset APIs.
 */
export interface EngineAssetStateOutput {
  /** Stable asset identifier. */
  assetId: string;
  /** Canonical asset lifecycle state token. */
  state: "loaded" | "preloaded" | "unloaded" | "missing";
}

/**
 * Asset aggregate stats payload returned by developer-level asset APIs.
 */
export interface EngineAssetStatsOutput {
  /** Number of assets currently in loaded state. */
  loadedCount: number;
  /** Number of assets currently in preloaded state. */
  preloadedCount: number;
  /** Total assets tracked by current engine session. */
  totalCount: number;
}

/**
 * Image capture output payload for developer-level capture APIs.
 */
export interface EngineCaptureImageOutput {
  /** MIME type of encoded payload. */
  mimeType: string;
  /** Encoded data URL payload. */
  dataUrl: string;
}

/**
 * Video-frame capture output payload for developer-level capture APIs.
 */
export interface EngineCaptureVideoFrameOutput {
  /** Timestamp in milliseconds associated with captured frame. */
  timestampMs: number;
  /** MIME type of encoded payload. */
  mimeType: string;
  /** Encoded data URL payload. */
  dataUrl: string;
}

/**
 * Public capability snapshot exposed by developer-level getCapabilities API.
 */
export interface EnginePublicCapabilitiesOutput {
  /** Capability schema version for compatibility checks. */
  schemaVersion: number;
  /** Runtime capability descriptors available in current handle session. */
  runtime: readonly EngineDiagnosticsRuntimeCapability[];
}

/**
 * Headless-session create output payload exposed by developer APIs.
 */
export interface EngineHeadlessSessionOutput {
  /** Stable headless session id. */
  sessionId: string;
}

/**
 * Headless-session destroy output payload exposed by developer APIs.
 */
export interface EngineHeadlessSessionDestroyOutput {
  /** True when requested headless session was removed. */
  destroyed: boolean;
}

/**
 * Headless render output payload exposed by developer APIs.
 */
export interface EngineHeadlessRenderOutput {
  /** Number of draw calls represented by headless render. */
  drawCount: number;
  /** Number of visible nodes represented by headless render. */
  visibleCount: number;
}

/**
 * Public metrics snapshot exposed by developer-level metrics APIs.
 */
export interface EnginePublicMetricsOutput {
  /** Last encoded command count tracked by runtime orchestration. */
  encodedCommandCount: number;
  /** Last replayed command count tracked by runtime orchestration. */
  replayedCommandCount: number;
  /** Last draw-count tracked by runtime orchestration. */
  drawCount: number;
}

