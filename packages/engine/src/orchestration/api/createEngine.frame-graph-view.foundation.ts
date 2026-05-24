import type {
  EngineGraphInput,
  EngineGraphNodeInput,
  EngineGraphPatchInput,
  EngineViewInput,
  EngineViewSnapshot,
} from "./public-types";
import type { EngineDocumentChangeOperation, EngineDocumentChangeSet, EngineDocumentSnapshot } from "../../kernel/document/document-contracts";
import type { EngineExecutionSnapshot } from "../../orchestration/render-execution/stagedExecutionChain";
import type { EngineRenderFrameStats } from "../../orchestration/render-runtime/runtimeFacade";
import type { EngineDirtyDomain } from "../../kernel/dirty/dirtyPropagation/dirtyPropagation.contract";
import type { EngineIncrementalCompileOutput } from "../../kernel/compiler/incrementalCompiler";

/**
 * Defines minimal frame decision payload needed by orchestration helper.
 */
type RuntimeFrameDecision = {
  /** Runtime strategy and budget output from frame resolver. */
  runtime: {
    strategy: { phase: EngineRenderFrameStats["phase"] };
    budget: {
      budget: EngineRenderFrameStats["budget"];
      pressure: EngineRenderFrameStats["pressure"];
      reason: EngineRenderFrameStats["pressureReason"];
      signals: EngineRenderFrameStats["pressureSignals"];
    };
  };
};

/**
 * Defines dependencies required by frame/graph/view helper assembly.
 */
type FrameGraphViewFoundationDependencies = {
  /** Reads current document snapshot. */
  getDocumentSnapshot: () => EngineDocumentSnapshot;
  /** Writes current document snapshot. */
  setDocumentSnapshot: (snapshot: EngineDocumentSnapshot) => void;
  /** Applies document change-set. */
  applyDocumentChangeSet: (snapshot: EngineDocumentSnapshot, changeSet: EngineDocumentChangeSet) => EngineDocumentSnapshot;
  /** Compiles scene from document change-set context. */
  compileSceneChangeSet: (input: {
    previousSnapshot: EngineDocumentSnapshot;
    currentSnapshot: EngineDocumentSnapshot;
    changeSet: EngineDocumentChangeSet;
  }) => EngineIncrementalCompileOutput;
  /** Builds runtime world from document snapshot. */
  buildRuntimeWorldFromDocument: (snapshot: EngineDocumentSnapshot) => { revision: number };
  /** Writes runtime world snapshot override. */
  setRuntimeWorldSnapshotOverride: (snapshot: null) => void;
  /** Writes latest compile output. */
  setLatestCompileOutput: (output: EngineIncrementalCompileOutput) => void;
  /** Reads latest compile output. */
  getLatestCompileOutput: () => EngineIncrementalCompileOutput;
  /** Writes latest runtime world revision. */
  setLatestRuntimeWorldRevision: (revision: number) => void;
  /** Reads latest dirty state. */
  getLatestDirtyState: () => { dirtyDomains: readonly EngineDirtyDomain[] };
  /** Writes latest dirty state. */
  setLatestDirtyState: (state: { dirtyDomains: readonly EngineDirtyDomain[] }) => void;
  /** Marks dirty domains in batch. */
  markDirtyBatch: (
    state: { dirtyDomains: readonly EngineDirtyDomain[] },
    domains: readonly EngineDirtyDomain[],
  ) => { dirtyDomains: readonly EngineDirtyDomain[] };
  /** Resolves dirty domains from compile output. */
  resolveDirtyDomainsFromCompileOutput: (output: EngineIncrementalCompileOutput) => readonly EngineDirtyDomain[];
  /** Reads viewport state snapshot. */
  getViewport: () => { width: number; height: number; offsetX: number; offsetY: number; scale: number };
  /** Resolves staged execution snapshot. */
  resolveExecutionSnapshot: (input: {
    document: EngineDocumentSnapshot;
    compile: EngineIncrementalCompileOutput;
    viewport: { width: number; height: number; offsetX: number; offsetY: number; scale: number };
  }) => EngineExecutionSnapshot;
  /** Writes latest execution snapshot. */
  setLatestExecutionSnapshot: (snapshot: EngineExecutionSnapshot) => void;
  /** Encodes command list for replay metrics. */
  encodeCommands: (commands: readonly { id: string; kind: "draw"; payload: { entityId: string } }[]) => {
    commands: readonly { id: string; kind: string; payload: unknown }[];
  };
  /** Writes encoded command count metric. */
  setLastEncodedCommandCount: (count: number) => void;
  /** Replays command list to gather replay metrics. */
  replayCommands: (commands: readonly { id: string; kind: string; payload: unknown }[]) => {
    replayedCount: number;
    events: readonly { commandId: string }[];
  };
  /** Writes replay event count metric. */
  setLastReplayEventCount: (count: number) => void;
  /** Writes first replayed command id metric. */
  setLastReplayFirstCommandId: (commandId: string | null) => void;
  /** Resolves frame decision from planner input. */
  resolveFrameDecision: (input: {
    nodeCount: number;
    viewport: { width: number; height: number; offsetX: number; offsetY: number; scale: number };
    interactionActive: boolean;
    nowMs: number;
    lastInteractionAtMs: number;
    lastInteractionKind: "none" | "set" | "pan" | "zoom";
  }) => RuntimeFrameDecision;
  /** Writes latest frame stats. */
  setLatestFrameStats: (stats: EngineRenderFrameStats) => void;
  /** Flushes all dirty domains from state. */
  flushAllDirtyDomains: (
    state: { dirtyDomains: readonly EngineDirtyDomain[] },
  ) => { dirtyDomains: readonly EngineDirtyDomain[] };
  /** Validates profile capability requirements before running frame orchestration. */
  assertSchedulerCapability: () => void;
  /** Reads interaction timestamp. */
  getLastInteractionAtMs: () => number;
  /** Reads interaction kind token. */
  getLastInteractionKind: () => "none" | "set" | "pan" | "zoom";
  /** Reads graph node map. */
  getGraphNodeState: () => Map<string, EngineGraphNodeInput>;
  /** Resolves document node from graph node input. */
  resolveDocumentNodeFromGraphNode: (
    node: EngineGraphNodeInput,
  ) => EngineDocumentSnapshot["nodes"][string];
  /** Applies viewport patch and returns updated viewport. */
  setViewport: (view: {
    width?: number;
    height?: number;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
  }) => { width: number; height: number; offsetX: number; offsetY: number; scale: number };
  /** Resolves public view snapshot from viewport state. */
  resolveViewSnapshot: (viewport: { width: number; height: number; offsetX: number; offsetY: number; scale: number }) => EngineViewSnapshot;
  /** Resolves monotonic timestamp in milliseconds. */
  resolveNow: () => number;
  /** Writes interaction timestamp. */
  setLastInteractionAtMs: (timestampMs: number) => void;
  /** Writes interaction kind token. */
  setLastInteractionKind: (kind: "none" | "set" | "pan" | "zoom") => void;
};

