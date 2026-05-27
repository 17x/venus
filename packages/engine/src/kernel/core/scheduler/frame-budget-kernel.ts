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

const KB = 1024;
const MB = KB * KB;
const BASE_DRAW_SUBMIT_BUDGET_MS = 24;
const BASE_TEXTURE_UPLOAD_MULTIPLIER = 8;
const BASE_TEXTURE_UPLOAD_BUDGET_BYTES = BASE_TEXTURE_UPLOAD_MULTIPLIER * MB;
const BASE_TILE_PRELOAD_BUDGET_MS = 6;
const BASE_TILE_PRELOAD_MAX_UPLOADS = 6;
const BASE_OVERLAY_PASS_BUDGET_MS = 2;

const HIGH_SCENE_NODE_THRESHOLD = 18_000;
const HIGH_TILE_QUEUE_THRESHOLD = 256;
const HIGH_DIRTY_REGION_THRESHOLD = 24;
const MEDIUM_SCENE_NODE_THRESHOLD = 8_000;
const MEDIUM_TILE_QUEUE_THRESHOLD = 96;
const MEDIUM_DIRTY_REGION_THRESHOLD = 8;

const INTERACTION_DRAW_BUDGET_MS = 10;
const INTERACTION_TEXTURE_UPLOAD_MULTIPLIER = 2;
const INTERACTION_TEXTURE_UPLOAD_BUDGET_BYTES = INTERACTION_TEXTURE_UPLOAD_MULTIPLIER * MB;
const INTERACTION_TILE_PRELOAD_BUDGET_MS = 2;
const INTERACTION_TILE_PRELOAD_MAX_UPLOADS = 3;
const INTERACTION_OVERLAY_PASS_BUDGET_MS = 1;

const CAMERA_DRAW_BUDGET_MS = 12;
const CAMERA_TEXTURE_UPLOAD_MULTIPLIER = 4;
const CAMERA_TEXTURE_UPLOAD_BUDGET_BYTES = CAMERA_TEXTURE_UPLOAD_MULTIPLIER * MB;
const CAMERA_TILE_PRELOAD_BUDGET_MS = 3;
const CAMERA_TILE_PRELOAD_MAX_UPLOADS = 4;

const MIN_DRAW_BUDGET_MS = 8;
const MIN_TEXTURE_UPLOAD_MULTIPLIER = 512;
const MIN_TEXTURE_UPLOAD_BUDGET_BYTES = MIN_TEXTURE_UPLOAD_MULTIPLIER * KB;
const MIN_TILE_PRELOAD_BUDGET_MS = 1;
const MIN_TILE_PRELOAD_MAX_UPLOADS = 1;
const MIN_OVERLAY_PASS_BUDGET_MS = 1;
const HIGH_OVERLAY_PASS_BUDGET_MS = 0;
const MEDIUM_TEXTURE_CONTRACTION_RATIO = 0.75;
const HIGH_TEXTURE_CONTRACTION_RATIO = 0.5;
const MEDIUM_DRAW_BUDGET_DECREMENT_MS = 2;
const HIGH_DRAW_BUDGET_DECREMENT_MS = 4;
const MEDIUM_TILE_PRELOAD_DECREMENT = 1;
const MEDIUM_MAX_UPLOADS_DECREMENT = 1;
const MEDIUM_OVERLAY_PASS_DECREMENT = 1;

const BASE_BUDGET: EngineFrameBudget = {
  drawSubmitBudgetMs: BASE_DRAW_SUBMIT_BUDGET_MS,
  textureUploadBudgetBytes: BASE_TEXTURE_UPLOAD_BUDGET_BYTES,
  tilePreloadBudgetMs: BASE_TILE_PRELOAD_BUDGET_MS,
  tilePreloadMaxUploads: BASE_TILE_PRELOAD_MAX_UPLOADS,
  overlayPassBudgetMs: BASE_OVERLAY_PASS_BUDGET_MS,
};

/**
 * Resolves structured threshold signals from scheduler pressure inputs.
 * @param input Budget broker input snapshot.
 */
