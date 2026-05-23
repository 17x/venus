/**
 * Runtime events API level classifications.
 */
export type EngineRuntimeEventsLevel = "developer";

/**
 * Runtime events API stability classifications.
 */
export type EngineRuntimeEventsStability = "beta";

/**
 * Error codes reserved for runtime events APIs.
 */
export type EngineRuntimeEventsErrorCode =
  | "ENGINE_EVENTS_INVALID_TYPE"
  | "ENGINE_EVENTS_INVALID_LISTENER"
  | "ENGINE_EVENTS_LISTENER_FAILURE";

/**
 * Canonical event scope tokens used for listener grouping and offAll control.
 */
export type EngineEventScope = "global" | "session" | "trace";

/**
 * Canonical event type tokens used by engine.events subscription APIs.
 */
export type EngineEventType =
  | "engine.lifecycle.beforeMount"
  | "engine.lifecycle.mounted"
  | "engine.lifecycle.beforeUnmount"
  | "engine.lifecycle.unmounted"
  | "engine.lifecycle.ready"
  | "engine.lifecycle.disposed"
  | "engine.document.graphSet"
  | "engine.document.graphPatched"
  | "engine.document.revisionChanged"
  | "engine.view.changed"
  | "engine.view.viewportResized"
  | "engine.interaction.stateChanged"
  | "engine.interaction.pickCompleted"
  | "engine.interaction.pickFailed"
  | "engine.render.frameStarted"
  | "engine.render.frameCompleted"
  | "engine.render.frameFailed"
  | "engine.render.backendSwitched"
  | "engine.resource.loadProgress"
  | "engine.resource.loadFailed"
  | "engine.streaming.backpressure"
  | "engine.diagnostics.warning"
  | "engine.diagnostics.traceReady"
  | "engine.diagnostics.captureReady"
  | "engine.diagnostics.error"
  | "engine.replay.started"
  | "engine.replay.completed"
  | "engine.replay.failed";

/**
 * Event envelope contract used by all engine events.
 */
export interface EngineEventEnvelope<TPayload = unknown> {
  /** Canonical event type token. */
  type: EngineEventType;
  /** Monotonic event timestamp in milliseconds. */
  timestamp: number;
  /** Stable engine instance identifier. */
  engineId: string;
  /** Current deterministic revision marker. */
  revision: string;
  /** Event-specific payload object. */
  payload: TPayload;
}

/**
 * Event listener signature consumed by engine.events subscription APIs.
 */
export interface EngineEventsListener {
  /**
   * Handles one event envelope payload.
   * @param event Canonical event envelope payload.
   */
  (event: EngineEventEnvelope): void;
}

/**
 * Event subscription options contract.
 */
export interface EngineEventSubscriptionOptions {
  /** Optional listener scope token used by offAll. */
  scope?: EngineEventScope;
  /** Optional sampling ratio in range (0, 1]. */
  sampleRate?: number;
  /** Optional throttle interval for high-frequency event domains. */
  throttleMs?: number;
}

/**
 * Event listener stats contract returned by getListenerStats.
 */
export interface EngineEventListenerStats {
  /** Total listener count registered across all event types. */
  totalListeners: number;
  /** Event types currently in paused state. */
  pausedTypes: readonly EngineEventType[];
  /** Per-event listener counts in deterministic key order. */
  perType: Readonly<Record<EngineEventType, number>>;
}

/**
 * API descriptor contract for one runtime events endpoint.
 */
export interface EngineRuntimeEventsApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.events.on"
    | "engine.events.off"
    | "engine.events.once"
    | "engine.events.onMany"
    | "engine.events.offAll"
    | "engine.events.pause"
    | "engine.events.resume"
    | "engine.events.getListenerStats";
  /** API layering classification. */
  level: EngineRuntimeEventsLevel;
  /** API stability tag. */
  stability: EngineRuntimeEventsStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeEventsErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime events descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_EVENTS_API = {
  on: {
    name: "engine.events.on",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_EVENTS_INVALID_TYPE", "ENGINE_EVENTS_INVALID_LISTENER"],
    determinism: "Same subscription input sequence yields same listener ordering for one event type.",
  },
  off: {
    name: "engine.events.off",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_EVENTS_INVALID_TYPE", "ENGINE_EVENTS_INVALID_LISTENER"],
    determinism: "Same unsubscribe input yields same remaining listener set.",
  },
  once: {
    name: "engine.events.once",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_EVENTS_INVALID_TYPE", "ENGINE_EVENTS_INVALID_LISTENER"],
    determinism: "Same once subscription input yields deterministic single-delivery listener behavior.",
  },
  onMany: {
    name: "engine.events.onMany",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_EVENTS_INVALID_TYPE", "ENGINE_EVENTS_INVALID_LISTENER"],
    determinism: "Same ordered type list yields same registration order across all listed event types.",
  },
  offAll: {
    name: "engine.events.offAll",
    level: "developer",
    stability: "beta",
    errorCodes: [],
    determinism: "Same scope input yields same listener-set clearing result.",
  },
  pause: {
    name: "engine.events.pause",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_EVENTS_INVALID_TYPE"],
    determinism: "Same type input yields same paused-event filtering state.",
  },
  resume: {
    name: "engine.events.resume",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_EVENTS_INVALID_TYPE"],
    determinism: "Same type input yields same resumed-event delivery state.",
  },
  getListenerStats: {
    name: "engine.events.getListenerStats",
    level: "developer",
    stability: "beta",
    errorCodes: [],
    determinism: "Same listener registry and pause state yields same stats snapshot.",
  },
} as const satisfies Readonly<
  Record<
    "on" | "off" | "once" | "onMany" | "offAll" | "pause" | "resume" | "getListenerStats",
    EngineRuntimeEventsApiDescriptor
  >
>;

/**
 * Resolves one runtime events API descriptor by key.
 * @param apiKey Descriptor key from the runtime events descriptor map.
 */
export function resolveEngineRuntimeEventsApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_EVENTS_API,
): EngineRuntimeEventsApiDescriptor {
  return ENGINE_RUNTIME_EVENTS_API[apiKey];
}
