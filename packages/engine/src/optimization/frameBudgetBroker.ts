/**
 * Re-exports canonical frame-budget broker contracts and behavior from kernel scheduler ownership.
 */
export {
  applyPressureContraction,
  resolveEngineFrameBudget,
  resolveFrameBudgetPressure,
  resolveFrameBudgetPressureReason,
  resolveFrameBudgetPressureSignals,
  resolvePhaseBudget,
  type EngineFrameBudget,
  type EngineFrameBudgetBrokerDecision,
  type EngineFrameBudgetBrokerInput,
  type EngineFrameBudgetPhase,
  type EngineFrameBudgetPressure,
  type EngineFrameBudgetPressureSignals,
} from "../kernel/core/scheduler/frame-budget-kernel";
