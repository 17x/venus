import type {
  EngineRuntimeBackendListAvailableOutput,
  EngineRuntimeCommand,
  EngineRuntimeCommandCreateEncoderInput,
  EngineRuntimeCommandCreateEncoderOutput,
  EngineRuntimeCommandEncodeInput,
  EngineRuntimeCommandEncodeOutput,
  EngineRuntimeCommandInspectOutput,
  EngineRuntimeCommandOptimizeInput,
  EngineRuntimeCommandOptimizeOutput,
  EngineRuntimeCommandReplayOutput,
  EngineRuntimeCommandValidateInput,
  EngineRuntimeCommandValidateOutput,
  EngineRuntimeDirtyFlushInput,
  EngineRuntimeDirtyFlushOutput,
  EngineRuntimeDirtyMarkBatchInput,
  EngineRuntimeDirtyMarkInput,
  EngineRuntimeDirtyResetOutput,
  EngineRuntimeDirtyStateOutput,
  EngineRuntimeDocumentApplyChangeSetInput,
  EngineRuntimeDocumentApplyChangeSetResult,
  EngineRuntimeDocumentPreflightApplyChangeSetInput,
  EngineRuntimeDocumentPreflightApplyChangeSetOutput,
  EngineRuntimeDocumentCreateSnapshotInput,
  EngineRuntimeDocumentDeserializeSnapshotInput,
  EngineRuntimeDocumentDiffSnapshotsInput,
  EngineRuntimeDocumentDiffSnapshotsOutput,
  EngineRuntimeDocumentRebaseChangeSetInput,
  EngineRuntimeDocumentSerializeSnapshotInput,
  EngineRuntimeDocumentSerializeSnapshotOutput,
  EngineRuntimeDocumentValidateSnapshotInput,
  EngineRuntimeDocumentValidateSnapshotOutput,
  EngineRuntimeWorldClearOutput,
  EngineRuntimeWorldCompileFromDocumentInput,
  EngineRuntimeWorldEntity,
  EngineRuntimeWorldGraphStatsOutput,
  EngineRuntimeWorldQueryComponentInput,
  EngineRuntimeWorldQueryComponentOutput,
  EngineRuntimeWorldQueryEntityInput,
  EngineRuntimeWorldQueryEntityOutput,
  EngineRuntimeWorldSnapshotOutput,
} from "./public-types";
import type { EngineDocumentChangeSet, EngineDocumentSnapshot } from "../../kernel/document/document-contracts";
import type { EngineDirtyDomain } from "../../kernel/dirty/dirtyPropagation/dirtyPropagation.contract";
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
 * Defines minimal dirty-state shape required by runtime dirty helpers.
 */
type RuntimeDirtyStateLike = {
  /** Pending dirty domain tokens tracked for incremental compile. */
  dirtyDomains: readonly EngineDirtyDomain[];
};

/**
 * Defines dependencies required by runtime document/dirty/command helper assembly.
 */
