import type { EngineDocumentChangeSet } from "../../../kernel/document/document-contracts";

/**
 * Runtime document foundation API level classifications.
 */
export type EngineRuntimeDocumentFoundationLevel = "foundation";

/**
 * Runtime document foundation stability classifications.
 */
export type EngineRuntimeDocumentFoundationStability = "beta";

/**
 * Error codes reserved for runtime document foundation APIs.
 */
export type EngineRuntimeDocumentFoundationErrorCode =
  | "ENGINE_DOCUMENT_INVALID_CHANGESET"
  | "ENGINE_DOCUMENT_REVISION_CONFLICT";

/**
 * Change-set apply request contract for runtime document foundation APIs.
 */
export interface EngineRuntimeDocumentApplyChangeSetInput {
  /** Deterministic change-set payload to apply. */
  changeSet: EngineDocumentChangeSet;
  /** Optional expected base revision before apply. */
  baseRevision?: number;
  /** Optional schema version provided by caller. */
  schemaVersion?: number;
}

/**
 * Change-set apply response contract for runtime document foundation APIs.
 */
export interface EngineRuntimeDocumentApplyChangeSetResult {
  /** Next document revision after successful apply. */
  nextRevision: number;
  /** Number of operations applied from change-set. */
  appliedOps: number;
  /** Optional deterministic warning list. */
  warnings: readonly string[];
}

/**
 * API descriptor contract for one runtime document foundation endpoint.
 */
export interface EngineRuntimeDocumentFoundationApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.runtime.document.createSnapshot"
    | "engine.runtime.document.validateSnapshot"
    | "engine.runtime.document.getRevision"
    | "engine.runtime.document.getSchemaVersion"
    | "engine.runtime.document.applyChangeSet"
    | "engine.runtime.document.diffSnapshots"
    | "engine.runtime.document.rebaseChangeSet"
    | "engine.runtime.document.serializeSnapshot"
    | "engine.runtime.document.deserializeSnapshot";
  /** API layering classification. */
  level: EngineRuntimeDocumentFoundationLevel;
  /** API stability tag. */
  stability: EngineRuntimeDocumentFoundationStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeDocumentFoundationErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime document foundation descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API = {
  createSnapshot: {
    name: "engine.runtime.document.createSnapshot",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DOCUMENT_INVALID_CHANGESET"],
    determinism: "Same revision and same node table payload yields identical snapshot object.",
  },
  validateSnapshot: {
    name: "engine.runtime.document.validateSnapshot",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DOCUMENT_INVALID_CHANGESET"],
    determinism: "Same snapshot payload yields identical validation result and issue ordering.",
  },
  getRevision: {
    name: "engine.runtime.document.getRevision",
    level: "foundation",
    stability: "beta",
    errorCodes: [],
    determinism: "Same document state yields same revision output.",
  },
  getSchemaVersion: {
    name: "engine.runtime.document.getSchemaVersion",
    level: "foundation",
    stability: "beta",
    errorCodes: [],
    determinism: "Same runtime build yields same schemaVersion output.",
  },
  applyChangeSet: {
    name: "engine.runtime.document.applyChangeSet",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DOCUMENT_INVALID_CHANGESET", "ENGINE_DOCUMENT_REVISION_CONFLICT"],
    determinism:
      "Same changeSet + same baseRevision + same schemaVersion yields same nextRevision and appliedOps.",
  },
  diffSnapshots: {
    name: "engine.runtime.document.diffSnapshots",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DOCUMENT_INVALID_CHANGESET"],
    determinism: "Same base/target snapshots yield same added/removed/updated node id ordering.",
  },
  rebaseChangeSet: {
    name: "engine.runtime.document.rebaseChangeSet",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DOCUMENT_INVALID_CHANGESET"],
    determinism: "Same baseRevision and changeSet yield same rebased targetRevision and operations.",
  },
  serializeSnapshot: {
    name: "engine.runtime.document.serializeSnapshot",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DOCUMENT_INVALID_CHANGESET"],
    determinism: "Same snapshot payload yields same serialized JSON string.",
  },
  deserializeSnapshot: {
    name: "engine.runtime.document.deserializeSnapshot",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_DOCUMENT_INVALID_CHANGESET"],
    determinism: "Same serialized payload yields same snapshot revision and node table.",
  },
} as const satisfies Readonly<
  Record<
    | "createSnapshot"
    | "validateSnapshot"
    | "getRevision"
    | "getSchemaVersion"
    | "applyChangeSet"
    | "diffSnapshots"
    | "rebaseChangeSet"
    | "serializeSnapshot"
    | "deserializeSnapshot",
    EngineRuntimeDocumentFoundationApiDescriptor
  >
>;

/**
 * Resolves one runtime document foundation API descriptor by key.
 * @param apiKey Descriptor key from the runtime document foundation map.
 */
export function resolveEngineRuntimeDocumentFoundationApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API,
): EngineRuntimeDocumentFoundationApiDescriptor {
  return ENGINE_RUNTIME_DOCUMENT_FOUNDATION_API[apiKey];
}
