import type { EngineEncodedCommand } from "../commandEncoder/commandEncoder.contract";
import type {
  EngineCommandReplayModule,
  EngineCommandReplayResult,
} from "./commandReplay.contract";

/**
 * Creates command replay module with deterministic command ordering semantics.
 */
export function createEngineCommandReplayModule(): EngineCommandReplayModule {
  return {
    replay: (commands) => resolveReplayResult(commands),
  };
}

/**
 * Resolves deterministic replay event sequence from encoded commands.
 * @param commands Encoded command sequence from command encoder.
 */
function resolveReplayResult(
  commands: readonly EngineEncodedCommand[],
): EngineCommandReplayResult {
  const sorted = commands
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));

  const events = sorted.map((command, index) => ({
    commandId: command.id,
    commandKind: command.kind,
    index,
  }));

  return {
    events,
    replayedCount: events.length,
  };
}
