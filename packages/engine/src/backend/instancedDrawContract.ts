/**
 * Declares the instanced draw contract for batch-rendering multiple mesh instances
 * with per-instance transform data.
 */
export interface EngineInstancedDrawContract {
  /** Number of instances to draw in this batch. */
  instanceCount: number;
  /** Optional per-instance world matrices as flat 16-element column-major arrays. */
  instanceMatrices?: ReadonlyArray<readonly number[]>;
  /** Optional per-instance colors for tint variation. */
  instanceColors?: ReadonlyArray<string>;
}

/**
 * Declares instanced draw diagnostics for parity telemetry.
 */
export interface EngineInstancedDrawDiagnostics {
  /** Number of instanced draw calls attempted in the current frame. */
  attemptedCount: number;
  /** Number of instanced draw calls successfully submitted. */
  succeededCount: number;
  /** Number of instanced draw calls rejected (capability gate, invalid data). */
  rejectedCount: number;
  /** Total instances rendered across all instanced draws in the current frame. */
  totalInstanceCount: number;
  /** Reason for instanced draw rejection when rejection occurs. */
  rejectionReason: "none" | "capability-gate" | "invalid-matrix" | "insufficient-buffer";
}

/**
 * Creates zero-valued instanced draw diagnostics snapshot.
 */
export function createZeroInstancedDrawDiagnostics(): EngineInstancedDrawDiagnostics {
  return {
    attemptedCount: 0,
    succeededCount: 0,
    rejectedCount: 0,
    totalInstanceCount: 0,
    rejectionReason: "none",
  };
}
