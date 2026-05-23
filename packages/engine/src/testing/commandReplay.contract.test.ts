import assert from "node:assert/strict";
import test from "node:test";

import { createEngineCommandReplayModule } from "../kernel/command-buffer/commandReplay/commandReplay";

/**
 * Verifies command replay skeleton provides deterministic replay events for M3 baseline.
 */
test("command replay skeleton deterministic events", () => {
  const replayModule = createEngineCommandReplayModule();
  const replayResult = replayModule.replay([
    { id: "z", kind: "draw", payload: {} },
    { id: "a", kind: "set-state", payload: {} },
  ]);

  assert.deepEqual(
    replayResult.events.map((event) => event.commandId),
    ["a", "z"],
  );
  assert.equal(replayResult.replayedCount, 2);
});
