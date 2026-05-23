import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_COMMAND_FOUNDATION_API,
  resolveEngineRuntimeCommandFoundationApiDescriptor,
} from "../../orchestration/runtime/command/command-buffer.foundation.contract";
import { createEngineCommandEncoderModule } from "../../kernel/command-buffer/commandEncoder/commandEncoder";

/**
 * Verifies runtime command foundation API descriptor map keeps expected endpoint set.
 */
test("runtime command foundation descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_COMMAND_FOUNDATION_API).sort(), [
    "createEncoder",
    "encode",
    "inspect",
    "optimize",
    "replay",
    "validate",
  ]);
});

/**
 * Verifies runtime command foundation descriptors carry required error semantics.
 */
test("runtime command foundation descriptors keep required error codes", () => {
  assert.deepEqual(ENGINE_RUNTIME_COMMAND_FOUNDATION_API.encode.errorCodes, [
    "ENGINE_COMMAND_INVALID_PLAN",
  ]);
  assert.deepEqual(ENGINE_RUNTIME_COMMAND_FOUNDATION_API.validate.errorCodes, [
    "ENGINE_COMMAND_VALIDATION_FAILED",
  ]);
  assert.equal(ENGINE_RUNTIME_COMMAND_FOUNDATION_API.encode.level, "foundation");
  assert.equal(ENGINE_RUNTIME_COMMAND_FOUNDATION_API.validate.level, "foundation");
});

/**
 * Verifies command descriptor resolver returns canonical descriptors by map key.
 */
test("runtime command foundation descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeCommandFoundationApiDescriptor("createEncoder"),
    ENGINE_RUNTIME_COMMAND_FOUNDATION_API.createEncoder,
  );
  assert.deepEqual(
    resolveEngineRuntimeCommandFoundationApiDescriptor("encode"),
    ENGINE_RUNTIME_COMMAND_FOUNDATION_API.encode,
  );
  assert.deepEqual(
    resolveEngineRuntimeCommandFoundationApiDescriptor("validate"),
    ENGINE_RUNTIME_COMMAND_FOUNDATION_API.validate,
  );
  assert.deepEqual(
    resolveEngineRuntimeCommandFoundationApiDescriptor("optimize"),
    ENGINE_RUNTIME_COMMAND_FOUNDATION_API.optimize,
  );
  assert.deepEqual(
    resolveEngineRuntimeCommandFoundationApiDescriptor("inspect"),
    ENGINE_RUNTIME_COMMAND_FOUNDATION_API.inspect,
  );
  assert.deepEqual(
    resolveEngineRuntimeCommandFoundationApiDescriptor("replay"),
    ENGINE_RUNTIME_COMMAND_FOUNDATION_API.replay,
  );
});

/**
 * Verifies command encode determinism keeps sorted-by-id behavior for equal input.
 */
test("runtime command encode determinism remains stable", () => {
  const encoder = createEngineCommandEncoderModule();
  const commands = [
    { id: "cmd-z", kind: "draw" as const, payload: {} },
    { id: "cmd-a", kind: "set-state" as const, payload: {} },
    { id: "cmd-m", kind: "dispatch" as const, payload: {} },
  ];

  const first = encoder.encode(commands);
  const second = encoder.encode(commands);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.commands.map((command) => command.id),
    ["cmd-a", "cmd-m", "cmd-z"],
  );
});
