import type {
  EngineRuntimeAuthoringDiagnosticsOutput,
  EngineRuntimeAuthoringGraphCompareInput,
  EngineRuntimeAuthoringGraphComparisonOutput,
  EngineRuntimeAuthoringGraphRecordInput,
  EngineRuntimeAuthoringGraphSnapshotInput,
  EngineRuntimeAuthoringGraphSnapshotOutput,
  EngineRuntimeAuthoringPreviewTokenInput,
  EngineRuntimeAuthoringPreviewTokenOutput,
} from "./public-types";

type RuntimeAuthoringSnapshotRecord = EngineRuntimeAuthoringGraphSnapshotOutput;

type RuntimeAuthoringComparisonRecord = EngineRuntimeAuthoringGraphComparisonOutput;

type RuntimeAuthoringDependencies = {
  runtimeAuthoringSnapshots: Map<string, RuntimeAuthoringSnapshotRecord>;
  getLastRuntimeAuthoringComparison: () => RuntimeAuthoringComparisonRecord | null;
  setLastRuntimeAuthoringComparison: (comparison: RuntimeAuthoringComparisonRecord | null) => void;
  getRuntimeAuthoringPreviewTokenCounter: () => number;
  setRuntimeAuthoringPreviewTokenCounter: (nextCounter: number) => void;
  emitEvent: (type: string, payload: unknown) => void;
};

function normalizeRevision(revision: number): number {
  if (!Number.isFinite(revision)) {
    return 0;
  }
  return Math.max(0, Math.floor(revision));
}

function resolveRecordId(record: EngineRuntimeAuthoringGraphRecordInput, fallback: string): string {
  const id = record.id;
  if (typeof id === "string" && id.length > 0) {
    return id;
  }
  return fallback;
}

function resolveIds(records: readonly EngineRuntimeAuthoringGraphRecordInput[] | undefined, prefix: string): readonly string[] {
  return [...(records ?? [])]
    .map((record, index) => resolveRecordId(record, `${prefix}-${index}`))
    .sort((left, right) => left.localeCompare(right));
}

function resolveSignature(input: {
  graphId: string;
  nodeIds: readonly string[];
  materialIds: readonly string[];
}): string {
  return [
    input.graphId,
    `n:${input.nodeIds.join(",")}`,
    `m:${input.materialIds.join(",")}`,
  ].join("|");
}

