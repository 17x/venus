import { createPluginLifecycleContract } from "./pluginLifecycleContract";
import { createEngineRenderScheduler } from "./renderScheduler";
import type {
  PluginExecutionContext,
  PluginRuntimeHooks,
} from "./pluginLifecycleContract";

/**
 * Declares orchestration dependencies needed by the top-level runtime loop.
 */
export interface EngineOrchestrationOptions {
  /** Plugin hooks wired into setup/activate/deactivate/dispose phases. */
  pluginHooks: PluginRuntimeHooks;
  /** Render callback executed by the scheduler single-flight loop. */
  render: () => Promise<unknown>;
}

/**
 * Declares one orchestration handle that coordinates plugins and frame scheduling.
 */
export interface EngineOrchestrationHandle {
  /** Dispatches one plugin lifecycle phase on the active plugin contract. */
  dispatchPluginLifecycle: (
    phase: "setup" | "activate" | "deactivate" | "dispose",
    context: PluginExecutionContext,
  ) => Promise<void>;
  /** Requests one scheduled render in normal mode. */
  requestRender: () => void;
  /** Disposes scheduler resources. */
  dispose: () => void;
}

/**
 * Creates one orchestration handle used by runtime bootstrap wiring.
 * @param options Orchestration options that bind lifecycle and scheduler behavior.
 * @returns Runtime orchestration handle.
 */
export function createEngineOrchestration(
  options: EngineOrchestrationOptions,
): EngineOrchestrationHandle {
  const pluginLifecycle = createPluginLifecycleContract(options.pluginHooks);
  const scheduler = createEngineRenderScheduler({
    render: options.render,
  });

  return {
    dispatchPluginLifecycle: (phase, context) =>
      pluginLifecycle.dispatch(phase, context),
    requestRender: () => {
      scheduler.request();
    },
    dispose: () => {
      scheduler.dispose();
    },
  };
}
