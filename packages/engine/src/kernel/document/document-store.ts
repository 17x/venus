import type {
  EngineDocumentChangeSet,
  EngineDecodedFramePayloadDescriptor,
  EngineDocumentLinearizedDeltaEnvelope,
  EngineDocumentNode,
  EngineDocumentNodeSemantic3D,
  EngineDocumentSnapshot,
} from "./document-contracts";

const DEFAULT_MAX_ALLOWED_DRIFT_MS = 34;

/**
 * Validation output for adapter-linearized delta envelopes consumed by document runtime guards.
 */
export interface EngineDocumentLinearizedDeltaValidationResult {
  /** True when the envelope satisfies minimal deterministic ingestion constraints. */
  valid: boolean;
  /** Deterministic issue list for schema/order/revision mismatches. */
  issues: readonly string[];
}

/**
 * Validation output for decoded frame payload guards consumed by timeline/render ingestion paths.
 */
export interface EngineDecodedFramePayloadValidationResult {
  /** True when decoded-frame payload satisfies minimal ingestion constraints. */
  valid: boolean;
  /** Deterministic issue list for schema/value violations. */
  issues: readonly string[];
}

/**
 * Timeline-alignment options used by decoded-frame monotonic/drift validation.
 */
export interface EngineDecodedFrameTimelineAlignmentOptions {
  /** Optional previous decoded frame timestamp for monotonic-order checks. */
  previousTimestampMs?: number;
  /** Optional expected timeline cursor timestamp for drift checks. */
  expectedTimelineTimestampMs?: number;
  /** Optional maximum allowed absolute drift between frame and expected timeline cursor. */
  maxAllowedDriftMs?: number;
}

/**
 * Validation output for decoded-frame timeline alignment checks.
 */
export interface EngineDecodedFrameTimelineAlignmentValidationResult {
  /** True when timeline alignment and monotonic ordering checks pass. */
  valid: boolean;
  /** Deterministic issue list for monotonic and drift check failures. */
  issues: readonly string[];
  /** Absolute drift in milliseconds when expected timeline timestamp is provided. */
  absoluteDriftMs: number | null;
}

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
 * Validates one adapter-linearized envelope against deterministic ingestion constraints.
 * @param envelope Adapter-submitted linearized envelope candidate.
 * @param expectedBaseRevision Optional expected base revision from runtime/document state.
 */
