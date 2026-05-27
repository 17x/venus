import type {
  EngineRuntimeBudgetPlanOutput,
  EngineRuntimeBudgetPlanRequest,
  EngineRuntimeFramePlanOutput,
  EngineRuntimeLodPlanOutput,
  EngineRuntimeLodPlanRequest,
  EngineRuntimePlanFrameRequest,
  EngineRuntimePlanInspectOutput,
  EngineRuntimeRoiPlanOutput,
  EngineRuntimeRoiPlanRequest,
  EngineRuntimeVisibilityPlanOutput,
  EngineRuntimeVisibilityPlanRequest,
} from "./public-types";

/**
 * Defines normalized frame-decision payload used by runtime plan helpers.
 */
type RuntimePlanDecision = {
  /** Resolved render phase token. */
  phase: EngineRuntimeFramePlanOutput["phase"];
  /** Resolved pressure token. */
  pressure: EngineRuntimeFramePlanOutput["pressure"];
  /** Overscan border pixels from frame planner. */
  overscanBorderPx: number;
  /** Candidate shortlist ratio from frame planner. */
  shortlistCandidateRatio: number;
  /** Runtime budget decision payload. */
  runtime: { budget: { pressure: EngineRuntimeBudgetPlanOutput["pressure"]; reason: EngineRuntimeBudgetPlanOutput["reason"] } };
};

/**
 * Defines dependencies required by runtime plan helper assembly.
 */
type RuntimePlanFoundationDependencies = {
  /** Resolves frame decision from normalized planner input. */
  resolveFrameDecision: (input: {
    nodeCount: number;
    viewportWidth: number;
    viewportHeight: number;
    viewportScale: number;
    interactionActive: boolean;
    tileQueuePendingCount: number;
    dirtyRegionCount: number;
  }) => RuntimePlanDecision;
  /** Reads current viewport scale. */
  getViewportScale: () => number;
  /** Reads current document revision. */
  getDocumentRevision: () => number;
};

/**
 * Assembles runtime planning helper functions used by runtime namespace APIs.
 * @param deps Planning callbacks and state readers sourced from createEngine.
 */
