import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";

/**
 * Creates deterministic runtime adapter so replay counters remain stable in tests.
 * @param now Fixed timestamp supplied by runtime adapter.
 */
function createDeterministicRuntimeAdapter(now: number) {
  return {
    requestFrame: (_callback: (timestampMs: number) => void) => 1,
    cancelFrame: (_handle: number) => {},
    now: () => now,
  };
}

/**
 * Verifies createEngine reports replay diagnostics counters after orchestration.
 */
test("createEngine replay diagnostics counters", () => {
  const engine = createEngine({
    surface: createTestSurface(480, 320),
    runtimeAdapter: createDeterministicRuntimeAdapter(123),
  });

  engine.start();
  const stats = engine.getStats();

  assert.equal(typeof stats.lastReplayEventCount, "number");
  assert.equal((stats.lastReplayEventCount ?? 0) >= 0, true);
  assert.equal(
    stats.lastReplayFirstCommandId === null
      || typeof stats.lastReplayFirstCommandId === "string",
    true,
  );

  engine.dispose();
});
