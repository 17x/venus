import assert from "node:assert/strict";
import test from "node:test";

import { createEngineCommandEncoderModule } from "./commandEncoder";

/**
 * Verifies command-encoder module returns deterministic id ordering.
 */
test("commandEncoder module sorts commands by id", () => {
  const module = createEngineCommandEncoderModule();
  const result = module.encode([
    { id: "cmd-b", kind: "draw", payload: {} },
    { id: "cmd-a", kind: "set-state", payload: {} },
  ]);

  assert.deepEqual(
    result.commands.map((command) => command.id),
    ["cmd-a", "cmd-b"],
  );
  assert.equal(result.hadDuplicateIds, false);
});

/**
 * Verifies command-encoder module rewrites duplicate command ids predictably.
 */
test("commandEncoder module rewrites duplicate ids", () => {
  const module = createEngineCommandEncoderModule();
  const result = module.encode([
    { id: "cmd-a", kind: "draw", payload: {} },
    { id: "cmd-a", kind: "draw", payload: {} },
  ]);

  assert.equal(result.hadDuplicateIds, true);
  assert.deepEqual(
    result.commands.map((command) => command.id),
    ["cmd-a", "cmd-a#1"],
  );
});
