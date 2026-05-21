import type {
  EngineDocumentChangeSet,
  EngineDocumentNode,
  EngineDocumentSnapshot,
} from "./document-contracts";

/**
 * Creates a normalized immutable document snapshot for deterministic compiler input.
 * @param options Optional initial revision and nodes for the snapshot.
 */
export function createDocumentSnapshot(options?: {
  /** Initial revision used by the snapshot. */
  revision?: number;
  /** Initial node table keyed by node id. */
  nodes?: Readonly<Record<string, EngineDocumentNode>>;
}): EngineDocumentSnapshot {
  const initialRevision = options?.revision ?? 0;
  const initialNodes = options?.nodes ?? {};
  return {
    revision: initialRevision,
    nodes: resolveSortedNodeRecord(initialNodes),
  };
}

/**
 * Applies one ordered change-set and returns the next immutable document snapshot.
 * @param currentSnapshot Current immutable document snapshot.
 * @param changeSet Ordered document mutations to apply.
 */
export function applyDocumentChangeSet(
  currentSnapshot: EngineDocumentSnapshot,
  changeSet: EngineDocumentChangeSet,
): EngineDocumentSnapshot {
  const nextNodes: Record<string, EngineDocumentNode> = {
    ...currentSnapshot.nodes,
  };

  for (const operation of changeSet.operations) {
    if (operation.type === "upsert-node") {
      nextNodes[operation.node.id] = resolveNormalizedNode(operation.node);
      continue;
    }

    // Removing a missing node is intentionally a no-op to keep replay deterministic.
    delete nextNodes[operation.nodeId];
  }

  const nextRevision = Math.max(
    currentSnapshot.revision + 1,
    changeSet.targetRevision ?? currentSnapshot.revision + 1,
  );

  return {
    revision: nextRevision,
    nodes: resolveSortedNodeRecord(nextNodes),
  };
}

/**
 * Clones and normalizes one document node before writing into immutable snapshot state.
 * @param node Source node from caller change-set payload.
 */
function resolveNormalizedNode(node: EngineDocumentNode): EngineDocumentNode {
  return {
    id: node.id,
    kind: node.kind,
    parentId: node.parentId,
    payload: {
      transformRevision: node.payload.transformRevision,
      geometryRevision: node.payload.geometryRevision,
      materialRevision: node.payload.materialRevision,
      textRevision: node.payload.textRevision,
      visibilityRevision: node.payload.visibilityRevision,
      pickingRevision: node.payload.pickingRevision,
      gpuUploadRevision: node.payload.gpuUploadRevision,
    },
  };
}

/**
 * Returns a key-sorted immutable node table so replay order stays deterministic.
 * @param nodes Node table keyed by stable id.
 */
function resolveSortedNodeRecord(
  nodes: Readonly<Record<string, EngineDocumentNode>>,
): Readonly<Record<string, EngineDocumentNode>> {
  const sortedNodeIds = Object.keys(nodes).sort((left, right) => left.localeCompare(right));
  const sortedNodes: Record<string, EngineDocumentNode> = {};
  for (const nodeId of sortedNodeIds) {
    sortedNodes[nodeId] = resolveNormalizedNode(nodes[nodeId]);
  }
  return sortedNodes;
}
