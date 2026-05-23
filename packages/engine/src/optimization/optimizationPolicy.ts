import {
  resolveEngineFrameBudget,
  type EngineFrameBudgetBrokerInput,
} from "./frameBudgetBroker";
import {
  getZoomRenderStrategy,
  resolveEngineZoomPerformanceConfig,
} from "./zoomPerformance";

/**
 * Declares one optimization policy input merged from scheduler and view state.
 */
export interface EngineOptimizationPolicyInput {
  /** Scheduler pressure snapshot used to resolve frame budget contraction. */
  budgetInput: EngineFrameBudgetBrokerInput;
  /** Current camera zoom value used to select zoom render strategy. */
  zoom: number;
  /** Number of visible elements used by zoom strategy density thresholds. */
  visibleElementCount: number;
  /** Interaction state used by zoom strategy phase selection. */
  interactionState: "idle" | "zooming" | "panning" | "dragging";
}

/**
 * Declares one optimization policy result consumed by orchestration/render stages.
 */
export interface EngineOptimizationPolicyResult {
  /** Resolved frame budget and pressure metadata. */
  budgetDecision: ReturnType<typeof resolveEngineFrameBudget>;
  /** Resolved zoom render strategy for current frame context. */
  zoomStrategy: ReturnType<typeof getZoomRenderStrategy>;
}

/**
 * Resolves one backend-agnostic optimization decision from frame and view inputs.
 * @param input Frame budget and zoom strategy input snapshot.
 * @returns Combined optimization decision for runtime orchestration.
 */
export function resolveEngineOptimizationPolicy(
  input: EngineOptimizationPolicyInput,
): EngineOptimizationPolicyResult {
  const budgetDecision = resolveEngineFrameBudget(input.budgetInput);
  const zoomConfig = resolveEngineZoomPerformanceConfig();
  const zoomStrategy = getZoomRenderStrategy({
    zoom: input.zoom,
    visibleElementCount: input.visibleElementCount,
    interactionState: input.interactionState,
    strategy: zoomConfig.strategy,
  });

  return {
    budgetDecision,
    zoomStrategy,
  };
}