export function resolveFrameBudgetPressureSignals(
  input: EngineFrameBudgetBrokerInput,
): EngineFrameBudgetPressureSignals {
  return {
    sceneNodeCountHigh: input.sceneNodeCount >= HIGH_SCENE_NODE_THRESHOLD,
    tileQueuePendingHigh: input.tileQueuePendingCount >= HIGH_TILE_QUEUE_THRESHOLD,
    dirtyRegionCountHigh: input.dirtyRegionCount >= HIGH_DIRTY_REGION_THRESHOLD,
    sceneNodeCountMedium: input.sceneNodeCount >= MEDIUM_SCENE_NODE_THRESHOLD,
    tileQueuePendingMedium: input.tileQueuePendingCount >= MEDIUM_TILE_QUEUE_THRESHOLD,
    dirtyRegionCountMedium: input.dirtyRegionCount >= MEDIUM_DIRTY_REGION_THRESHOLD,
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
      drawSubmitBudgetMs: INTERACTION_DRAW_BUDGET_MS,
      textureUploadBudgetBytes: INTERACTION_TEXTURE_UPLOAD_BUDGET_BYTES,
      tilePreloadBudgetMs: INTERACTION_TILE_PRELOAD_BUDGET_MS,
      tilePreloadMaxUploads: INTERACTION_TILE_PRELOAD_MAX_UPLOADS,
      overlayPassBudgetMs: INTERACTION_OVERLAY_PASS_BUDGET_MS,
    };
  }

  if (input.phase === "camera") {
    return {
      drawSubmitBudgetMs: CAMERA_DRAW_BUDGET_MS,
      textureUploadBudgetBytes: CAMERA_TEXTURE_UPLOAD_BUDGET_BYTES,
      tilePreloadBudgetMs: CAMERA_TILE_PRELOAD_BUDGET_MS,
      tilePreloadMaxUploads: CAMERA_TILE_PRELOAD_MAX_UPLOADS,
      overlayPassBudgetMs: INTERACTION_OVERLAY_PASS_BUDGET_MS,
    };
  }

  return {
    drawSubmitBudgetMs: INTERACTION_DRAW_BUDGET_MS,
    textureUploadBudgetBytes: INTERACTION_TEXTURE_UPLOAD_BUDGET_BYTES,
    tilePreloadBudgetMs: INTERACTION_TILE_PRELOAD_BUDGET_MS,
    tilePreloadMaxUploads: INTERACTION_TILE_PRELOAD_MAX_UPLOADS,
    overlayPassBudgetMs: INTERACTION_OVERLAY_PASS_BUDGET_MS,
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
      drawSubmitBudgetMs: Math.max(
        MIN_DRAW_BUDGET_MS,
        budget.drawSubmitBudgetMs - MEDIUM_DRAW_BUDGET_DECREMENT_MS,
      ),
      textureUploadBudgetBytes: Math.max(
        MIN_TEXTURE_UPLOAD_BUDGET_BYTES,
        Math.floor(budget.textureUploadBudgetBytes * MEDIUM_TEXTURE_CONTRACTION_RATIO),
      ),
      tilePreloadBudgetMs: Math.max(
        MIN_TILE_PRELOAD_BUDGET_MS,
        budget.tilePreloadBudgetMs - MEDIUM_TILE_PRELOAD_DECREMENT,
      ),
      tilePreloadMaxUploads: Math.max(
        MIN_TILE_PRELOAD_MAX_UPLOADS,
        budget.tilePreloadMaxUploads - MEDIUM_MAX_UPLOADS_DECREMENT,
      ),
      overlayPassBudgetMs: Math.max(
        MIN_OVERLAY_PASS_BUDGET_MS,
        budget.overlayPassBudgetMs - MEDIUM_OVERLAY_PASS_DECREMENT,
      ),
    };
  }

  return {
    drawSubmitBudgetMs: Math.max(
      MIN_DRAW_BUDGET_MS,
      budget.drawSubmitBudgetMs - HIGH_DRAW_BUDGET_DECREMENT_MS,
    ),
    textureUploadBudgetBytes: Math.max(
      MIN_TEXTURE_UPLOAD_BUDGET_BYTES,
      Math.floor(budget.textureUploadBudgetBytes * HIGH_TEXTURE_CONTRACTION_RATIO),
    ),
    tilePreloadBudgetMs: MIN_TILE_PRELOAD_BUDGET_MS,
    tilePreloadMaxUploads: MIN_TILE_PRELOAD_MAX_UPLOADS,
    overlayPassBudgetMs: HIGH_OVERLAY_PASS_BUDGET_MS,
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
