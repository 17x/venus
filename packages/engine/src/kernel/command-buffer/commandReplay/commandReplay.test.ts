import assert from "node:assert/strict";
import test from "node:test";

import { createEngineCommandReplayModule } from "./commandReplay";

/**
 * Verifies command replay module keeps deterministic command replay ordering.
 */
test("commandReplay module deterministic ordering", () => {
  const module = createEngineCommandReplayModule();
  const result = module.replay([
    { id: "cmd-c", kind: "draw", payload: {} },
    { id: "cmd-a", kind: "set-state", payload: {} },
    { id: "cmd-b", kind: "bind-resource", payload: {} },
  ]);

  assert.deepEqual(
    result.events.map((event) => event.commandId),
    ["cmd-a", "cmd-b", "cmd-c"],
  );
  assert.equal(result.replayedCount, 3);
});