type RuntimeDocumentDirtyCommandDependencies = {
  /** Reads current runtime document snapshot. */
  getDocumentSnapshot: () => EngineDocumentSnapshot;
  /** Applies change-set into document/compiler/runtime snapshots. */
  applyDocumentAndCompile: (changeSet: EngineDocumentChangeSet) => void;
  /** Runtime document schema version marker. */
  schemaVersion: number;
  /** Builds runtime world from document snapshot. */
  buildRuntimeWorldFromDocument: (snapshot: EngineDocumentSnapshot) => {
    revision: number;
    entities: ReadonlyArray<EngineRuntimeWorldEntity & {
      bounds3d?: { x: number; y: number; z: number; width: number; height: number; depth: number };
      transform3d?: {
        x: number; y: number; z: number; rotationX: number; rotationY: number; rotationZ: number; scaleX: number; scaleY: number; scaleZ: number;
      };
      sourceType?: string;
      renderOrder?: number;
      visible?: boolean;
      lightingMode?: "inherit" | "unlit" | "lit";
      materialId?: string;
    }>;
  };
  /** Reads current runtime-world snapshot override. */
  getRuntimeWorldSnapshotOverride: () => EngineRuntimeWorldSnapshotOutput | null;
  /** Updates runtime-world snapshot override. */
  setRuntimeWorldSnapshotOverride: (snapshot: EngineRuntimeWorldSnapshotOutput | null) => void;
  /** Reads latest dirty-state record. */
  getLatestDirtyState: () => RuntimeDirtyStateLike;
  /** Writes latest dirty-state record. */
  setLatestDirtyState: (state: RuntimeDirtyStateLike) => void;
  /** Marks one dirty domain. */
  markDirty: (state: RuntimeDirtyStateLike, domain: EngineDirtyDomain) => RuntimeDirtyStateLike;
  /** Marks multiple dirty domains. */
  markDirtyBatch: (state: RuntimeDirtyStateLike, domains: readonly EngineDirtyDomain[]) => RuntimeDirtyStateLike;
  /** Flushes dirty domains. */
  flushDirty: (state: RuntimeDirtyStateLike, domains: readonly EngineDirtyDomain[]) => RuntimeDirtyStateLike;
  /** Creates empty dirty-state record. */
  createEmptyDirtyState: () => RuntimeDirtyStateLike;
  /** Reads last dirty-mark timestamp. */
  getLastRuntimeDirtyMarkedAt: () => number;
  /** Updates last dirty-mark timestamp. */
  setLastRuntimeDirtyMarkedAt: (timestampMs: number) => void;
  /** Resolves monotonic timestamp in milliseconds. */
  resolveNow: () => number;
  /** Encodes runtime command list. */
  encodeCommands: (commands: readonly EngineRuntimeCommand[]) => { commands: readonly EngineRuntimeCommand[] };
  /** Reads latest compile change-set id for deterministic buffer id output. */
  getLatestCompileChangeSetId: () => string;
  /** Allocates deterministic runtime command encoder id. */
  allocateRuntimeCommandEncoderId: (profile: string) => string;
  /** Replays runtime command list. */
  replayCommands: (commands: readonly EngineRuntimeCommand[]) => { replayedCount: number };
  /** Resolves backend probe modes in selector order. */
  getBackendProbeModes: () => readonly ("auto" | "webgpu" | "webgl" | "canvas2d" | "headless")[];
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
 * Assembles runtime document/dirty/command/backends-list helper functions.
 * @param deps Shared mutable state and module delegates from createEngine closure.
 */
export function createRuntimeDocumentDirtyCommandFoundation(
  deps: RuntimeDocumentDirtyCommandDependencies,
): {
  resolveRuntimeDocumentRevision: () => number;
  resolveRuntimeDocumentSchemaVersion: () => number;
  applyRuntimeDocumentChangeSet: (input: EngineRuntimeDocumentApplyChangeSetInput) => EngineRuntimeDocumentApplyChangeSetResult;
  preflightRuntimeDocumentChangeSetApply: (
    input: EngineRuntimeDocumentPreflightApplyChangeSetInput,
  ) => EngineRuntimeDocumentPreflightApplyChangeSetOutput;
  createRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentCreateSnapshotInput) => EngineDocumentSnapshot;
  validateRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentValidateSnapshotInput) => EngineRuntimeDocumentValidateSnapshotOutput;
  diffRuntimeDocumentSnapshots: (input: EngineRuntimeDocumentDiffSnapshotsInput) => EngineRuntimeDocumentDiffSnapshotsOutput;
  rebaseRuntimeDocumentChangeSet: (input: EngineRuntimeDocumentRebaseChangeSetInput) => EngineDocumentChangeSet;
  serializeRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentSerializeSnapshotInput) => EngineRuntimeDocumentSerializeSnapshotOutput;
  deserializeRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentDeserializeSnapshotInput) => EngineDocumentSnapshot;
  resolveRuntimeWorldSnapshotOutput: () => EngineRuntimeWorldSnapshotOutput;
  compileRuntimeWorldFromDocument: (input: EngineRuntimeWorldCompileFromDocumentInput) => EngineRuntimeWorldSnapshotOutput;
  queryRuntimeWorldEntity: (input: EngineRuntimeWorldQueryEntityInput) => EngineRuntimeWorldQueryEntityOutput;
  queryRuntimeWorldComponent: (input: EngineRuntimeWorldQueryComponentInput) => EngineRuntimeWorldQueryComponentOutput;
  clearRuntimeWorldSnapshot: (_unused?: void) => EngineRuntimeWorldClearOutput;
  resolveRuntimeWorldGraphStatsOutput: () => EngineRuntimeWorldGraphStatsOutput;
  resolveRuntimeDirtyStateOutput: () => EngineRuntimeDirtyStateOutput;
  markRuntimeDirtyDomain: (input: EngineRuntimeDirtyMarkInput) => EngineRuntimeDirtyStateOutput;
  markRuntimeDirtyDomainsBatch: (input: EngineRuntimeDirtyMarkBatchInput) => EngineRuntimeDirtyStateOutput;
  resolveRuntimePendingDirtyDomains: () => readonly EngineRuntimeDirtyMarkInput["domain"][];
  flushRuntimeDirtyDomains: (input: EngineRuntimeDirtyFlushInput) => EngineRuntimeDirtyFlushOutput;
  resetRuntimeDirtyState: () => EngineRuntimeDirtyResetOutput;
  encodeRuntimeCommandPlan: (plan: EngineRuntimeCommandEncodeInput) => EngineRuntimeCommandEncodeOutput;
  createRuntimeCommandEncoder: (input: EngineRuntimeCommandCreateEncoderInput) => EngineRuntimeCommandCreateEncoderOutput;
  validateRuntimeCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandValidateOutput;
  optimizeRuntimeCommandBuffer: (input: EngineRuntimeCommandOptimizeInput) => EngineRuntimeCommandOptimizeOutput;
  inspectRuntimeCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandInspectOutput;
  replayRuntimeCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandReplayOutput;
  resolveRuntimeBackendListAvailableOutput: () => EngineRuntimeBackendListAvailableOutput;
} {
  /**
   * Returns current runtime document revision.
   */
  function resolveRuntimeDocumentRevision(): number {
    return deps.getDocumentSnapshot().revision;
  }

  /**
   * Returns runtime document schema version marker.
   */
  function resolveRuntimeDocumentSchemaVersion(): number {
    return deps.schemaVersion;
  }

  /**
   * Preflights one runtime document change-set payload without mutating runtime state.
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

  /**
   * Returns current runtime world snapshot output.
   */
  function resolveRuntimeWorldSnapshotOutput(): EngineRuntimeWorldSnapshotOutput {
    const override = deps.getRuntimeWorldSnapshotOverride();
    if (override) {
      return {
        worldRevision: override.worldRevision,
        entities: [...override.entities],
      };
    }
    const runtimeWorld = deps.buildRuntimeWorldFromDocument(deps.getDocumentSnapshot());
    return {
      worldRevision: runtimeWorld.revision,
      entities: runtimeWorld.entities.map((entity) => resolveRuntimeWorldEntityOutput(entity)),
    };
  }

  /**
   * Compiles one runtime-world snapshot from explicit document snapshot input.
   * @param input Runtime world compile-from-document request.
   */
  function compileRuntimeWorldFromDocument(
    input: EngineRuntimeWorldCompileFromDocumentInput,
  ): EngineRuntimeWorldSnapshotOutput {
    if (!input || !input.snapshot || typeof input.snapshot.nodes !== "object" || input.snapshot.nodes === null) {
      throw new Error("ENGINE_WORLD_NOT_COMPILED");
    }
    const runtimeWorld = deps.buildRuntimeWorldFromDocument(input.snapshot);
    const snapshot: EngineRuntimeWorldSnapshotOutput = {
      worldRevision: runtimeWorld.revision,
      entities: runtimeWorld.entities.map((entity) => resolveRuntimeWorldEntityOutput(entity)),
    };
    deps.setRuntimeWorldSnapshotOverride(snapshot);
    return snapshot;
  }

  /**
   * Projects one internal world entity into the public runtime world entity contract.
   * @param entity Internal runtime world entity potentially carrying extended 3D fields.
   */
  function resolveRuntimeWorldEntityOutput(
    entity: RuntimeDocumentDirtyCommandDependencies["buildRuntimeWorldFromDocument"] extends (
      snapshot: EngineDocumentSnapshot,
    ) => { entities: ReadonlyArray<infer TEntity> }
      ? TEntity
      : never,
  ): EngineRuntimeWorldEntity {
    const semantic3d = entity.bounds3d && entity.transform3d
      ? {
          bounds: {
            x: entity.bounds3d.x,
            y: entity.bounds3d.y,
            z: entity.bounds3d.z,
            width: entity.bounds3d.width,
            height: entity.bounds3d.height,
            depth: entity.bounds3d.depth,
          },
          transform: {
            x: entity.transform3d.x,
            y: entity.transform3d.y,
            z: entity.transform3d.z,
            rotationX: entity.transform3d.rotationX,
            rotationY: entity.transform3d.rotationY,
            rotationZ: entity.transform3d.rotationZ,
            scaleX: entity.transform3d.scaleX,
            scaleY: entity.transform3d.scaleY,
            scaleZ: entity.transform3d.scaleZ,
          },
          sourceType: entity.sourceType,
          renderOrder: entity.renderOrder,
          visible: entity.visible,
          lightingMode: entity.lightingMode,
          materialId: entity.materialId,
        }
      : entity.semantic3d;

    return {
      id: entity.id,
      bounds: {
        x: entity.bounds.x,
        y: entity.bounds.y,
        width: entity.bounds.width,
        height: entity.bounds.height,
      },
      semantic3d,
    };
  }

  /**
   * Queries one runtime-world entity by id.
   * @param input Runtime world query-entity request.
   */
  function queryRuntimeWorldEntity(
    input: EngineRuntimeWorldQueryEntityInput,
  ): EngineRuntimeWorldQueryEntityOutput {
    if (!input || typeof input.entityId !== "string") {
      throw new Error("ENGINE_WORLD_NOT_COMPILED");
    }
    const snapshot = resolveRuntimeWorldSnapshotOutput();
    const entity = snapshot.entities.find((item) => item.id === input.entityId) ?? null;
    return {
      found: entity !== null,
      entity,
    };
  }

  /**
   * Queries runtime-world entities that expose requested component facet.
   * @param input Runtime world query-component request.
   */
  function queryRuntimeWorldComponent(
    input: EngineRuntimeWorldQueryComponentInput,
  ): EngineRuntimeWorldQueryComponentOutput {
    if (!input || typeof input.component !== "string") {
      throw new Error("ENGINE_WORLD_NOT_COMPILED");
    }
    const snapshot = resolveRuntimeWorldSnapshotOutput();

    /**
     * Keeps world component queries aligned with semantic3d completeness goals.
     * @param entity Runtime-world entity candidate from the current snapshot.
     */
    const matchComponent = (entity: (typeof snapshot.entities)[number]): boolean => {
      const semantic3d = entity.semantic3d;
      if (input.component === "transform") {
        return Boolean(semantic3d?.transform);
      }

      if (input.component === "geometry") {
        const hasBaseBounds = entity.bounds.width > 0 || entity.bounds.height > 0;
        const has3dBounds = semantic3d
          ? semantic3d.bounds.width > 0 || semantic3d.bounds.height > 0 || semantic3d.bounds.depth > 0
          : false;
        return hasBaseBounds || has3dBounds;
      }

      if (input.component === "material") {
        return Boolean(semantic3d?.materialId || semantic3d?.lightingMode);
      }

      if (input.component === "visibility") {
        return semantic3d?.visible !== false;
      }

      if (input.component === "picking") {
        const has2dPickArea = entity.bounds.width > 0 && entity.bounds.height > 0;
        const has3dPickVolume = semantic3d
          ? semantic3d.bounds.width > 0 && semantic3d.bounds.height > 0 && semantic3d.bounds.depth >= 0
          : false;
        return has2dPickArea || has3dPickVolume;
      }

      return false;
    };

    return {
      entityIds: snapshot.entities
        .filter((entity) => matchComponent(entity))
        .map((entity) => entity.id),
    };
  }

  /**
   * Clears current runtime-world snapshot override.
   * @param _unused Unused placeholder to keep call shape explicit for future extension.
   */
  function clearRuntimeWorldSnapshot(_unused?: void): EngineRuntimeWorldClearOutput {
    const currentSnapshot = resolveRuntimeWorldSnapshotOutput();
    deps.setRuntimeWorldSnapshotOverride({
      worldRevision: currentSnapshot.worldRevision,
      entities: [],
    });
    return {
      clearedEntityCount: currentSnapshot.entities.length,
    };
  }

  /**
   * Returns current runtime world graph stats output.
   */
  function resolveRuntimeWorldGraphStatsOutput(): EngineRuntimeWorldGraphStatsOutput {
    const snapshot = resolveRuntimeWorldSnapshotOutput();
    return {
      worldRevision: snapshot.worldRevision,
      entityCount: snapshot.entities.length,
    };
  }

  /**
   * Returns current runtime dirty state snapshot.
   */
  function resolveRuntimeDirtyStateOutput(): EngineRuntimeDirtyStateOutput {
    return {
      pendingDomains: [...deps.getLatestDirtyState().dirtyDomains],
      lastMarkedAt: deps.getLastRuntimeDirtyMarkedAt(),
    };
  }

  /**
   * Marks one runtime dirty domain and returns updated dirty state snapshot.
   * @param input Runtime dirty mark input.
   */
  function markRuntimeDirtyDomain(input: EngineRuntimeDirtyMarkInput): EngineRuntimeDirtyStateOutput {
    const validDomains: readonly EngineDirtyDomain[] = [
      "transform",
      "geometry",
      "material",
      "visibility",
      "picking",
      "resource",
    ];
    if (!input || !validDomains.includes(input.domain)) {
      throw new Error("ENGINE_DIRTY_INVALID_DOMAIN");
    }
    deps.setLatestDirtyState(deps.markDirty(deps.getLatestDirtyState(), input.domain));
    deps.setLastRuntimeDirtyMarkedAt(deps.resolveNow());
    return resolveRuntimeDirtyStateOutput();
  }

  /**
   * Marks multiple runtime dirty domains in one deterministic batch.
   * @param input Runtime dirty mark-batch request.
   */
  function markRuntimeDirtyDomainsBatch(
    input: EngineRuntimeDirtyMarkBatchInput,
  ): EngineRuntimeDirtyStateOutput {
    if (!input || !Array.isArray(input.domains)) {
      throw new Error("ENGINE_DIRTY_INVALID_DOMAIN");
    }
    deps.setLatestDirtyState(deps.markDirtyBatch(deps.getLatestDirtyState(), input.domains));
    deps.setLastRuntimeDirtyMarkedAt(deps.resolveNow());
    return resolveRuntimeDirtyStateOutput();
  }

  /**
   * Returns current pending dirty domains only.
   */
  function resolveRuntimePendingDirtyDomains(): readonly EngineRuntimeDirtyMarkInput["domain"][] {
    return [...deps.getLatestDirtyState().dirtyDomains];
  }

  /**
   * Flushes requested dirty domains and returns post-flush state.
   * @param input Runtime dirty flush request.
   */
  function flushRuntimeDirtyDomains(
    input: EngineRuntimeDirtyFlushInput,
  ): EngineRuntimeDirtyFlushOutput {
    if (!input || !Array.isArray(input.domains)) {
      throw new Error("ENGINE_DIRTY_INVALID_DOMAIN");
    }
    const before = new Set(deps.getLatestDirtyState().dirtyDomains);
    deps.setLatestDirtyState(deps.flushDirty(deps.getLatestDirtyState(), input.domains));
    const after = new Set(deps.getLatestDirtyState().dirtyDomains);
    let flushedCount = 0;
    for (const domain of before) {
      if (!after.has(domain)) {
        flushedCount += 1;
      }
    }
    return {
      flushedCount,
      state: resolveRuntimeDirtyStateOutput(),
    };
  }

  /**
   * Resets runtime dirty state to empty set.
   */
  function resetRuntimeDirtyState(): EngineRuntimeDirtyResetOutput {
    deps.setLatestDirtyState(deps.createEmptyDirtyState());
    deps.setLastRuntimeDirtyMarkedAt(deps.resolveNow());
    return {
      reset: true,
    };
  }

  /**
   * Encodes one runtime command plan into deterministic command output.
   * @param plan Runtime command encode input.
   */
  function encodeRuntimeCommandPlan(plan: EngineRuntimeCommandEncodeInput): EngineRuntimeCommandEncodeOutput {
    if (!plan || !Array.isArray(plan.commands)) {
      throw new Error("ENGINE_COMMAND_INVALID_PLAN");
    }
    const encoded = deps.encodeCommands(plan.commands as readonly EngineRuntimeCommand[]);
    return {
      bufferId: `buffer-${deps.getLatestCompileChangeSetId()}-${encoded.commands.length}`,
      commands: encoded.commands,
      commandCount: encoded.commands.length,
    };
  }

  /**
   * Creates one runtime command encoder session.
   * @param input Runtime command create-encoder request.
   */
  function createRuntimeCommandEncoder(
    input: EngineRuntimeCommandCreateEncoderInput,
  ): EngineRuntimeCommandCreateEncoderOutput {
    if (!input || typeof input.profile !== "string" || input.profile.length === 0) {
      throw new Error("ENGINE_COMMAND_INVALID_PLAN");
    }
    return {
      encoderId: deps.allocateRuntimeCommandEncoderId(input.profile),
    };
  }

  /**
   * Validates one runtime command buffer and returns deterministic issue summary.
   * @param buffer Runtime command validate input.
   */
  function validateRuntimeCommandBuffer(
    buffer: EngineRuntimeCommandValidateInput,
  ): EngineRuntimeCommandValidateOutput {
    if (!buffer || !Array.isArray(buffer.commands)) {
      return {
        valid: false,
        validationIssues: ["ENGINE_COMMAND_VALIDATION_FAILED"],
      };
    }
    const invalidCommand = buffer.commands.some((command) => typeof command.id !== "string" || command.id.length === 0);
    if (invalidCommand) {
      return {
        valid: false,
        validationIssues: ["ENGINE_COMMAND_VALIDATION_FAILED"],
      };
    }
    return {
      valid: true,
      validationIssues: [],
    };
  }

  /**
   * Optimizes runtime command buffer with deterministic id ordering.
   * @param input Runtime command optimize request.
   */
  function optimizeRuntimeCommandBuffer(
    input: EngineRuntimeCommandOptimizeInput,
  ): EngineRuntimeCommandOptimizeOutput {
    if (!input || !Array.isArray(input.commands)) {
      throw new Error("ENGINE_COMMAND_INVALID_PLAN");
    }
    const commands = [...input.commands].sort((left, right) => left.id.localeCompare(right.id));
    return {
      commands,
      commandCount: commands.length,
    };
  }

  /**
   * Inspects runtime command buffer and returns stable summary metadata.
   * @param buffer Runtime command inspect input.
   */
  function inspectRuntimeCommandBuffer(
    buffer: EngineRuntimeCommandValidateInput,
  ): EngineRuntimeCommandInspectOutput {
    const validation = validateRuntimeCommandBuffer(buffer);
    return {
      valid: validation.valid,
      summary: validation.valid
        ? `commands:${buffer.commands.length}`
        : `invalid:${validation.validationIssues.join("|")}`,
    };
  }

  /**
   * Replays runtime command buffer and returns replay-count summary.
   * @param buffer Runtime command replay input.
   */
  function replayRuntimeCommandBuffer(
    buffer: EngineRuntimeCommandValidateInput,
  ): EngineRuntimeCommandReplayOutput {
    const replayResult = deps.replayCommands(buffer?.commands ?? []);
    return {
      replayedCount: replayResult.replayedCount,
    };
  }

  /**
   * Returns available backend modes in selector-probe order.
   */
  function resolveRuntimeBackendListAvailableOutput(): EngineRuntimeBackendListAvailableOutput {
    return {
      available: [...deps.getBackendProbeModes()],
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
    resolveRuntimeWorldSnapshotOutput,
    compileRuntimeWorldFromDocument,
    queryRuntimeWorldEntity,
    queryRuntimeWorldComponent,
    clearRuntimeWorldSnapshot,
    resolveRuntimeWorldGraphStatsOutput,
    resolveRuntimeDirtyStateOutput,
    markRuntimeDirtyDomain,
    markRuntimeDirtyDomainsBatch,
    resolveRuntimePendingDirtyDomains,
    flushRuntimeDirtyDomains,
    resetRuntimeDirtyState,
    encodeRuntimeCommandPlan,
    createRuntimeCommandEncoder,
    validateRuntimeCommandBuffer,
    optimizeRuntimeCommandBuffer,
    inspectRuntimeCommandBuffer,
    replayRuntimeCommandBuffer,
    resolveRuntimeBackendListAvailableOutput,
  };
}
