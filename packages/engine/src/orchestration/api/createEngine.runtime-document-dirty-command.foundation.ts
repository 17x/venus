import type {
  EngineRuntimeBackendListAvailableOutput,
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
  EngineRuntimeWorldGraphStatsOutput,
  EngineRuntimeWorldQueryComponentInput,
  EngineRuntimeWorldQueryComponentOutput,
  EngineRuntimeWorldQueryEntityInput,
  EngineRuntimeWorldQueryEntityOutput,
  EngineRuntimeWorldSnapshotOutput,
} from "./public-types";
import type { EngineDocumentChangeSet, EngineDocumentSnapshot } from "../../kernel/document/document-contracts";
import type { RuntimeDocumentFoundationDeps } from "./createEngine.runtime-document.foundation";
import type { RuntimeWorldFoundationDeps } from "./createEngine.runtime-world.foundation";
import type { RuntimeDirtyFoundationDeps } from "./createEngine.runtime-dirty.foundation";
import type { RuntimeCommandFoundationDeps } from "./createEngine.runtime-command.foundation";
import { createRuntimeDocumentFoundation } from "./createEngine.runtime-document.foundation";
import { createRuntimeWorldFoundation } from "./createEngine.runtime-world.foundation";
import { createRuntimeDirtyFoundation } from "./createEngine.runtime-dirty.foundation";
import { createRuntimeCommandFoundation } from "./createEngine.runtime-command.foundation";

// Re-export RuntimeDirtyStateLike so callers that previously imported it from this module still resolve.
export type { RuntimeDirtyStateLike } from "./createEngine.runtime-dirty.foundation";

/**
 * Defines dependencies required by runtime document/dirty/command/backends-list helper assembly.
 * Composed from the four domain sub-foundation deps types via intersection.
 */
export type RuntimeDocumentDirtyCommandDependencies =
  RuntimeDocumentFoundationDeps &
  RuntimeWorldFoundationDeps &
  RuntimeDirtyFoundationDeps &
  RuntimeCommandFoundationDeps;

/**
 * Assembles runtime document/dirty/command/backends-list helper functions.
 * Thin orchestrator: delegates to four focused sub-foundations and spreads their returns.
 * @param deps Shared mutable state and module delegates from the createEngine closure.
 */
export function createRuntimeDocumentDirtyCommandFoundation(
  deps: RuntimeDocumentDirtyCommandDependencies,
): {
  resolveRuntimeDocumentRevision: () => number;
  resolveRuntimeDocumentSchemaVersion: () => number;
    applyRuntimeDocumentChangeSet: (
      input: EngineRuntimeDocumentApplyChangeSetInput,
    ) => EngineRuntimeDocumentApplyChangeSetResult;
  preflightRuntimeDocumentChangeSetApply: (
    input: EngineRuntimeDocumentPreflightApplyChangeSetInput,
  ) => EngineRuntimeDocumentPreflightApplyChangeSetOutput;
  createRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentCreateSnapshotInput) => EngineDocumentSnapshot;
    validateRuntimeDocumentSnapshot: (
      input: EngineRuntimeDocumentValidateSnapshotInput,
    ) => EngineRuntimeDocumentValidateSnapshotOutput;
    diffRuntimeDocumentSnapshots: (
      input: EngineRuntimeDocumentDiffSnapshotsInput,
    ) => EngineRuntimeDocumentDiffSnapshotsOutput;
    rebaseRuntimeDocumentChangeSet: (input: EngineRuntimeDocumentRebaseChangeSetInput) => EngineDocumentChangeSet;
    serializeRuntimeDocumentSnapshot: (
      input: EngineRuntimeDocumentSerializeSnapshotInput,
    ) => EngineRuntimeDocumentSerializeSnapshotOutput;
  deserializeRuntimeDocumentSnapshot: (input: EngineRuntimeDocumentDeserializeSnapshotInput) => EngineDocumentSnapshot;
  resolveRuntimeWorldSnapshotOutput: () => EngineRuntimeWorldSnapshotOutput;
    compileRuntimeWorldFromDocument: (
      input: EngineRuntimeWorldCompileFromDocumentInput,
    ) => EngineRuntimeWorldSnapshotOutput;
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
    createRuntimeCommandEncoder: (
      input: EngineRuntimeCommandCreateEncoderInput,
    ) => EngineRuntimeCommandCreateEncoderOutput;
  validateRuntimeCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandValidateOutput;
  optimizeRuntimeCommandBuffer: (input: EngineRuntimeCommandOptimizeInput) => EngineRuntimeCommandOptimizeOutput;
  inspectRuntimeCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandInspectOutput;
  replayRuntimeCommandBuffer: (buffer: EngineRuntimeCommandValidateInput) => EngineRuntimeCommandReplayOutput;
  resolveRuntimeBackendListAvailableOutput: () => EngineRuntimeBackendListAvailableOutput;
} {
  return {
    ...createRuntimeDocumentFoundation(deps),
    ...createRuntimeWorldFoundation(deps),
    ...createRuntimeDirtyFoundation(deps),
    ...createRuntimeCommandFoundation(deps),
  };
}
