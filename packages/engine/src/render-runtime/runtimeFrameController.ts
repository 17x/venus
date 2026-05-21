import type { EnginePlanningSceneSummary, EnginePlanningViewport } from "../render-planning/createEngineFrameResolver";
import {
  resolveEngineRenderStrategy,
  type EngineInteractionMutationKind,
} from "./strategy";
import { createEngineSchedulerModule } from "../core/scheduler/frame-budget-module";

const schedulerModule = createEngineSchedulerModule();

/**
 * Runtime frame controller input used to join strategy and scheduler decisions.
 */
export interface EngineRuntimeFrameControllerInput {
  /** Current frame timestamp in milliseconds. */
  nowMs: number;
  /** Current planning scene summary. */
  scene: EnginePlanningSceneSummary;
  /** Current planning viewport snapshot. */
  viewport: EnginePlanningViewport;
  /** Whether LOD behavior is currently enabled. */
  lodEnabled: boolean;
  /** Whether camera animation is currently active. */
  cameraAnimationActive: boolean;
  /** Whether camera animation prefers cache preview mode. */
  cameraCachePreviewOnly: boolean;
  /** Last interaction timestamp in milliseconds. */
  lastInteractionAtMs: number;
  /** Last interaction mutation kind. */
  lastInteractionKind: EngineInteractionMutationKind;
  /** Settling window duration in milliseconds. */
  settleDelayMs: number;
  /** Tile backlog from previous frame. */
  tileQueuePendingCount: number;
  /** Dirty region count for incremental rendering. */
  dirtyRegionCount: number;
}

/**
 * Runtime frame controller decision payload.
 */
export interface EngineRuntimeFrameControllerDecision {
  /** Strategy decision for the current frame. */
  strategy: ReturnType<typeof resolveEngineRenderStrategy>;
  /** Budget broker decision for the current frame. */
  budget: ReturnType<typeof schedulerModule.resolveFrameBudget>;
}

/**
 * Resolves runtime strategy and budget in one orchestration step.
 * @param input Runtime frame controller input.
 */
export function resolveRuntimeFrameController(
  input: EngineRuntimeFrameControllerInput,
): EngineRuntimeFrameControllerDecision {
  const strategy = resolveEngineRenderStrategy({
    nowMs: input.nowMs,
    lodEnabled: input.lodEnabled,
    cameraAnimationActive: input.cameraAnimationActive,
    cameraCachePreviewOnly: input.cameraCachePreviewOnly,
    lastInteractionAtMs: input.lastInteractionAtMs,
    lastInteractionKind: input.lastInteractionKind,
    settleDelayMs: input.settleDelayMs,
  });

  const budget = schedulerModule.resolveFrameBudget({
    phase: strategy.phase,
    interactionActive: strategy.interactionActive,
    sceneNodeCount: input.scene.nodeCount,
    tileQueuePendingCount: input.tileQueuePendingCount,
    dirtyRegionCount: input.dirtyRegionCount,
  });

  return {
    strategy,
    budget,
  };
}
