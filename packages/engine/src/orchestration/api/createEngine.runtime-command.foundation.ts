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
} from "./public-types";

/**
 * Defines dependencies required by the runtime command and backend-list domain helpers.
 */
export type RuntimeCommandFoundationDeps = {
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
};

/**
 * Assembles runtime command and backend-list helper functions.
 * @param deps Shared command state and module delegates from createEngine closure.
 */
export function createRuntimeCommandFoundation(deps: RuntimeCommandFoundationDeps): {
  encodeRuntimeCommandPlan: (plan: EngineRuntimeCommandEncodeInput) => EngineRuntimeCommandEncodeOutput;
  createRuntimeCommandEncoder: (
    input: EngineRuntimeCommandCreateEncoderInput,
  ) => EngineRuntimeCommandCreateEncoderOutput;
  validateRuntimeCommandBuffer: (
    buffer: EngineRuntimeCommandValidateInput,
  ) => EngineRuntimeCommandValidateOutput;
  optimizeRuntimeCommandBuffer: (
    input: EngineRuntimeCommandOptimizeInput,
  ) => EngineRuntimeCommandOptimizeOutput;
  inspectRuntimeCommandBuffer: (
    buffer: EngineRuntimeCommandValidateInput,
  ) => EngineRuntimeCommandInspectOutput;
  replayRuntimeCommandBuffer: (
    buffer: EngineRuntimeCommandValidateInput,
  ) => EngineRuntimeCommandReplayOutput;
  resolveRuntimeBackendListAvailableOutput: () => EngineRuntimeBackendListAvailableOutput;
} {
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
    const invalidCommand = buffer.commands.some(
      (command) => typeof command.id !== "string" || command.id.length === 0,
    );
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
    encodeRuntimeCommandPlan,
    createRuntimeCommandEncoder,
    validateRuntimeCommandBuffer,
    optimizeRuntimeCommandBuffer,
    inspectRuntimeCommandBuffer,
    replayRuntimeCommandBuffer,
    resolveRuntimeBackendListAvailableOutput,
  };
}
