/**
 * Runtime scheduler API level classifications.
 */
export type EngineRuntimeSchedulerLevel = "developer";

/**
 * Runtime scheduler API stability classifications.
 */
export type EngineRuntimeSchedulerStability = "beta";

/**
 * Error codes reserved for runtime scheduler APIs.
 */
export type EngineRuntimeSchedulerErrorCode =
  | "ENGINE_SCHEDULER_INVALID_TASK"
  | "ENGINE_SCHEDULER_INVALID_QUEUE"
  | "ENGINE_SCHEDULER_TASK_NOT_FOUND";

/**
 * Scheduler priority tokens accepted by schedule APIs.
 */
export type EngineSchedulerPriority = "low" | "normal" | "high";

/**
 * Scheduler task enqueue options contract.
 */
export interface EngineSchedulerScheduleOptions {
  /** Optional scheduler priority. */
  priority?: EngineSchedulerPriority;
  /** Optional task budget in milliseconds. */
  budgetMs?: number;
  /** Optional queue token for task partitioning. */
  queue?: string;
}

/**
 * Scheduler queue stats snapshot contract.
 */
export interface EngineSchedulerQueueStats {
  /** Number of tasks pending execution. */
  pending: number;
  /** Number of tasks currently running. */
  running: number;
  /** Effective scheduler budget in milliseconds. */
  budgetMs: number;
}

/**
 * API descriptor contract for one runtime scheduler endpoint.
 */
export interface EngineRuntimeSchedulerApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.scheduler.schedule"
    | "engine.scheduler.cancel"
    | "engine.scheduler.flush"
    | "engine.scheduler.getQueueStats";
  /** API layering classification. */
  level: EngineRuntimeSchedulerLevel;
  /** API stability tag. */
  stability: EngineRuntimeSchedulerStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeSchedulerErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime scheduler descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_SCHEDULER_API = {
  schedule: {
    name: "engine.scheduler.schedule",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_SCHEDULER_INVALID_TASK", "ENGINE_SCHEDULER_INVALID_QUEUE"],
    determinism: "Same queue, same priority, and same enqueue order yield the same scheduled order.",
  },
  cancel: {
    name: "engine.scheduler.cancel",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_SCHEDULER_TASK_NOT_FOUND"],
    determinism: "Same task id and same queue state yield the same cancel result.",
  },
  flush: {
    name: "engine.scheduler.flush",
    level: "developer",
    stability: "beta",
    errorCodes: ["ENGINE_SCHEDULER_INVALID_QUEUE"],
    determinism: "Same queue state and same queue filter yield the same flushed count.",
  },
  getQueueStats: {
    name: "engine.scheduler.getQueueStats",
    level: "developer",
    stability: "beta",
    errorCodes: [],
    determinism: "Same scheduler state yields the same queue stats snapshot.",
  },
} as const satisfies Readonly<
  Record<"schedule" | "cancel" | "flush" | "getQueueStats", EngineRuntimeSchedulerApiDescriptor>
>;

/**
 * Resolves one runtime scheduler API descriptor by key.
 * @param apiKey Descriptor key from the runtime scheduler descriptor map.
 */
export function resolveEngineRuntimeSchedulerApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_SCHEDULER_API,
): EngineRuntimeSchedulerApiDescriptor {
  return ENGINE_RUNTIME_SCHEDULER_API[apiKey];
}
