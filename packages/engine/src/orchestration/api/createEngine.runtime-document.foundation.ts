import type {
  EngineRuntimeDocumentApplyChangeSetInput,
  EngineRuntimeDocumentApplyChangeSetResult,
  EngineRuntimeDocumentCreateSnapshotInput,
  EngineRuntimeDocumentDeserializeSnapshotInput,
  EngineRuntimeDocumentDiffSnapshotsInput,
  EngineRuntimeDocumentDiffSnapshotsOutput,
  EngineRuntimeDocumentPreflightApplyChangeSetInput,
  EngineRuntimeDocumentPreflightApplyChangeSetOutput,
  EngineRuntimeDocumentRebaseChangeSetInput,
  EngineRuntimeDocumentSerializeSnapshotInput,
  EngineRuntimeDocumentSerializeSnapshotOutput,
  EngineRuntimeDocumentValidateSnapshotInput,
  EngineRuntimeDocumentValidateSnapshotOutput,
} from "./public-types";
import type {
  EngineDocumentChangeSet,
  EngineDocumentSnapshot,
} from "../../kernel/document/document-contracts";
import {
  validateDecodedFramePayloadDescriptor,
  validateDecodedFrameTimelineAlignment,
  validateDocumentLinearizedDeltaEnvelope,
} from "../../kernel/document/document-store";
import {
  ENGINE_RUNTIME_DOCUMENT_WARNING_CODE,
  type EngineRuntimeDocumentWarningCode,
} from "../../kernel/document/document-warning-codes";

/**
 * Defines dependencies required by the runtime document domain helpers.
 */
export type RuntimeDocumentFoundationDeps = {
  /** Reads current runtime document snapshot. */
  getDocumentSnapshot: () => EngineDocumentSnapshot;
  /** Applies change-set into document/compiler/runtime snapshots. */
  applyDocumentAndCompile: (changeSet: EngineDocumentChangeSet) => void;
  /** Runtime document schema version marker. */
  schemaVersion: number;
  /** Emits one diagnostics warning payload for non-fatal contract violations. */
  reportRuntimeContractWarning: (warning: {
    /** Machine-readable warning code token. */
    code: EngineRuntimeDocumentWarningCode;
    /** Human-readable warning message. */
    message: string;
    /** Optional warning details payload. */
    details?: Readonly<Record<string, unknown>>;
  }) => void;
};

/**
 * Assembles runtime document helper functions (revision, apply, snapshot lifecycle).
 * @param deps Shared document state and module delegates from createEngine closure.
 */
