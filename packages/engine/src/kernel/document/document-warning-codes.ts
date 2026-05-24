/**
 * Canonical runtime document warning code map used by diagnostics warning events.
 */
export const ENGINE_RUNTIME_DOCUMENT_WARNING_CODE = {
  /** Raised when runtime document apply receives malformed change-set payload. */
  CHANGESET_INVALID: "ENGINE_RUNTIME_DOCUMENT_CHANGESET_INVALID",
  /** Raised when adapter-linearized envelope fails validation checks. */
  LINEARIZED_ENVELOPE_INVALID: "ENGINE_RUNTIME_DOCUMENT_LINEARIZED_ENVELOPE_INVALID",
  /** Raised when envelope change-set id does not match runtime apply change-set id. */
  LINEARIZED_CHANGESET_MISMATCH: "ENGINE_RUNTIME_DOCUMENT_LINEARIZED_CHANGESET_MISMATCH",
  /** Raised when decoded-frame payload fails schema/value validation checks. */
  DECODED_FRAME_INVALID: "ENGINE_RUNTIME_DOCUMENT_DECODED_FRAME_INVALID",
  /** Raised when decoded-frame timeline alignment fails monotonic/drift checks. */
  TIMELINE_ALIGNMENT_INVALID: "ENGINE_RUNTIME_DOCUMENT_TIMELINE_ALIGNMENT_INVALID",
  /** Raised when runtime document apply base revision mismatches active revision. */
  REVISION_CONFLICT: "ENGINE_RUNTIME_DOCUMENT_REVISION_CONFLICT",
  /** Raised when runtime document apply schema version mismatches runtime schema version. */
  SCHEMA_MISMATCH: "ENGINE_RUNTIME_DOCUMENT_SCHEMA_MISMATCH",
} as const;

/**
 * Union of canonical runtime document warning code literals.
 */
export type EngineRuntimeDocumentWarningCode =
  typeof ENGINE_RUNTIME_DOCUMENT_WARNING_CODE[keyof typeof ENGINE_RUNTIME_DOCUMENT_WARNING_CODE];

/**
 * Requirement-id literals used by runtime document warning code baseline linkage.
 */
export type EngineRuntimeDocumentWarningRequirementId =
  | "R-S3-2"
  | "R-S13-2"
  | "R-S13-4"
  | "A-BOUNDARY-2"
  | "A-BOUNDARY-4"
  | "E-CORE-2"
  | "E-TIME-3"
  | "E-OBS-1";

/**
 * Canonical baseline mapping from warning codes to requirement ids in engine requirement spec.
 */
export const ENGINE_RUNTIME_DOCUMENT_WARNING_CODE_BASELINE_REQUIREMENTS: Readonly<
  Record<EngineRuntimeDocumentWarningCode, readonly EngineRuntimeDocumentWarningRequirementId[]>
> = {
  ENGINE_RUNTIME_DOCUMENT_CHANGESET_INVALID: ["E-CORE-2", "E-OBS-1"],
  ENGINE_RUNTIME_DOCUMENT_LINEARIZED_ENVELOPE_INVALID: ["R-S3-2", "A-BOUNDARY-2", "E-CORE-2"],
  ENGINE_RUNTIME_DOCUMENT_LINEARIZED_CHANGESET_MISMATCH: ["R-S3-2", "A-BOUNDARY-2", "E-CORE-2"],
  ENGINE_RUNTIME_DOCUMENT_DECODED_FRAME_INVALID: ["R-S13-4", "A-BOUNDARY-4", "E-OBS-1"],
  ENGINE_RUNTIME_DOCUMENT_TIMELINE_ALIGNMENT_INVALID: ["R-S13-2", "E-TIME-3", "E-OBS-1"],
  ENGINE_RUNTIME_DOCUMENT_REVISION_CONFLICT: ["R-S3-2", "E-CORE-2", "E-OBS-1"],
  ENGINE_RUNTIME_DOCUMENT_SCHEMA_MISMATCH: ["E-CORE-2", "E-OBS-1"],
} as const;