function resolveSetDifference(left: readonly string[], right: readonly string[]): readonly string[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function resolveSetIntersection(left: readonly string[], right: readonly string[]): readonly string[] {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

export function createRuntimeAuthoringFoundation(deps: RuntimeAuthoringDependencies): {
  createRuntimeAuthoringGraphSnapshot: (input: EngineRuntimeAuthoringGraphSnapshotInput) => EngineRuntimeAuthoringGraphSnapshotOutput;
  compareRuntimeAuthoringGraphSnapshots: (input: EngineRuntimeAuthoringGraphCompareInput) => EngineRuntimeAuthoringGraphComparisonOutput;
  createRuntimeAuthoringPreviewToken: (input: EngineRuntimeAuthoringPreviewTokenInput) => EngineRuntimeAuthoringPreviewTokenOutput;
  resolveRuntimeAuthoringDiagnostics: () => EngineRuntimeAuthoringDiagnosticsOutput;
} {
  function createRuntimeAuthoringGraphSnapshot(
    input: EngineRuntimeAuthoringGraphSnapshotInput,
  ): EngineRuntimeAuthoringGraphSnapshotOutput {
    if (!input || typeof input.graphId !== "string" || input.graphId.length === 0) {
      throw new Error("ENGINE_AUTHORING_INVALID_GRAPH_SNAPSHOT");
    }
    if (input.role !== "authoring" && input.role !== "runtime") {
      throw new Error("ENGINE_AUTHORING_INVALID_GRAPH_SNAPSHOT");
    }
    const revision = normalizeRevision(input.revision);
    const nodeIds = resolveIds(input.nodes, "node");
    const materialIds = resolveIds(input.materials, "material");
    const signature = resolveSignature({
      graphId: input.graphId,
      nodeIds,
      materialIds,
    });
    const snapshot: EngineRuntimeAuthoringGraphSnapshotOutput = {
      snapshotId: `graph-snapshot:${input.role}:${revision}:${signature}`,
      graphId: input.graphId,
      role: input.role,
      revision,
      nodeCount: nodeIds.length,
      materialCount: materialIds.length,
      nodeIds,
      materialIds,
      signature,
    };
    deps.runtimeAuthoringSnapshots.set(snapshot.snapshotId, snapshot);
    deps.emitEvent("engine.runtime.authoring.graphSnapshotCreated", {
      snapshotId: snapshot.snapshotId,
      graphId: snapshot.graphId,
      role: snapshot.role,
      nodeCount: snapshot.nodeCount,
      materialCount: snapshot.materialCount,
    });
    return snapshot;
  }

  function resolveSnapshot(
    input: EngineRuntimeAuthoringGraphSnapshotInput | string,
  ): EngineRuntimeAuthoringGraphSnapshotOutput {
    if (typeof input === "string") {
      const snapshot = deps.runtimeAuthoringSnapshots.get(input);
      if (!snapshot) {
        throw new Error("ENGINE_AUTHORING_GRAPH_SNAPSHOT_NOT_FOUND");
      }
      return snapshot;
    }
    return createRuntimeAuthoringGraphSnapshot(input);
  }

  function compareRuntimeAuthoringGraphSnapshots(
    input: EngineRuntimeAuthoringGraphCompareInput,
  ): EngineRuntimeAuthoringGraphComparisonOutput {
    const authoring = resolveSnapshot(input.authoring);
    const runtime = resolveSnapshot(input.runtime);
    const comparison: EngineRuntimeAuthoringGraphComparisonOutput = {
      comparisonId: `graph-comparison:${authoring.snapshotId}->${runtime.snapshotId}`,
      matching: authoring.signature === runtime.signature,
      authoring,
      runtime,
      addedNodeIds: resolveSetDifference(runtime.nodeIds, authoring.nodeIds),
      removedNodeIds: resolveSetDifference(authoring.nodeIds, runtime.nodeIds),
      sharedNodeIds: resolveSetIntersection(authoring.nodeIds, runtime.nodeIds),
      addedMaterialIds: resolveSetDifference(runtime.materialIds, authoring.materialIds),
      removedMaterialIds: resolveSetDifference(authoring.materialIds, runtime.materialIds),
      revisionDelta: runtime.revision - authoring.revision,
    };
    deps.setLastRuntimeAuthoringComparison(comparison);
    deps.emitEvent("engine.runtime.authoring.graphSnapshotsCompared", {
      comparisonId: comparison.comparisonId,
      matching: comparison.matching,
      addedNodeCount: comparison.addedNodeIds.length,
      removedNodeCount: comparison.removedNodeIds.length,
    });
    return comparison;
  }

  function createRuntimeAuthoringPreviewToken(
    input: EngineRuntimeAuthoringPreviewTokenInput,
  ): EngineRuntimeAuthoringPreviewTokenOutput {
    if (!input || typeof input.scope !== "string" || input.scope.length === 0) {
      throw new Error("ENGINE_AUTHORING_INVALID_PREVIEW_TOKEN");
    }
    const snapshot = resolveSnapshot(input.snapshot);
    const stepIndex = normalizeRevision(input.stepIndex);
    const nextCounter = deps.getRuntimeAuthoringPreviewTokenCounter() + 1;
    deps.setRuntimeAuthoringPreviewTokenCounter(nextCounter);
    return {
      token: `authoring-preview:${input.scope}:${snapshot.snapshotId}:${stepIndex}:${nextCounter}`,
      snapshotId: snapshot.snapshotId,
      stepIndex,
      signature: snapshot.signature,
    };
  }

  function resolveRuntimeAuthoringDiagnostics(): EngineRuntimeAuthoringDiagnosticsOutput {
    const lastComparison = deps.getLastRuntimeAuthoringComparison();
    return {
      snapshotCount: deps.runtimeAuthoringSnapshots.size,
      lastComparisonId: lastComparison?.comparisonId ?? null,
      lastComparisonMatching: lastComparison?.matching ?? null,
      previewTokenCount: deps.getRuntimeAuthoringPreviewTokenCounter(),
    };
  }

  return {
    createRuntimeAuthoringGraphSnapshot,
    compareRuntimeAuthoringGraphSnapshots,
    createRuntimeAuthoringPreviewToken,
    resolveRuntimeAuthoringDiagnostics,
  };
}
