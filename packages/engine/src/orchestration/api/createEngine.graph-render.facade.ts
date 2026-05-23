import type { EngineGraphInput, EngineHandle, EngineRenderResult } from "./public-types";

type EngineGraphRenderFacadeDependencies = {
  emitHook: (stage: "beforeCompile" | "afterCompile" | "beforeRenderPlan" | "afterRenderPlan" | "beforeSubmit" | "afterSubmit", context?: unknown) => void;
  emitEvent: (type: string, payload: unknown) => void;
  applyGraphSnapshot: (graph: EngineGraphInput) => void;
  applyGraphPatchBatch: (patch: Parameters<EngineHandle["updateGraph"]>[0]) => void;
  getGraphRevision: () => number;
  getGraphNodes: () => readonly ReturnType<EngineHandle["getGraph"]>["nodes"][number][];
  getGraphNodeCount: () => number;
  queryGraph: (bounds: Parameters<EngineHandle["query"]>[0]) => ReturnType<EngineHandle["query"]>;
  pickGraph: (
    point: Parameters<EngineHandle["pick"]>[0],
    options?: Parameters<EngineHandle["pick"]>[1],
  ) => ReturnType<EngineHandle["pick"]>;
  raycastGraph: (
    ray: Parameters<EngineHandle["raycast"]>[0],
    options?: Parameters<EngineHandle["raycast"]>[1],
  ) => ReturnType<EngineHandle["raycast"]>;
  resolveFrameOrchestration: (timestampMs: number) => { timestampMs: number };
  resolveNow: () => number;
  getLastInteractionKind: () => string;
  getLatestExecutionSnapshot: () => { drawCount: number; visibleCandidateIds: readonly string[] };
};

/**
 * Builds graph mutation/query and render entrypoints while preserving existing event/hook telemetry behavior.
 * @param dependencies Shared graph/runtime delegates sourced from createEngine closure state.
 */
export function createEngineGraphRenderFacade(
  dependencies: EngineGraphRenderFacadeDependencies,
): Pick<
  EngineHandle,
  | "setGraph"
  | "updateGraph"
  | "batchUpdateGraph"
  | "getGraph"
  | "clearGraph"
  | "validateGraph"
  | "normalizeGraph"
  | "importGraph"
  | "exportGraph"
  | "query"
  | "pick"
  | "raycast"
  | "render"
  | "renderNow"