export function validateDocumentLinearizedDeltaEnvelope(
  envelope: EngineDocumentLinearizedDeltaEnvelope,
  expectedBaseRevision?: number,
): EngineDocumentLinearizedDeltaValidationResult {
  const issues: string[] = [];

  if (!envelope.id) {
    issues.push("envelope.id must be a non-empty string");
  }
  if (!envelope.sourceAdapter) {
    issues.push("envelope.sourceAdapter must be a non-empty string");
  }
  if (!Number.isFinite(envelope.baseRevision) || envelope.baseRevision < 0) {
    issues.push("envelope.baseRevision must be a finite non-negative number");
  }
  if (!Number.isFinite(envelope.targetRevision) || envelope.targetRevision < 0) {
    issues.push("envelope.targetRevision must be a finite non-negative number");
  }
  if (!Number.isInteger(envelope.sequence) || envelope.sequence < 0) {
    issues.push("envelope.sequence must be a non-negative integer");
  }
  if (
    envelope.producedAtMs !== undefined
    && (!Number.isFinite(envelope.producedAtMs) || envelope.producedAtMs < 0)
  ) {
    issues.push("envelope.producedAtMs must be a finite non-negative number when provided");
  }

  // The envelope must describe a forward-only revision move so apply order remains deterministic.
  if (envelope.targetRevision <= envelope.baseRevision) {
    issues.push("envelope.targetRevision must be greater than envelope.baseRevision");
  }

  // When change-set carries targetRevision, it must agree with the envelope revision contract.
  if (
    envelope.changeSet.targetRevision !== undefined
    && envelope.changeSet.targetRevision !== envelope.targetRevision
  ) {
    issues.push("envelope.changeSet.targetRevision must match envelope.targetRevision");
  }

  // Optional runtime guard: reject payloads that were linearized from an unexpected base revision.
  if (expectedBaseRevision !== undefined && envelope.baseRevision !== expectedBaseRevision) {
    issues.push(
      `envelope.baseRevision ${envelope.baseRevision} does not match expectedBaseRevision ${expectedBaseRevision}`,
    );
  }

  if (envelope.changeSet.operations.length === 0) {
    issues.push("envelope.changeSet.operations must contain at least one operation");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validates one adapter-submitted decoded frame descriptor before timeline/render ingestion.
 * @param payload Adapter-submitted decoded frame descriptor candidate.
 */
export function validateDecodedFramePayloadDescriptor(
  payload: EngineDecodedFramePayloadDescriptor,
): EngineDecodedFramePayloadValidationResult {
  const issues: string[] = [];

  if (!payload.id) {
    issues.push("payload.id must be a non-empty string");
  }
  if (!payload.sourceAdapter) {
    issues.push("payload.sourceAdapter must be a non-empty string");
  }
  if (!payload.trackId) {
    issues.push("payload.trackId must be a non-empty string");
  }
  if (!payload.clipId) {
    issues.push("payload.clipId must be a non-empty string");
  }
  if (!Number.isFinite(payload.timestampMs) || payload.timestampMs < 0) {
    issues.push("payload.timestampMs must be a finite non-negative number");
  }
  if (!Number.isFinite(payload.durationMs) || payload.durationMs <= 0) {
    issues.push("payload.durationMs must be a finite positive number");
  }
  if (!Number.isInteger(payload.width) || payload.width <= 0) {
    issues.push("payload.width must be a positive integer");
  }
  if (!Number.isInteger(payload.height) || payload.height <= 0) {
    issues.push("payload.height must be a positive integer");
  }
  if (!Number.isInteger(payload.byteLength) || payload.byteLength <= 0) {
    issues.push("payload.byteLength must be a positive integer");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validates decoded-frame timestamp monotonicity and alignment against timeline cursor expectations.
 * @param payload Adapter-submitted decoded frame descriptor candidate.
 * @param options Optional monotonic and drift validation parameters.
 */
export function validateDecodedFrameTimelineAlignment(
  payload: EngineDecodedFramePayloadDescriptor,
  options?: EngineDecodedFrameTimelineAlignmentOptions,
): EngineDecodedFrameTimelineAlignmentValidationResult {
  const issues: string[] = [];
  let absoluteDriftMs: number | null = null;

  if (options?.previousTimestampMs !== undefined) {
    if (!Number.isFinite(options.previousTimestampMs) || options.previousTimestampMs < 0) {
      issues.push("options.previousTimestampMs must be a finite non-negative number when provided");
    } else if (payload.timestampMs < options.previousTimestampMs) {
      issues.push(
        `payload.timestampMs ${payload.timestampMs} is lower than previousTimestampMs ${options.previousTimestampMs}`,
      );
    }
  }

  if (options?.expectedTimelineTimestampMs !== undefined) {
    if (
      !Number.isFinite(options.expectedTimelineTimestampMs)
      || options.expectedTimelineTimestampMs < 0
    ) {
      issues.push(
        "options.expectedTimelineTimestampMs must be a finite non-negative number when provided",
      );
    } else {
      absoluteDriftMs = Math.abs(payload.timestampMs - options.expectedTimelineTimestampMs);
        const maxAllowedDriftMs = options.maxAllowedDriftMs ?? DEFAULT_MAX_ALLOWED_DRIFT_MS;
      if (!Number.isFinite(maxAllowedDriftMs) || maxAllowedDriftMs < 0) {
        issues.push("options.maxAllowedDriftMs must be a finite non-negative number when provided");
      } else if (absoluteDriftMs > maxAllowedDriftMs) {
        issues.push(
          `payload timestamp drift ${absoluteDriftMs}ms exceeds maxAllowedDriftMs ${maxAllowedDriftMs}ms`,
        );
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    absoluteDriftMs,
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
    semantic3d: resolveNormalizedSemantic3D(node.semantic3d),
  };
}

/**
 * Clones and normalizes optional node 3D semantics for immutable snapshot safety.
 * @param semantic3d Optional 3D semantic payload from caller graph/document adapters.
 */
function resolveNormalizedSemantic3D(
  semantic3d: EngineDocumentNodeSemantic3D | undefined,
): EngineDocumentNodeSemantic3D | undefined {
  if (!semantic3d) {
    return undefined;
  }

  return {
    bounds: {
      x: semantic3d.bounds.x,
      y: semantic3d.bounds.y,
      z: semantic3d.bounds.z,
      width: semantic3d.bounds.width,
      height: semantic3d.bounds.height,
      depth: semantic3d.bounds.depth,
    },
    transform: {
      x: semantic3d.transform.x,
      y: semantic3d.transform.y,
      z: semantic3d.transform.z,
      rotationX: semantic3d.transform.rotationX,
      rotationY: semantic3d.transform.rotationY,
      rotationZ: semantic3d.transform.rotationZ,
      scaleX: semantic3d.transform.scaleX,
      scaleY: semantic3d.transform.scaleY,
      scaleZ: semantic3d.transform.scaleZ,
    },
    sourceType: semantic3d.sourceType,
    renderOrder: semantic3d.renderOrder,
    visible: semantic3d.visible,
    lightingMode: semantic3d.lightingMode,
    materialId: semantic3d.materialId,
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
