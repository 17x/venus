import type {
  EngineExtensionApi,
  EngineSchedulerApi,
} from "./public-types";

/**
 * Builds extension and scheduler namespace facades for the engine handle.
 * @param deps Mutable registries and runtime accessors used by extension/scheduler namespaces.
 */
export function createEngineExtensionAndSchedulerFacade(deps: {
  extensionRegistry: Map<string, { pluginId: string; state: "registered" | "active" | "errored" | "disposed" }>;
  schedulerTaskRegistry: Map<string, {
    taskId: string;
    queue: string;
    priority: "low" | "normal" | "high";
    budgetMs: number;
    task: unknown;
  }>;
  getFrameBudgetMs: () => number;
  createSchedulerTaskId: () => string;
}): {
  extension: EngineExtensionApi;
  scheduler: EngineSchedulerApi;
} {
  return {
    extension: {
      /**
       * Registers one extension plugin and marks initial registry state.
       * @param plugin Plugin contract record to register.
       */
      register: (plugin) => {
        if (!plugin || typeof plugin.id !== "string" || plugin.id.length === 0) {
          throw new Error("ENGINE_EXTENSION_INVALID_PLUGIN");
        }
        if (deps.extensionRegistry.has(plugin.id)) {
          throw new Error("ENGINE_EXTENSION_DUPLICATE_PLUGIN");
        }
        deps.extensionRegistry.set(plugin.id, {
          pluginId: plugin.id,
          state: "registered",
        });
        return {
          pluginId: plugin.id,
          state: "registered",
        };
      },
      /**
       * Unregisters one extension plugin by id.
       * @param pluginId Stable plugin id token.
       */
      unregister: (pluginId) => {
        const removed = deps.extensionRegistry.delete(pluginId);
        return {
          removed,
        };
      },
      /**
       * Returns deterministic extension registry list in lexical id order.
       */
        list: () => [...deps.extensionRegistry.values()]
          .sort((left, right) => left.pluginId.localeCompare(right.pluginId)),
      /**
       * Returns extension state for one plugin id.
       * @param pluginId Stable plugin id token.
       */
      getState: (pluginId) => {
        const plugin = deps.extensionRegistry.get(pluginId);
        if (!plugin) {
          throw new Error("ENGINE_EXTENSION_NOT_FOUND");
        }
        return {
          pluginId: plugin.pluginId,
          state: plugin.state,
        };
      },
    },
    scheduler: {
      /**
       * Schedules one governance task with deterministic id assignment.
       * @param task Task payload executed by scheduler runtime.
       * @param options Optional queue/priority/budget options.
       */
      schedule: (task, options) => {
        if (task === undefined) {
          throw new Error("ENGINE_SCHEDULER_INVALID_TASK");
        }
        const queue = typeof options?.queue === "string" && options.queue.length > 0
          ? options.queue
          : "default";
        if (queue.length === 0) {
          throw new Error("ENGINE_SCHEDULER_INVALID_QUEUE");
        }
        const taskId = deps.createSchedulerTaskId();
        deps.schedulerTaskRegistry.set(taskId, {
          taskId,
          queue,
          priority: options?.priority ?? "normal",
            budgetMs: Number.isFinite(options?.budgetMs)
              ? Math.max(1, options!.budgetMs as number)
              : deps.getFrameBudgetMs(),
          task,
        });
        return {
          taskId,
        };
      },
      /**
       * Cancels one scheduled governance task.
       * @param taskId Stable task id token.
       */
      cancel: (taskId) => {
        if (!deps.schedulerTaskRegistry.has(taskId)) {
          return {
            cancelled: false,
          };
        }
        deps.schedulerTaskRegistry.delete(taskId);
        return {
          cancelled: true,
        };
      },
      /**
       * Flushes scheduler tasks for one optional queue.
       * @param queue Optional queue token; when omitted flushes all queues.
       */
      flush: (queue) => {
        if (queue !== undefined && (typeof queue !== "string" || queue.length === 0)) {
          throw new Error("ENGINE_SCHEDULER_INVALID_QUEUE");
        }
        let flushed = 0;
        for (const [taskId, taskRecord] of deps.schedulerTaskRegistry) {
          if (queue === undefined || taskRecord.queue === queue) {
            deps.schedulerTaskRegistry.delete(taskId);
            flushed += 1;
          }
        }
        return {
          flushed,
        };
      },
      /**
       * Returns current scheduler queue stats snapshot.
       */
      getQueueStats: () => ({
        pending: deps.schedulerTaskRegistry.size,
        running: 0,
        budgetMs: deps.getFrameBudgetMs(),
      }),
    },
  };
}
