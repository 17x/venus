/**
 * Strategy phase subset consumed by frame-budget broker heuristics.
 */
export type EngineFrameBudgetPhase = "static" | "pan" | "zoom" | "camera" | "settling";

/**
 * Coarse pressure tier used for frame-budget contractions.
 */
export type EngineFrameBudgetPressure = "low" | "medium" | "high";

/**
 * Frame budget slices consumed by staged planning and execution.
 */
export interface EngineFrameBudget {
  /** Draw submission budget in milliseconds. */
  drawSubmitBudgetMs: number;
  /** Texture upload budget in bytes. */
  textureUploadBudgetBytes: number;
  /** Tile preload budget in milliseconds. */
  tilePreloadBudgetMs: number;
  /** Maximum tile preload uploads for the frame. */
  tilePreloadMaxUploads: number;
  /** Overlay pass budget in milliseconds. */
  overlayPassBudgetMs: number;
}

/**
 * Input snapshot for resolving one frame budget decision.
 */
export interface EngineFrameBudgetBrokerInput {
  /** Strategy phase selected for the frame. */
  phase: EngineFrameBudgetPhase;
  /** Whether frame is interaction-active. */
  interactionActive: boolean;
  /** Scene node count used for pressure heuristics. */
  sceneNodeCount: number;
  /** Pending tile backlog from previous frames. */
  tileQueuePendingCount: number;
  /** Dirty region count for incremental rebuild pressure. */
  dirtyRegionCount: number;
}

/**
 * Budget broker decision used by planning diagnostics.
 */
export interface EngineFrameBudgetBrokerDecision {
  /** Resolved frame budget slices. */
  budget: EngineFrameBudget;
  /** Resolved pressure tier. */
  pressure: EngineFrameBudgetPressure;
  /** Structured pressure signals used for diagnostics and policy traceability. */
  signals: EngineFrameBudgetPressureSignals;
  /** Human-readable reason explaining why the pressure tier was selected. */
  reason: string;
}

/**
 * Structured threshold signals used to diagnose pressure-tier transitions.
 */
export interface EngineFrameBudgetPressureSignals {
  /** True when scene-node count crossed high-pressure threshold. */
  sceneNodeCountHigh: boolean;
  /** True when tile backlog crossed high-pressure threshold. */
  tileQueuePendingHigh: boolean;
  /** True when dirty-region count crossed high-pressure threshold. */
  dirtyRegionCountHigh: boolean;
  /** True when scene-node count crossed medium-pressure threshold. */
  sceneNodeCountMedium: boolean;
  /** True when tile backlog crossed medium-pressure threshold. */
  tileQueuePendingMedium: boolean;
  /** True when dirty-region count crossed medium-pressure threshold. */
  dirtyRegionCountMedium: boolean;
}

const BASE_BUDGET: EngineFrameBudget = {
  drawSubmitBudgetMs: 24,
  textureUploadBudgetBytes: 8 * 1024 * 1024,
  tilePreloadBudgetMs: 6,
  tilePreloadMaxUploads: 6,
  overlayPassBudgetMs: 2,
};

/**
 * Resolves structured threshold signals from scheduler pressure inputs.
 * @param input Budget broker input snapshot.
 */
export function resolveFrameBudgetPressureSignals(
  input: EngineFrameBudgetBrokerInput,
): EngineFrameBudgetPressureSignals {
  return {
    sceneNodeCountHigh: input.sceneNodeCount >= 18_000,
    tileQueuePendingHigh: input.tileQueuePendingCount >= 256,
    dirtyRegionCountHigh: input.dirtyRegionCount >= 24,
    sceneNodeCountMedium: input.sceneNodeCount >= 8_000,
    tileQueuePendingMedium: input.tileQueuePendingCount >= 96,
    dirtyRegionCountMedium: input.dirtyRegionCount >= 8,
  };
}

/**
 * Builds one deterministic reason string from pressure signals and resolved tier.
 * @param pressure Resolved pressure tier.
 * @param signals Threshold signals used for tier resolution.
 */
