import type {
  EngineDocumentChangeSet,
  EngineDocumentNode,
  EngineDocumentSnapshot,
} from "../document/document-contracts";

/**
 * Invalidation categories emitted by staged incremental compiler.
 */
export interface EngineCompilerInvalidationSummary {
  /** True when transform-related runtime state must be refreshed. */
  transform: boolean;
  /** True when geometry-related runtime state must be refreshed. */
  geometry: boolean;
  /** True when material-related runtime state must be refreshed. */
  material: boolean;
  /** True when text-related runtime state must be refreshed. */
  text: boolean;
  /** True when visibility-related runtime state must be refreshed. */
  visibility: boolean;
  /** True when picking-related runtime state must be refreshed. */
  picking: boolean;
  /** True when GPU upload-related runtime state must be refreshed. */
  gpuUpload: boolean;
}

/**
 * Deterministic compiler output for one applied document change-set.
 */
export interface EngineIncrementalCompileOutput {
  /** Applied change-set id. */
  changeSetId: string;
  /** Previous document revision consumed by compiler. */
  previousRevision: number;
  /** Next document revision produced after change-set application. */
  currentRevision: number;
  /** Changed node ids in deterministic sorted order. */
  changedNodeIds: readonly string[];
  /** Invalidation categories for downstream runtime systems. */
  invalidation: EngineCompilerInvalidationSummary;
}

const EMPTY_INVALIDATION: EngineCompilerInvalidationSummary = {
  transform: false,
  geometry: false,
  material: false,
  text: false,
  visibility: false,
  picking: false,
  gpuUpload: false,
};

/**
 * Compiles one document change-set into runtime invalidation categories.
 * @param options Previous/current snapshots and the applied change-set.
 */
export function compileDocumentChangeSet(options: {
  /** Snapshot before change-set application. */
  previousSnapshot: EngineDocumentSnapshot;
  /** Snapshot after change-set application. */
  currentSnapshot: EngineDocumentSnapshot;
  /** Applied deterministic change-set. */
  changeSet: EngineDocumentChangeSet;
}): EngineIncrementalCompileOutput {
  const changedNodeIds = resolveChangedNodeIds(options.changeSet);
  const invalidation = resolveInvalidationSummary(
    options.previousSnapshot,
    options.currentSnapshot,
    options.changeSet,
  );

  return {
    changeSetId: options.changeSet.id,
    previousRevision: options.previousSnapshot.revision,
    currentRevision: options.currentSnapshot.revision,
    changedNodeIds,
    invalidation,
  };
}

/**
 * Resolves one deterministic invalidation summary from a change-set.
 * @param previousSnapshot Snapshot before applying the change-set.
 * @param currentSnapshot Snapshot after applying the change-set.
 * @param changeSet Applied change-set.
 */
function resolveInvalidationSummary(
  previousSnapshot: EngineDocumentSnapshot,
  currentSnapshot: EngineDocumentSnapshot,
  changeSet: EngineDocumentChangeSet,
): EngineCompilerInvalidationSummary {
  const invalidation: EngineCompilerInvalidationSummary = {
    ...EMPTY_INVALIDATION,
  };

  for (const operation of changeSet.operations) {
    if (operation.type === "remove-node") {
      // Removals can affect every downstream lane because parent visibility,
      // picking, and GPU resources may be released in one transaction.
      invalidation.transform = true;
      invalidation.geometry = true;
      invalidation.material = true;
      invalidation.text = true;
      invalidation.visibility = true;
      invalidation.picking = true;
      invalidation.gpuUpload = true;
      continue;
    }

    const previousNode = previousSnapshot.nodes[operation.node.id];
    const currentNode = currentSnapshot.nodes[operation.node.id];
    if (!currentNode) {
      continue;
    }

    applyNodeInvalidation(invalidation, previousNode, currentNode);
  }

  return invalidation;
}

/**
 * Applies node-level invalidation transitions into aggregate summary.
 * @param invalidation Mutable invalidation summary.
 * @param previousNode Previous node state if it existed.
 * @param currentNode Current node state after upsert.
 */
function applyNodeInvalidation(
  invalidation: EngineCompilerInvalidationSummary,
  previousNode: EngineDocumentNode | undefined,
  currentNode: EngineDocumentNode,
): void {
  // New nodes are treated as full-lane invalidations to keep bootstrap behavior safe.
  if (!previousNode) {
    invalidation.transform = true;
    invalidation.geometry = true;
    invalidation.material = true;
    invalidation.text = true;
    invalidation.visibility = true;
    invalidation.picking = true;
    invalidation.gpuUpload = true;
    return;
  }

  if (previousNode.payload.transformRevision !== currentNode.payload.transformRevision) {
    invalidation.transform = true;
  }
  if (previousNode.payload.geometryRevision !== currentNode.payload.geometryRevision) {
    invalidation.geometry = true;
  }
  if (previousNode.payload.materialRevision !== currentNode.payload.materialRevision) {
    invalidation.material = true;
  }
  if (previousNode.payload.textRevision !== currentNode.payload.textRevision) {
    invalidation.text = true;
  }
  if (previousNode.payload.visibilityRevision !== currentNode.payload.visibilityRevision) {
    invalidation.visibility = true;
  }
  if (previousNode.payload.pickingRevision !== currentNode.payload.pickingRevision) {
    invalidation.picking = true;
  }
  if (previousNode.payload.gpuUploadRevision !== currentNode.payload.gpuUploadRevision) {
    invalidation.gpuUpload = true;
  }
}

/**
 * Resolves sorted changed node ids from one change-set.
 * @param changeSet Applied deterministic change-set.
 */
function resolveChangedNodeIds(changeSet: EngineDocumentChangeSet): readonly string[] {
  const changedNodeIdSet = new Set<string>();
  for (const operation of changeSet.operations) {
    if (operation.type === "upsert-node") {
      changedNodeIdSet.add(operation.node.id);
      continue;
    }
    changedNodeIdSet.add(operation.nodeId);
  }
  return Array.from(changedNodeIdSet).sort((left, right) => left.localeCompare(right));
}
