import {
  resolveEngineFrameBudget,
  resolveFrameBudgetPressure,
  resolveFrameBudgetPressureReason,
  resolveFrameBudgetPressureSignals,
  resolvePhaseBudget,
} from "../../../optimization/frameBudgetBroker";
import type { EngineSchedulerModule } from "./scheduler-module-contracts";

/**
 * Creates one core scheduler module wrapper around canonical frame-budget broker behavior.
 */
export function createEngineSchedulerModule(): EngineSchedulerModule {
  return {
    /**
     * Resolves one frame-budget decision through canonical scheduler implementation.
     * @param input Budget broker input snapshot.
     */
    resolveFrameBudget(input) {
      return resolveEngineFrameBudget(input);
    },
    /**
     * Resolves pressure tier through canonical scheduler implementation.
     * @param input Budget broker input snapshot.
     */
    resolveFrameBudgetPressure(input) {
      return resolveFrameBudgetPressure(input);
    },
    /**
     * Resolves pressure signals through canonical scheduler implementation.
     * @param input Budget broker input snapshot.
     */
    resolveFrameBudgetPressureSignals(input) {
      return resolveFrameBudgetPressureSignals(input);
    },
    /**
     * Resolves human-readable pressure reason through canonical scheduler implementation.
     * @param pressure Resolved pressure tier.
     * @param signals Threshold signals used for tier resolution.
     */
    resolveFrameBudgetPressureReason(pressure, signals) {
      return resolveFrameBudgetPressureReason(pressure, signals);
    },
    /**
     * Resolves phase budget through canonical scheduler implementation.
     * @param input Budget broker input snapshot.
     */
    resolvePhaseBudget(input) {
      return resolvePhaseBudget(input);
    },
  };
}
