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

/**
 * Verifies replay diagnostics are stable when runtime adapter time is deterministic.
 */
test("createEngine replay diagnostics remain stable for deterministic adapter", () => {
  const createSessionStats = () => {
    const engine = createEngine({
      surface: createTestSurface(320, 180),
      runtimeAdapter: createDeterministicRuntimeAdapter(456),
    });
    engine.start();
    const stats = engine.getStats();
    engine.dispose();
    return {
      lastReplayEventCount: stats.lastReplayEventCount,
      lastReplayFirstCommandId: stats.lastReplayFirstCommandId,
    };
  };

  assert.deepEqual(createSessionStats(), createSessionStats());
});

/**
 * Verifies browser-like and headless backend selections keep replay token acceptance deterministic.
 */
test("createEngine replay parity stays deterministic across browser and headless profiles", () => {
  const createReplaySummary = (backend: "webgl" | "headless") => {
    const engine = createEngine({
      surface: createTestSurface(320, 180),
      backend,
      runtimeAdapter: createDeterministicRuntimeAdapter(789),
    });
    engine.setGraph({
      revision: 7,
      nodes: [{ id: "replay-node", kind: "shape", x: 10, y: 20, width: 30, height: 40 }],
    });
    const token = engine.runtime.observability.createReplayToken("parity");
    const replay = engine.runtime.observability.replay(token.token);
    const metrics = engine.runtime.observability.getMetricsSnapshot();
    engine.dispose();

    return {
      accepted: replay.accepted,
      tokenShape: token.token.replace(/parity-\d+-\d+$/, "parity-<revision>-<counter>"),
      drawCount: metrics.drawCount,
    };
  };

  assert.deepEqual(createReplaySummary("webgl"), createReplaySummary("headless"));
});
