import type { EngineEncodedCommand } from "../commandEncoder/commandEncoder.contract";

/**
 * Replay event emitted for each command during deterministic replay.
 */
export interface EngineCommandReplayEvent {
  /** Replayed command id. */
  commandId: string;
  /** Replayed command kind. */
  commandKind: EngineEncodedCommand["kind"];
  /** Zero-based replay sequence index. */
  index: number;
}

/**
 * Replay result returned by command replay module.
 */
export interface EngineCommandReplayResult {
  /** Deterministic replay event sequence. */
  events: readonly EngineCommandReplayEvent[];
  /** Number of replayed commands. */
  replayedCount: number;
}

/**
 * Contract for deterministic command replay module.
 */
export interface EngineCommandReplayModule {
  /**
   * Replays encoded commands in deterministic sorted-by-id order.
   */
  replay: (commands: readonly EngineEncodedCommand[]) => EngineCommandReplayResult;
}
