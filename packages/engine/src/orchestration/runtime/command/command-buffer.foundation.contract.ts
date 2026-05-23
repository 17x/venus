import type { EngineEncodedCommand } from "../../../kernel/command-buffer/commandEncoder/commandEncoder.contract";

/**
 * Runtime command foundation API level classifications.
 */
export type EngineRuntimeCommandFoundationLevel = "foundation";

/**
 * Runtime command foundation stability classifications.
 */
export type EngineRuntimeCommandFoundationStability = "beta";

/**
 * Error codes reserved for runtime command foundation APIs.
 */
export type EngineRuntimeCommandFoundationErrorCode =
  | "ENGINE_COMMAND_INVALID_PLAN"
  | "ENGINE_COMMAND_VALIDATION_FAILED";

/**
 * Command encode output contract for runtime command foundation APIs.
 */
export interface EngineRuntimeCommandEncodeOutput {
  /** Stable command buffer identifier. */
  bufferId: string;
  /** Deterministic encoded command sequence. */
  commands: readonly EngineEncodedCommand[];
  /** Number of encoded commands. */
  commandCount: number;
}

/**
 * Command validate output contract for runtime command foundation APIs.
 */
export interface EngineRuntimeCommandValidateOutput {
  /** Whether provided buffer satisfies runtime validation checks. */
  valid: boolean;
  /** Deterministic validation issue list. */
  validationIssues: readonly string[];
}

/**
 * API descriptor contract for one runtime command foundation endpoint.
 */
export interface EngineRuntimeCommandFoundationApiDescriptor {
  /** Canonical runtime API method name. */
  name:
    | "engine.runtime.command.createEncoder"
    | "engine.runtime.command.encode"
    | "engine.runtime.command.validate"
    | "engine.runtime.command.optimize"
    | "engine.runtime.command.inspect"
    | "engine.runtime.command.replay";
  /** API layering classification. */
  level: EngineRuntimeCommandFoundationLevel;
  /** API stability tag. */
  stability: EngineRuntimeCommandFoundationStability;
  /** Reserved error code set for this endpoint. */
  errorCodes: readonly EngineRuntimeCommandFoundationErrorCode[];
  /** Determinism guarantee summary for endpoint behavior. */
  determinism: string;
}

/**
 * Runtime command foundation descriptor map used by contract tests and docs.
 */
export const ENGINE_RUNTIME_COMMAND_FOUNDATION_API = {
  createEncoder: {
    name: "engine.runtime.command.createEncoder",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_COMMAND_INVALID_PLAN"],
    determinism: "Same profile input yields identical encoder id sequence under same call order.",
  },
  encode: {
    name: "engine.runtime.command.encode",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_COMMAND_INVALID_PLAN"],
    determinism: "Same render plan yields identical command ordering and commandCount.",
  },
  validate: {
    name: "engine.runtime.command.validate",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_COMMAND_VALIDATION_FAILED"],
    determinism: "Same command buffer yields identical validationIssues ordering.",
  },
  optimize: {
    name: "engine.runtime.command.optimize",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_COMMAND_INVALID_PLAN"],
    determinism: "Same command buffer and profile yields identical optimized command ordering.",
  },
  inspect: {
    name: "engine.runtime.command.inspect",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_COMMAND_VALIDATION_FAILED"],
    determinism: "Same command buffer yields identical valid flag and summary output.",
  },
  replay: {
    name: "engine.runtime.command.replay",
    level: "foundation",
    stability: "beta",
    errorCodes: ["ENGINE_COMMAND_VALIDATION_FAILED"],
    determinism: "Same command buffer yields identical replayedCount output.",
  },
} as const satisfies Readonly<
  Record<
    "createEncoder" | "encode" | "validate" | "optimize" | "inspect" | "replay",
    EngineRuntimeCommandFoundationApiDescriptor
  >
>;

/**
 * Resolves one runtime command foundation API descriptor by key.
 * @param apiKey Descriptor key from the runtime command foundation map.
 */
export function resolveEngineRuntimeCommandFoundationApiDescriptor(
  apiKey: keyof typeof ENGINE_RUNTIME_COMMAND_FOUNDATION_API,
): EngineRuntimeCommandFoundationApiDescriptor {
  return ENGINE_RUNTIME_COMMAND_FOUNDATION_API[apiKey];
}
