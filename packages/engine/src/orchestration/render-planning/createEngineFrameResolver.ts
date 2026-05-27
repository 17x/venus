import type { ResolvedEnginePerformanceOptions } from "../../orchestration/api/createEngineContracts";
import type { CreateEnginePolicyBootstrap } from "../../optimization/createEnginePolicyBootstrap";
import {
  resolveRuntimeFrameController,
  type EngineRuntimeFrameControllerDecision,
} from "../render-runtime/runtimeFrameController";

/**
 * Minimal viewport snapshot consumed by staged frame planning.
 */
export interface EnginePlanningViewport {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Viewport horizontal offset in world space. */
  offsetX: number;
  /** Viewport vertical offset in world space. */
  offsetY: number;
  /** Viewport scale factor. */
  scale: number;
}

/**
 * Minimal scene summary consumed by staged frame planning.
 */
export interface EnginePlanningSceneSummary {
  /** Total node count available in the runtime scene. */
  nodeCount: number;
}

/**
 * Runtime pressure tier used by staged planning decisions.
 */
export type EngineBudgetPressure = "low" | "medium" | "high";

/**
 * Planning decision payload returned by staged frame resolver.
 */
export interface EngineFramePlanningDecision {
  /** Strategy phase selected for the frame. */
  phase: "static" | "interactive";
  /** Whether interaction mode is active for the frame. */
  interactionActive: boolean;
  /** Overscan border in CSS pixels for visibility planning. */
  overscanBorderPx: number;
  /** Estimated shortlist candidate ratio in range [0, 1]. */
  shortlistCandidateRatio: number;
  /** Pressure tier computed from scene size and budget. */
  pressure: EngineBudgetPressure;
  /** Runtime strategy and budget decision snapshot. */
  runtime: EngineRuntimeFrameControllerDecision;
}

/**
 * Resolves one staged frame-planning decision from scene and viewport summaries.
 * @param options Planning dependencies for the current frame.
 */
export function resolveCreateEngineFrame(options: {
  /** Scene summary containing node-count signal. */
  scene: EnginePlanningSceneSummary;
  /** Viewport snapshot used for interaction heuristics. */
  viewport: EnginePlanningViewport;
  /** Normalized performance options. */
  performance: ResolvedEnginePerformanceOptions;
  /** Policy bootstrap output used for budget thresholds. */
  policy: CreateEnginePolicyBootstrap;
  /** True when input interaction is currently active. */
  interactionActive: boolean;
  /** Current frame timestamp in milliseconds. */
  nowMs?: number;
  /** Last interaction timestamp in milliseconds. */
  lastInteractionAtMs?: number;
  /** Last interaction kind used by runtime strategy. */
  lastInteractionKind?: "none" | "set" | "pan" | "zoom";
  /** Whether camera animation is active for runtime strategy. */
  cameraAnimationActive?: boolean;
  /** Whether camera animation should prefer cache preview mode. */
  cameraCachePreviewOnly?: boolean;
  /** Settling delay for runtime strategy. */
  settleDelayMs?: number;
  /** Pending tile backlog count for budget broker. */
  tileQueuePendingCount?: number;
  /** Dirty region count for budget broker. */
  dirtyRegionCount?: number;
}): EngineFramePlanningDecision {
  const SHORTLIST_DENOMINATOR_OFFSET = 1200;
  const PRESSURE_HIGH_DIVISOR = 1000;
  const PRESSURE_MEDIUM_DIVISOR = 2000;
  const DEFAULT_SETTLE_DELAY_MS = 120;

  const phase = options.interactionActive ? "interactive" : "static";
  const shortlistCandidateRatio = Math.min(
    1,
    Math.max(0, options.scene.nodeCount / Math.max(1, options.scene.nodeCount + SHORTLIST_DENOMINATOR_OFFSET)),
  );

  const pressure: EngineBudgetPressure =
    options.scene.nodeCount > options.policy.budget.uploadBudgetBytes / PRESSURE_HIGH_DIVISOR
      ? "high"
      : options.scene.nodeCount > options.policy.budget.uploadBudgetBytes / PRESSURE_MEDIUM_DIVISOR
        ? "medium"
        : "low";

  const runtime = resolveRuntimeFrameController({
    nowMs: options.nowMs ?? options.lastInteractionAtMs ?? 0,
    scene: options.scene,
    viewport: options.viewport,
    lodEnabled: options.performance.culling,
    cameraAnimationActive: options.cameraAnimationActive ?? false,
    cameraCachePreviewOnly: options.cameraCachePreviewOnly ?? true,
    lastInteractionAtMs: options.lastInteractionAtMs ?? 0,
    lastInteractionKind: options.lastInteractionKind ?? "none",
    settleDelayMs: options.settleDelayMs ?? DEFAULT_SETTLE_DELAY_MS,
    tileQueuePendingCount: options.tileQueuePendingCount ?? 0,
    dirtyRegionCount: options.dirtyRegionCount ?? 0,
  });

  return {
    phase,
    interactionActive: options.interactionActive,
    overscanBorderPx: options.performance.overscanBorderPx,
    shortlistCandidateRatio,
    pressure,
    runtime,
  };
}