export function resolveFrameBudgetPressureReason(
  pressure: EngineFrameBudgetPressure,
  signals: EngineFrameBudgetPressureSignals,
): string {
  if (pressure === "high") {
    const reasons: string[] = [];
    if (signals.sceneNodeCountHigh) {
      reasons.push("scene-node-count-high");
    }
    if (signals.tileQueuePendingHigh) {
      reasons.push("tile-queue-pending-high");
    }
    if (signals.dirtyRegionCountHigh) {
      reasons.push("dirty-region-count-high");
    }
    return reasons.length > 0 ? reasons.join("+") : "high-pressure-threshold";
  }

  if (pressure === "medium") {
    const reasons: string[] = [];
    if (signals.sceneNodeCountMedium) {
      reasons.push("scene-node-count-medium");
    }
    if (signals.tileQueuePendingMedium) {
      reasons.push("tile-queue-pending-medium");
    }
    if (signals.dirtyRegionCountMedium) {
      reasons.push("dirty-region-count-medium");
    }
    return reasons.length > 0 ? reasons.join("+") : "medium-pressure-threshold";
  }

  return "within-low-thresholds";
}

/**
 * Resolves pressure tier from scene and backlog signals.
 * @param input Budget broker input snapshot.
 */
export function resolveFrameBudgetPressure(
  input: EngineFrameBudgetBrokerInput,
): EngineFrameBudgetPressure {
  const signals = resolveFrameBudgetPressureSignals(input);
  if (signals.sceneNodeCountHigh || signals.tileQueuePendingHigh || signals.dirtyRegionCountHigh) {
    return "high";
  }
  if (signals.sceneNodeCountMedium || signals.tileQueuePendingMedium || signals.dirtyRegionCountMedium) {
    return "medium";
  }
  return "low";
}

/**
 * Applies phase-specific interaction budget preferences.
 * @param input Budget broker input snapshot.
 */
export function resolvePhaseBudget(
  input: EngineFrameBudgetBrokerInput,
): EngineFrameBudget {
  if (!input.interactionActive) {
    return BASE_BUDGET;
  }

  if (input.phase === "zoom") {
    return {
      drawSubmitBudgetMs: 10,
      textureUploadBudgetBytes: 2 * 1024 * 1024,
      tilePreloadBudgetMs: 2,
      tilePreloadMaxUploads: 3,
      overlayPassBudgetMs: 1,
    };
  }

  if (input.phase === "camera") {
    return {
      drawSubmitBudgetMs: 12,
      textureUploadBudgetBytes: 4 * 1024 * 1024,
      tilePreloadBudgetMs: 3,
      tilePreloadMaxUploads: 4,
      overlayPassBudgetMs: 1,
    };
  }

  return {
    drawSubmitBudgetMs: 10,
    textureUploadBudgetBytes: 2 * 1024 * 1024,
    tilePreloadBudgetMs: 2,
    tilePreloadMaxUploads: 3,
    overlayPassBudgetMs: 1,
  };
}

/**
 * Contracts budget slices based on resolved pressure tier.
 * @param budget Phase-resolved budget.
 * @param pressure Pressure tier for the frame.
 */
export function applyPressureContraction(
  budget: EngineFrameBudget,
  pressure: EngineFrameBudgetPressure,
): EngineFrameBudget {
  if (pressure === "low") {
    return budget;
  }

  if (pressure === "medium") {
    return {
      drawSubmitBudgetMs: Math.max(8, budget.drawSubmitBudgetMs - 2),
      textureUploadBudgetBytes: Math.max(512 * 1024, Math.floor(budget.textureUploadBudgetBytes * 0.75)),
      tilePreloadBudgetMs: Math.max(1, budget.tilePreloadBudgetMs - 1),
      tilePreloadMaxUploads: Math.max(1, budget.tilePreloadMaxUploads - 1),
      overlayPassBudgetMs: Math.max(1, budget.overlayPassBudgetMs - 1),
    };
  }

  return {
    drawSubmitBudgetMs: Math.max(8, budget.drawSubmitBudgetMs - 4),
    textureUploadBudgetBytes: Math.max(512 * 1024, Math.floor(budget.textureUploadBudgetBytes * 0.5)),
    tilePreloadBudgetMs: 1,
    tilePreloadMaxUploads: 1,
    overlayPassBudgetMs: 0,
  };
}

/**
 * Resolves one frame-budget decision from strategy and pressure signals.
 * @param input Budget broker input snapshot.
 */
export function resolveEngineFrameBudget(
  input: EngineFrameBudgetBrokerInput,
): EngineFrameBudgetBrokerDecision {
  const signals = resolveFrameBudgetPressureSignals(input);
  const pressure = resolveFrameBudgetPressure(input);
  const reason = resolveFrameBudgetPressureReason(pressure, signals);
  const phaseBudget = resolvePhaseBudget(input);
  const budget = applyPressureContraction(phaseBudget, pressure);
  return {
    budget,
    pressure,
    signals,
    reason,
  };
}