/**
 * Assembles frame orchestration and graph/view mutation helper functions.
 * @param deps Shared orchestration state and module delegates from createEngine closure.
 */
export function createFrameGraphViewFoundation(
  deps: FrameGraphViewFoundationDependencies,
): {
  applyDocumentAndCompile: (changeSet: EngineDocumentChangeSet) => void;
  resolveFrameOrchestration: (timestampMs: number) => EngineRenderFrameStats;
  applyGraphSnapshot: (graph: EngineGraphInput) => void;
  applyGraphPatchBatch: (patch: EngineGraphPatchInput) => void;
  applyViewPatch: (view: EngineViewInput) => EngineViewSnapshot;
} {
  /**
   * Applies one deterministic change-set and refreshes compile/runtime execution snapshots.
   * @param changeSet Ordered document mutations for the current frame boundary.
   */
  function applyDocumentAndCompile(changeSet: EngineDocumentChangeSet): void {
    const previousSnapshot = deps.getDocumentSnapshot();
    const currentSnapshot = deps.applyDocumentChangeSet(previousSnapshot, changeSet);
    const compileOutput = deps.compileSceneChangeSet({
      previousSnapshot,
      currentSnapshot,
      changeSet,
    });
    const runtimeWorld = deps.buildRuntimeWorldFromDocument(currentSnapshot);

    deps.setDocumentSnapshot(currentSnapshot);
    deps.setRuntimeWorldSnapshotOverride(null);
    deps.setLatestCompileOutput(compileOutput);
    deps.setLatestRuntimeWorldRevision(runtimeWorld.revision);
    deps.setLatestDirtyState(
      deps.markDirtyBatch(
        deps.getLatestDirtyState(),
        deps.resolveDirtyDomainsFromCompileOutput(compileOutput),
      ),
    );
  }

  /**
   * Resolves staged planning/runtime diagnostics for one frame timestamp.
   * @param timestampMs Frame timestamp in milliseconds.
   */
  function resolveFrameOrchestration(timestampMs: number): EngineRenderFrameStats {
    deps.assertSchedulerCapability();
    const interactionActive = timestampMs - deps.getLastInteractionAtMs() <= 120;
    const viewport = deps.getViewport();
    const executionSnapshot = deps.resolveExecutionSnapshot({
      document: deps.getDocumentSnapshot(),
      compile: deps.getLatestCompileOutput(),
      viewport,
    });
    deps.setLatestExecutionSnapshot(executionSnapshot);

    const encoded = deps.encodeCommands(
      executionSnapshot.visibleCandidateIds.map((entityId, index) => ({
        id: `draw-${index}-${entityId}`,
        kind: "draw" as const,
        payload: {
          entityId,
        },
      })),
    );
    deps.setLastEncodedCommandCount(encoded.commands.length);
    const replayResult = deps.replayCommands(encoded.commands);
    deps.setLastReplayEventCount(replayResult.replayedCount);
    deps.setLastReplayFirstCommandId(replayResult.events[0]?.commandId ?? null);

    const decision = deps.resolveFrameDecision({
      nodeCount: executionSnapshot.visibleCandidateIds.length,
      viewport,
      interactionActive,
      nowMs: timestampMs,
      lastInteractionAtMs: deps.getLastInteractionAtMs(),
      lastInteractionKind: deps.getLastInteractionKind(),
    });

    const frameStats: EngineRenderFrameStats = {
      timestampMs,
      phase: decision.runtime.strategy.phase,
      pressure: decision.runtime.budget.pressure,
      pressureReason: decision.runtime.budget.reason,
      budget: decision.runtime.budget.budget,
      pressureSignals: decision.runtime.budget.signals,
    };
    deps.setLatestFrameStats(frameStats);
    deps.setLatestDirtyState(deps.flushAllDirtyDomains(deps.getLatestDirtyState()));
    return frameStats;
  }

  /**
   * Applies one complete graph snapshot as document source of truth.
   * @param graph Full graph payload from public setGraph/loadScene APIs.
   */
  function applyGraphSnapshot(graph: EngineGraphInput): void {
    const graphNodeState = deps.getGraphNodeState();
    graphNodeState.clear();
    for (const node of graph.nodes) {
      if (typeof node.id === "string" && node.id.length > 0) {
        graphNodeState.set(node.id, node);
      }
    }

    const nextNodes = graph.nodes
      .filter((node) => typeof node.id === "string" && node.id.length > 0)
      .map((node) => deps.resolveDocumentNodeFromGraphNode(node));
    const nextNodeIdSet = new Set(nextNodes.map((node) => node.id));
    const currentNodeIds = Object.keys(deps.getDocumentSnapshot().nodes);
    const operations: EngineDocumentChangeOperation[] = [];

    for (const nodeId of currentNodeIds) {
      if (!nextNodeIdSet.has(nodeId)) {
        operations.push({
          type: "remove-node",
          nodeId,
        });
      }
    }

    for (const node of nextNodes) {
      operations.push({
        type: "upsert-node",
        node,
      });
    }

    const currentRevision = deps.getDocumentSnapshot().revision;
    const numericRevision = typeof graph.revision === "number"
      ? graph.revision
      : Number.parseInt(String(graph.revision ?? currentRevision + 1), 10);
    applyDocumentAndCompile({
      id: `set-graph-${currentRevision + 1}`,
      targetRevision: Number.isFinite(numericRevision) ? numericRevision : currentRevision + 1,
      operations,
    });
  }

  /**
   * Applies one incremental graph patch batch.
   * @param patch Incremental graph patch payload from updateGraph/applyScenePatchBatch APIs.
   */
  function applyGraphPatchBatch(patch: EngineGraphPatchInput): void {
    const graphNodeState = deps.getGraphNodeState();
    for (const [patchIndex, stagedPatch] of patch.patches.entries()) {
      if (stagedPatch.replaceAll) {
        applyGraphSnapshot({
          revision: stagedPatch.revision,
          nodes: stagedPatch.upsertNodes ?? [],
        });
        continue;
      }

      const operations: EngineDocumentChangeOperation[] = [];
      for (const nodeId of stagedPatch.removeNodeIds ?? []) {
        graphNodeState.delete(nodeId);
        operations.push({
          type: "remove-node",
          nodeId,
        });
      }
      for (const node of stagedPatch.upsertNodes ?? []) {
        if (typeof node.id !== "string" || node.id.length === 0) {
          continue;
        }
        graphNodeState.set(node.id, node);
        operations.push({
          type: "upsert-node",
          node: deps.resolveDocumentNodeFromGraphNode(node),
        });
      }
      if (operations.length === 0) {
        continue;
      }

      const currentRevision = deps.getDocumentSnapshot().revision;
      const numericRevision = typeof stagedPatch.revision === "number"
        ? stagedPatch.revision
        : Number.parseInt(String(stagedPatch.revision ?? currentRevision + 1), 10);
      applyDocumentAndCompile({
        id: `patch-graph-${currentRevision + 1}-${patchIndex}`,
        targetRevision: Number.isFinite(numericRevision) ? numericRevision : currentRevision + 1,
        operations,
      });
    }
  }

  /**
   * Applies one viewport update patch from public setView/setViewport APIs.
   * @param view Partial viewport payload from public view methods.
   */
  function applyViewPatch(view: EngineViewInput): EngineViewSnapshot {
    deps.setLastInteractionAtMs(deps.resolveNow());
    deps.setLastInteractionKind("set");
    const nextViewport = deps.setViewport({
      width: view.viewportWidth,
      height: view.viewportHeight,
      offsetX: view.offsetX,
      offsetY: view.offsetY,
      scale: view.scale,
    });
    return deps.resolveViewSnapshot(nextViewport);
  }

  return {
    applyDocumentAndCompile,
    resolveFrameOrchestration,
    applyGraphSnapshot,
    applyGraphPatchBatch,
    applyViewPatch,
  };
}
