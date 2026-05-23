import type {
  EngineFrameBudget,
  EngineFrameBudgetBrokerDecision,
  EngineFrameBudgetBrokerInput,
  EngineFrameBudgetPressure,
  EngineFrameBudgetPressureSignals,
} from "./frame-budget-kernel";

/**
 * Declares one core-owned frame-budget scheduler module contract.
 */
export interface EngineSchedulerModule {
  /**
   * Resolves one frame-budget decision from strategy and pressure signals.
   */
  resolveFrameBudget: (
    input: EngineFrameBudgetBrokerInput,
  ) => EngineFrameBudgetBrokerDecision;
  /**
   * Resolves pressure tier from scheduler input.
   */
  resolveFrameBudgetPressure: (
    input: EngineFrameBudgetBrokerInput,
  ) => EngineFrameBudgetPressure;
  /**
   * Resolves pressure threshold signals from scheduler input.
   */
  resolveFrameBudgetPressureSignals: (
    input: EngineFrameBudgetBrokerInput,
  ) => EngineFrameBudgetPressureSignals;
  /**
   * Resolves human-readable pressure reason from pressure and signals.
   */
  resolveFrameBudgetPressureReason: (
    pressure: EngineFrameBudgetPressure,
    signals: EngineFrameBudgetPressureSignals,
  ) => string;
  /**
   * Resolves phase-specific budget before pressure contraction.
   */
  resolvePhaseBudget: (input: EngineFrameBudgetBrokerInput) => EngineFrameBudget;
}