export function createRuntimeDocumentFoundation(deps: RuntimeDocumentFoundationDeps): {
  resolveRuntimeDocumentRevision: () => number;
  resolveRuntimeDocumentSchemaVersion: () => number;
  applyRuntimeDocumentChangeSet: (
    input: EngineRuntimeDocumentApplyChangeSetInput,
  ) => EngineRuntimeDocumentApplyChangeSetResult;
  preflightRuntimeDocumentChangeSetApply: (
    input: EngineRuntimeDocumentPreflightApplyChangeSetInput,
  ) => EngineRuntimeDocumentPreflightApplyChangeSetOutput;
  createRuntimeDocumentSnapshot: (
    input: EngineRuntimeDocumentCreateSnapshotInput,
  ) => EngineDocumentSnapshot;
  validateRuntimeDocumentSnapshot: (
    input: EngineRuntimeDocumentValidateSnapshotInput,
  ) => EngineRuntimeDocumentValidateSnapshotOutput;
  diffRuntimeDocumentSnapshots: (
    input: EngineRuntimeDocumentDiffSnapshotsInput,
  ) => EngineRuntimeDocumentDiffSnapshotsOutput;
  rebaseRuntimeDocumentChangeSet: (
    input: EngineRuntimeDocumentRebaseChangeSetInput,
  ) => EngineDocumentChangeSet;
  serializeRuntimeDocumentSnapshot: (
    input: EngineRuntimeDocumentSerializeSnapshotInput,
  ) => EngineRuntimeDocumentSerializeSnapshotOutput;
  deserializeRuntimeDocumentSnapshot: (
    input: EngineRuntimeDocumentDeserializeSnapshotInput,
  ) => EngineDocumentSnapshot;
} {
  /**
   * Returns current runtime document revision.
   */
  function resolveRuntimeDocumentRevision(): number {
    return deps.getDocumentSnapshot().revision;
  }

  /**
   * Returns current runtime document schema version.
   */
  function resolveRuntimeDocumentSchemaVersion(): number {
    return deps.schemaVersion;
  }

  /**
   * Preflights one runtime document change-set before commit.
   * @param input Runtime document preflight request.
   */
  function preflightRuntimeDocumentChangeSetApply(
    input: EngineRuntimeDocumentPreflightApplyChangeSetInput,
  ): EngineRuntimeDocumentPreflightApplyChangeSetOutput {
    const issues: string[] = [];
    const warningCodes = new Set<EngineRuntimeDocumentWarningCode>();

    if (!input || !input.changeSet || !Array.isArray(input.changeSet.operations)) {
      issues.push("Runtime document preflight rejected malformed change-set payload.");
      warningCodes.add(ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.CHANGESET_INVALID);
      return {
        valid: false,
        issues,
        warningCodes: [...warningCodes],
        predictedNextRevision: null,
      };
    }

    const activeRevision = deps.getDocumentSnapshot().revision;

    if (input.linearizedEnvelope) {
      const envelopeValidation = validateDocumentLinearizedDeltaEnvelope(
        input.linearizedEnvelope,
        typeof input.baseRevision === "number" ? input.baseRevision : activeRevision,
      );
      if (!envelopeValidation.valid) {
        issues.push(...envelopeValidation.issues);
        warningCodes.add(ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.LINEARIZED_ENVELOPE_INVALID);
      }
      if (input.linearizedEnvelope.changeSet.id !== input.changeSet.id) {
        issues.push("Runtime document preflight detected mismatched change-set and envelope ids.");
        warningCodes.add(ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.LINEARIZED_CHANGESET_MISMATCH);
      }
    }

    if (input.decodedFramePayload) {
      const decodedFrameValidation = validateDecodedFramePayloadDescriptor(input.decodedFramePayload);
      if (!decodedFrameValidation.valid) {
        issues.push(...decodedFrameValidation.issues);
        warningCodes.add(ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.DECODED_FRAME_INVALID);
      }
      const timelineValidation = validateDecodedFrameTimelineAlignment(
        input.decodedFramePayload,
        input.decodedFrameTimelineAlignment,
      );
      if (!timelineValidation.valid) {
        issues.push(...timelineValidation.issues);
        warningCodes.add(ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.TIMELINE_ALIGNMENT_INVALID);
      }
    }

    if (typeof input.baseRevision === "number" && input.baseRevision !== activeRevision) {
      issues.push("Runtime document preflight detected base revision mismatch.");
      warningCodes.add(ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.REVISION_CONFLICT);
    }
    if (typeof input.schemaVersion === "number" && input.schemaVersion !== deps.schemaVersion) {
      issues.push("Runtime document preflight detected schema version mismatch.");
      warningCodes.add(ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.SCHEMA_MISMATCH);
    }

    const valid = issues.length === 0;
    return {
      valid,
      issues,
      warningCodes: [...warningCodes],
      predictedNextRevision: valid
        ? Math.max(activeRevision + 1, input.changeSet.targetRevision ?? activeRevision + 1)
        : null,
    };
  }

  /**
   * Applies one runtime document change-set with revision/schema guard checks.
   * @param input Runtime document apply request.
   */
  function applyRuntimeDocumentChangeSet(
    input: EngineRuntimeDocumentApplyChangeSetInput,
  ): EngineRuntimeDocumentApplyChangeSetResult {
    if (!input || !input.changeSet || !Array.isArray(input.changeSet.operations)) {
      deps.reportRuntimeContractWarning({
        code: ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.CHANGESET_INVALID,
        message: "Runtime document apply rejected malformed change-set payload.",
      });
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }

    const activeRevision = deps.getDocumentSnapshot().revision;

    // Validate optional adapter-linearized payload contract before document mutation.
    if (input.linearizedEnvelope) {
      const envelopeValidation = validateDocumentLinearizedDeltaEnvelope(
        input.linearizedEnvelope,
        typeof input.baseRevision === "number" ? input.baseRevision : activeRevision,
      );
      if (!envelopeValidation.valid) {
        deps.reportRuntimeContractWarning({
          code: ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.LINEARIZED_ENVELOPE_INVALID,
          message: "Runtime document apply rejected invalid adapter-linearized envelope.",
          details: {
            issueCount: envelopeValidation.issues.length,
            issues: envelopeValidation.issues,
            envelopeId: input.linearizedEnvelope.id,
            sourceAdapter: input.linearizedEnvelope.sourceAdapter,
          },
        });
        throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
      }
      if (input.linearizedEnvelope.changeSet.id !== input.changeSet.id) {
        deps.reportRuntimeContractWarning({
          code: ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.LINEARIZED_CHANGESET_MISMATCH,
          message: "Runtime document apply rejected mismatched change-set and linearized envelope ids.",
          details: {
            envelopeChangeSetId: input.linearizedEnvelope.changeSet.id,
            changeSetId: input.changeSet.id,
          },
        });
        throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
      }
    }

    // Validate optional decoded-frame payload contract before timeline-bound mutation.
    if (input.decodedFramePayload) {
      const decodedFrameValidation = validateDecodedFramePayloadDescriptor(input.decodedFramePayload);
      if (!decodedFrameValidation.valid) {
        deps.reportRuntimeContractWarning({
          code: ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.DECODED_FRAME_INVALID,
          message: "Runtime document apply rejected invalid decoded-frame payload.",
          details: {
            issueCount: decodedFrameValidation.issues.length,
            issues: decodedFrameValidation.issues,
            frameId: input.decodedFramePayload.id,
            sourceAdapter: input.decodedFramePayload.sourceAdapter,
          },
        });
        throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
      }

      const timelineValidation = validateDecodedFrameTimelineAlignment(
        input.decodedFramePayload,
        input.decodedFrameTimelineAlignment,
      );
      if (!timelineValidation.valid) {
        deps.reportRuntimeContractWarning({
          code: ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.TIMELINE_ALIGNMENT_INVALID,
          message: "Runtime document apply rejected decoded-frame payload with invalid timeline alignment.",
          details: {
            issueCount: timelineValidation.issues.length,
            issues: timelineValidation.issues,
            absoluteDriftMs: timelineValidation.absoluteDriftMs,
            frameId: input.decodedFramePayload.id,
          },
        });
        throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
      }
    }

    if (typeof input.baseRevision === "number" && input.baseRevision !== activeRevision) {
      deps.reportRuntimeContractWarning({
        code: ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.REVISION_CONFLICT,
        message: "Runtime document apply rejected base revision mismatch.",
        details: {
          expectedBaseRevision: activeRevision,
          providedBaseRevision: input.baseRevision,
        },
      });
      throw new Error("ENGINE_DOCUMENT_REVISION_CONFLICT");
    }
    if (typeof input.schemaVersion === "number" && input.schemaVersion !== deps.schemaVersion) {
      deps.reportRuntimeContractWarning({
        code: ENGINE_RUNTIME_DOCUMENT_WARNING_CODE.SCHEMA_MISMATCH,
        message: "Runtime document apply rejected schema version mismatch.",
        details: {
          expectedSchemaVersion: deps.schemaVersion,
          providedSchemaVersion: input.schemaVersion,
        },
      });
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    deps.applyDocumentAndCompile(input.changeSet);
    return {
      nextRevision: deps.getDocumentSnapshot().revision,
      appliedOps: input.changeSet.operations.length,
      warnings: [],
    };
  }

  /**
   * Creates one runtime document snapshot from explicit revision and node table payload.
   * @param input Runtime document create-snapshot request.
   */
  function createRuntimeDocumentSnapshot(
    input: EngineRuntimeDocumentCreateSnapshotInput,
  ): EngineDocumentSnapshot {
    if (!input || !Number.isFinite(input.revision) || typeof input.nodes !== "object" || input.nodes === null) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      revision: Math.max(0, Math.trunc(input.revision)),
      nodes: input.nodes,
    };
  }

  /**
   * Validates one runtime document snapshot shape.
   * @param input Runtime document validate-snapshot request.
   */
  function validateRuntimeDocumentSnapshot(
    input: EngineRuntimeDocumentValidateSnapshotInput,
  ): EngineRuntimeDocumentValidateSnapshotOutput {
    if (!input || !input.snapshot) {
      return {
        valid: false,
        issues: ["ENGINE_DOCUMENT_INVALID_CHANGESET"],
      };
    }
    const issues: string[] = [];
    if (!Number.isFinite(input.snapshot.revision) || input.snapshot.revision < 0) {
      issues.push("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    if (typeof input.snapshot.nodes !== "object" || input.snapshot.nodes === null) {
      issues.push("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Diffs two document snapshots and returns deterministic node-id deltas.
   * @param input Runtime document diff request.
   */
  function diffRuntimeDocumentSnapshots(
    input: EngineRuntimeDocumentDiffSnapshotsInput,
  ): EngineRuntimeDocumentDiffSnapshotsOutput {
    if (!input || !input.base || !input.target) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    const baseNodeIds = new Set(Object.keys(input.base.nodes));
    const targetNodeIds = new Set(Object.keys(input.target.nodes));
    const addedNodeIds = [...targetNodeIds].filter((id) => !baseNodeIds.has(id)).sort();
    const removedNodeIds = [...baseNodeIds].filter((id) => !targetNodeIds.has(id)).sort();
    const updatedNodeIds = [...targetNodeIds]
      .filter((id) => baseNodeIds.has(id))
      .filter((id) => JSON.stringify(input.base.nodes[id]) !== JSON.stringify(input.target.nodes[id]))
      .sort();
    return {
      addedNodeIds,
      removedNodeIds,
      updatedNodeIds,
    };
  }

  /**
   * Rebases one change-set target revision to provided base revision.
   * @param input Runtime document rebase request.
   */
  function rebaseRuntimeDocumentChangeSet(
    input: EngineRuntimeDocumentRebaseChangeSetInput,
  ): EngineDocumentChangeSet {
    if (!input || !input.changeSet || !Number.isFinite(input.baseRevision)) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      ...input.changeSet,
      targetRevision: Math.max(0, Math.trunc(input.baseRevision)) + 1,
    };
  }

  /**
   * Serializes one document snapshot into stable JSON payload string.
   * @param input Runtime document serialize request.
   */
  function serializeRuntimeDocumentSnapshot(
    input: EngineRuntimeDocumentSerializeSnapshotInput,
  ): EngineRuntimeDocumentSerializeSnapshotOutput {
    if (!input || !input.snapshot || typeof input.snapshot.revision !== "number") {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      payload: JSON.stringify(input.snapshot),
    };
  }

  /**
   * Deserializes one snapshot payload and validates minimal snapshot shape.
   * @param input Runtime document deserialize request.
   */
  function deserializeRuntimeDocumentSnapshot(
    input: EngineRuntimeDocumentDeserializeSnapshotInput,
  ): EngineDocumentSnapshot {
    if (!input || typeof input.payload !== "string") {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    const parsed = JSON.parse(input.payload) as Partial<EngineDocumentSnapshot>;
    if (typeof parsed.revision !== "number" || typeof parsed.nodes !== "object" || parsed.nodes === null) {
      throw new Error("ENGINE_DOCUMENT_INVALID_CHANGESET");
    }
    return {
      revision: parsed.revision,
      nodes: parsed.nodes,
    };
  }

  return {
    resolveRuntimeDocumentRevision,
    resolveRuntimeDocumentSchemaVersion,
    applyRuntimeDocumentChangeSet,
    preflightRuntimeDocumentChangeSetApply,
    createRuntimeDocumentSnapshot,
    validateRuntimeDocumentSnapshot,
    diffRuntimeDocumentSnapshots,
    rebaseRuntimeDocumentChangeSet,
    serializeRuntimeDocumentSnapshot,
    deserializeRuntimeDocumentSnapshot,
  };
}
