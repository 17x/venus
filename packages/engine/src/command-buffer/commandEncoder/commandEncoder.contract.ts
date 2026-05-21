/**
 * Render command kind used by backend-agnostic command encoder.
 */
export type EngineEncodedCommandKind =
  | "set-state"
  | "bind-resource"
  | "draw"
  | "dispatch"
  | "readback";

/**
 * One backend-agnostic encoded command.
 */
export interface EngineEncodedCommand {
  /** Stable command id used for deterministic ordering and diagnostics. */
  id: string;
  /** Command kind consumed by backend execution adapters. */
  kind: EngineEncodedCommandKind;
  /** Command payload owned by caller contract. */
  payload: Readonly<Record<string, unknown>>;
}

/**
 * Encoder result containing deterministic command sequence and metadata.
 */
export interface EngineCommandEncodeResult {
  /** Deterministically sorted command sequence. */
  commands: readonly EngineEncodedCommand[];
  /** True when duplicate command ids were detected and normalized. */
  hadDuplicateIds: boolean;
}

/**
 * Contract for command-encoder module.
 */
export interface EngineCommandEncoderModule {
  /**
   * Encodes one command batch into deterministic order.
   */
  encode: (commands: readonly EngineEncodedCommand[]) => EngineCommandEncodeResult;
}