> {
  const {
    emitHook,
    emitEvent,
    applyGraphSnapshot,
    applyGraphPatchBatch,
    getGraphRevision,
    getGraphNodes,
    getGraphNodeCount,
    queryGraph,
    pickGraph,
    raycastGraph,
    resolveFrameOrchestration,
    resolveNow,
    getLastInteractionKind,
    getLatestExecutionSnapshot,
  } = dependencies;

  return {
    /**
     * Applies full graph snapshot and emits deterministic document events.
     * @param graph Complete graph snapshot used to replace document state.
     */
    setGraph(graph) {
      emitHook("beforeCompile", {
        operation: "setGraph",
        inputRevision: graph.revision,
      });
      applyGraphSnapshot(graph);
      emitHook("afterCompile", {
        operation: "setGraph",
        nodeCount: getGraphNodeCount(),
      });
      emitEvent("engine.document.graphSet", {
        revision: getGraphRevision(),
        nodeCount: getGraphNodeCount(),
      });
      emitEvent("engine.document.revisionChanged", {
        revision: getGraphRevision(),
      });
    },
    /**
     * Applies incremental graph patch and emits deterministic document events.
     * @param patch Incremental patch batch merged into existing graph state.
     */
    updateGraph(patch) {
      emitHook("beforeCompile", {
        operation: "updateGraph",
        patchCount: patch.patches.length,
      });
      applyGraphPatchBatch(patch);
      emitHook("afterCompile", {
        operation: "updateGraph",
        patchCount: patch.patches.length,
        nodeCount: getGraphNodeCount(),
      });
      emitEvent("engine.document.graphPatched", {
        revision: getGraphRevision(),
        patchCount: patch.patches.length,
      });
      emitEvent("engine.document.revisionChanged", {
        revision: getGraphRevision(),
      });
    },
    /**
     * Applies a batch of graph patch payloads.
     * @param patches Ordered patch payloads.
     */
    batchUpdateGraph(patches) {
      for (const patch of patches) {
        applyGraphPatchBatch(patch);
      }
    },
    /**
     * Returns current graph snapshot.
     */
    getGraph() {
      return {
        revision: getGraphRevision(),
        nodes: [...getGraphNodes()],
      };
    },
    /**
     * Clears graph snapshot to empty node list.
     */
    clearGraph() {
      applyGraphSnapshot({ nodes: [] });
    },
    /**
     * Validates graph input shape and node identifiers.
     * @param graph Graph payload candidate.
     */
    validateGraph(graph) {
      const issues: string[] = [];
      if (!graph || !Array.isArray(graph.nodes)) {
        issues.push("ENGINE_GRAPH_INVALID_INPUT");
      }
      if (Array.isArray(graph?.nodes)) {
        for (const node of graph.nodes) {
          if (typeof node.id !== "string" || node.id.length === 0) {
            issues.push("ENGINE_GRAPH_INVALID_NODE_ID");
            break;
          }
        }
      }
      return {
        valid: issues.length === 0,
        issues,
      };
    },
    /**
     * Produces deterministically sorted graph snapshot.
     * @param input Graph payload candidate.
     */
    normalizeGraph(input) {
      const sortedNodes = [...(input.nodes ?? [])].sort((left, right) => left.id.localeCompare(right.id));
      return {
        revision: input.revision,
        nodes: sortedNodes,
      };
    },
    /**
     * Imports graph payload and normalizes fallback behavior for invalid input.
     * @param payload Arbitrary graph payload candidate.
     */
    importGraph(payload) {
      const graph =
        payload && typeof payload === "object" && Array.isArray((payload as { nodes?: unknown }).nodes)
          ? (payload as EngineGraphInput)
          : { nodes: [] as const };
      const normalized = {
        revision: graph.revision,
        nodes: [...graph.nodes],
      };
      applyGraphSnapshot(normalized);
      return normalized;
    },
    /**
     * Exports graph snapshot.
     */
    exportGraph() {
      return {
        revision: getGraphRevision(),
        nodes: [...getGraphNodes()],
      };
    },
    /**
     * Queries graph nodes using optional bounds payload.
     * @param bounds Optional world-space bounds payload.
     */
    query(bounds) {
      return queryGraph(bounds);
    },
    /**
     * Resolves point picking result and emits pick completed/failed events.
     * @param point Point payload used by picking.
     * @param pickOptions Optional picking controls.
     */
    pick(point, pickOptions) {
      const result = pickGraph(point, pickOptions);
      if (result.hits.length > 0) {
        emitEvent("engine.interaction.pickCompleted", {
          hitCount: result.hits.length,
          point,
        });
      } else {
        emitEvent("engine.interaction.pickFailed", {
          point,
          reason: "NO_HITS",
        });
      }
      return result;
    },
    /**
     * Resolves raycast result and emits pick completed/failed events.
     * @param ray Ray payload used by raycast.
     * @param raycastOptions Optional raycast controls.
     */
    raycast(ray, raycastOptions) {
      const hit = raycastGraph(ray, raycastOptions);
      if (hit) {
        emitEvent("engine.interaction.pickCompleted", {
          hitCount: 1,
          ray,
        });
      } else {
        emitEvent("engine.interaction.pickFailed", {
          ray,
          reason: "NO_HITS",
        });
      }
      return hit;
    },
    /**
     * Renders one frame and emits frame started/completed/failed events.
     */
    async render(): Promise<EngineRenderResult> {
      emitHook("beforeRenderPlan", {
        interactionKind: getLastInteractionKind(),
      });
      emitEvent("engine.render.frameStarted", {
        interactionKind: getLastInteractionKind(),
      });
      try {
        const stats = resolveFrameOrchestration(resolveNow());
        const snapshot = getLatestExecutionSnapshot();
        const result = {
          drawCount: snapshot.drawCount,
          visibleCount: snapshot.visibleCandidateIds.length,
          frameMs: Math.max(0, stats.timestampMs),
        };
        emitHook("afterRenderPlan", result);
        emitHook("beforeSubmit", {
          drawCount: result.drawCount,
        });
        emitHook("afterSubmit", {
          drawCount: result.drawCount,
        });
        emitEvent("engine.render.frameCompleted", result);
        return result;
      } catch (error) {
        emitEvent("engine.render.frameFailed", {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    /**
     * Alias for render to preserve immediate render API semantics.
     */
    async renderNow() {
      return this.render();
    },
  };
}
