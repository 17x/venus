import type {
  EngineCommandEncodeResult,
  EngineCommandEncoderModule,
  EngineEncodedCommand,
} from "./commandEncoder.contract";

/**
 * Creates command-encoder module that normalizes command ordering and duplicate ids.
 */
export function createEngineCommandEncoderModule(): EngineCommandEncoderModule {
  return {
    encode: (commands) => resolveEncodedCommands(commands),
  };
}

/**
 * Resolves deterministic command sequence with duplicate-id normalization.
 * @param commands Input command batch from planning/runtime layers.
 */
function resolveEncodedCommands(
  commands: readonly EngineEncodedCommand[],
): EngineCommandEncodeResult {
  const seenIds = new Set<string>();
  let hadDuplicateIds = false;

  const normalized = commands.map((command, index) => {
    if (!seenIds.has(command.id)) {
      seenIds.add(command.id);
      return command;
    }

    hadDuplicateIds = true;
    const dedupedId = `${command.id}#${index}`;
    return {
      id: dedupedId,
      kind: command.kind,
      payload: command.payload,
    };
  });

  const sorted = normalized
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    commands: sorted,
    hadDuplicateIds,
  };
}
