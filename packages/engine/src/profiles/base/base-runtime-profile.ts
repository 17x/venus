import type { EngineCoreModule } from "../../core/module/module-contracts";
import type { EngineRuntimeProfile } from "../profile-contracts";

/**
 * Scheduler capability module required by every assembled runtime.
 */
export const engineSchedulerModule: EngineCoreModule = {
  id: "core.scheduler",
  provides: ["scheduler.frame-phases", "scheduler.budget-policy"],
};

/**
 * Observability capability module required for diagnostics and replay-safe snapshots.
 */
export const engineObservabilityModule: EngineCoreModule = {
  id: "core.observability",
  provides: ["observability.diagnostics", "observability.frame-capture"],
};

/**
 * Smallest deterministic runtime profile used as the assembly baseline.
 */
export const baseRuntimeProfile: EngineRuntimeProfile = {
  id: "base-runtime",
  target: "base",
  strictness: "strict",
  modules: [engineSchedulerModule, engineObservabilityModule],
  requiredCapabilities: [
    "scheduler.frame-phases",
    "observability.diagnostics",
  ],
  backendPriority: ["headless"],
};