export function createRuntimePlanFoundation(
  deps: RuntimePlanFoundationDependencies,
): {
  createRuntimeFramePlan: (request: EngineRuntimePlanFrameRequest) => EngineRuntimeFramePlanOutput;
  createRuntimeVisibilityPlan: (request: EngineRuntimeVisibilityPlanRequest) => EngineRuntimeVisibilityPlanOutput;
  createRuntimeLodPlan: (request: EngineRuntimeLodPlanRequest) => EngineRuntimeLodPlanOutput;
  createRuntimeRoiPlan: (request: EngineRuntimeRoiPlanRequest) => EngineRuntimeRoiPlanOutput;
  createRuntimeBudgetPlan: (request: EngineRuntimeBudgetPlanRequest) => EngineRuntimeBudgetPlanOutput;
  inspectRuntimePlan: (plan: unknown) => EngineRuntimePlanInspectOutput;
} {
  /**
   * Creates one runtime frame-plan payload from explicit planning request.
   * @param request Runtime planning request payload.
   */
  function createRuntimeFramePlan(request: EngineRuntimePlanFrameRequest): EngineRuntimeFramePlanOutput {
    if (!request || !Number.isFinite(request.nodeCount)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const runtimeDecision = deps.resolveFrameDecision({
      nodeCount: Math.max(0, request.nodeCount),
      viewportWidth: Math.max(1, request.viewportWidth),
      viewportHeight: Math.max(1, request.viewportHeight),
      viewportScale: deps.getViewportScale(),
      interactionActive: request.interactionActive,
      tileQueuePendingCount: 0,
      dirtyRegionCount: 0,
    });
    return {
      planId: `plan-${deps.getDocumentRevision()}-${Math.max(0, request.nodeCount)}`,
      phase: runtimeDecision.phase,
      pressure: runtimeDecision.pressure,
      overscanBorderPx: runtimeDecision.overscanBorderPx,
      shortlistCandidateRatio: runtimeDecision.shortlistCandidateRatio,
    };
  }

  /**
   * Creates one runtime visibility-plan payload from candidate ids.
   * @param request Visibility-plan request payload.
   */
  function createRuntimeVisibilityPlan(
    request: EngineRuntimeVisibilityPlanRequest,
  ): EngineRuntimeVisibilityPlanOutput {
    if (!request || !Array.isArray(request.candidateNodeIds)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const visibleNodeIds = [...request.candidateNodeIds].sort();
    return {
      visibleNodeIds,
      visibleCount: visibleNodeIds.length,
    };
  }

  /**
   * Creates one runtime LOD-plan payload from viewport scale.
   * @param request LOD-plan request payload.
   */
  function createRuntimeLodPlan(request: EngineRuntimeLodPlanRequest): EngineRuntimeLodPlanOutput {
    if (!request || !Number.isFinite(request.scale)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const threshold = typeof request.baseThreshold === "number" ? request.baseThreshold : 1;
    const LOD_FINE_THRESHOLD_MULTIPLIER = 1.5;
    const lodLevel: EngineRuntimeLodPlanOutput["lodLevel"] =
      request.scale >= threshold * LOD_FINE_THRESHOLD_MULTIPLIER
        ? "fine"
        : request.scale >= threshold
          ? "balanced"
          : "coarse";
    return {
      lodLevel,
      threshold,
    };
  }

  /**
   * Creates one runtime ROI-plan payload from bounds request.
   * @param request ROI-plan request payload.
   */
  function createRuntimeRoiPlan(request: EngineRuntimeRoiPlanRequest): EngineRuntimeRoiPlanOutput {
    if (!request || !Number.isFinite(request.width) || !Number.isFinite(request.height)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const margin = typeof request.margin === "number" ? Math.max(0, request.margin) : 0;
    const ROI_MARGIN_MULTIPLIER = 2;
    return {
      x: request.x - margin,
      y: request.y - margin,
      width: Math.max(0, request.width) + margin * ROI_MARGIN_MULTIPLIER,
      height: Math.max(0, request.height) + margin * ROI_MARGIN_MULTIPLIER,
    };
  }

  /**
   * Creates one runtime budget-plan payload from pressure signals.
   * @param request Budget-plan request payload.
   */
  function createRuntimeBudgetPlan(
    request: EngineRuntimeBudgetPlanRequest,
  ): EngineRuntimeBudgetPlanOutput {
    if (!request || !Number.isFinite(request.nodeCount)) {
      throw new Error("ENGINE_PLAN_INVALID_REQUEST");
    }
    const frameDecision = deps.resolveFrameDecision({
      nodeCount: Math.max(0, request.nodeCount),
      viewportWidth: 1,
      viewportHeight: 1,
      viewportScale: deps.getViewportScale(),
      interactionActive: false,
      tileQueuePendingCount: Math.max(0, request.tileQueuePendingCount),
      dirtyRegionCount: Math.max(0, request.dirtyRegionCount),
    });
    return {
      pressure: frameDecision.runtime.budget.pressure,
      reason: frameDecision.runtime.budget.reason,
    };
  }

  /**
   * Inspects one runtime plan payload and returns stable summary text.
   * @param plan Arbitrary runtime plan payload.
   */
  function inspectRuntimePlan(plan: unknown): EngineRuntimePlanInspectOutput {
    if (!plan || typeof plan !== "object") {
      throw new Error("ENGINE_PLAN_INSPECT_INVALID");
    }
    const keys = Object.keys(plan as Record<string, unknown>).sort();
    return {
      valid: keys.length > 0,
      summary: `plan-keys:${keys.join(",")}`,
    };
  }

  return {
    createRuntimeFramePlan,
    createRuntimeVisibilityPlan,
    createRuntimeLodPlan,
    createRuntimeRoiPlan,
    createRuntimeBudgetPlan,
    inspectRuntimePlan,
  };
}
