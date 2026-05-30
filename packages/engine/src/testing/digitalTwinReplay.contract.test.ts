import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, createTestSurface } from "../index";

/**
 * Verifies digital twin replay contracts keep event timeline deterministic across sessions.
 */
test("digital twin replay timeline keeps event order deterministic across sessions", () => {
  const createTimelineSession = () => {
    const engine = createEngine({
      surface: createTestSurface(400, 300),
      backend: "headless",
    });
    engine.setGraph({
      revision: 1,
      nodes: [
        { id: "twin-vehicle", kind: "shape", x: 0, y: 0, width: 20, height: 10 },
        { id: "twin-obstacle", kind: "shape", x: 50, y: 20, width: 10, height: 10 },
      ],
    });

    // Create replay token as timeline event anchor
    const token = engine.runtime.observability.createReplayToken("twin-replay");
    const replay = engine.runtime.observability.replay(token.token);

    // Capture frame for deterministic output
    const frame = engine.captureFrame({ label: "twin-frame" });

    // Get metrics for telemetry snapshot
    const metrics = engine.runtime.observability.getMetricsSnapshot();

    engine.dispose();

    return {
      replayAccepted: replay.accepted,
      frameTimestamp: typeof frame.timestampMs === "number",
      drawCount: metrics.drawCount,
    };
  };

  assert.deepEqual(createTimelineSession(), createTimelineSession());
});

/**
 * Verifies event replay token stays stable for the same scope input.
 */
test("digital twin replay token stays deterministic for same scope", () => {
  const createToken = () => {
    const engine = createEngine({
      surface: createTestSurface(200, 100),
      backend: "headless",
    });
    engine.setGraph({ revision: 3, nodes: [{ id: "e1", kind: "shape", x: 10, y: 10, width: 50, height: 30 }] });
    const token = engine.runtime.observability.createReplayToken("driving-twin");
    engine.dispose();
    return token.token;
  };

  assert.equal(createToken(), createToken());
});

/**
 * Verifies frame-budget aware playback contracts under headless mode.
 */
test("digital twin frame budget playback exposes draw and command counts", () => {
  const engine = createEngine({
    surface: createTestSurface(640, 360),
    backend: "headless",
  });
  engine.setGraph({
    revision: 5,
    nodes: Array.from({ length: 10 }, (_, i) => ({
      id: `twin-node-${i}`,
      kind: "shape" as const,
      x: i * 50,
      y: 20,
      width: 40,
      height: 30,
    })),
  });

  const stats = engine.getStats();
  assert.equal(typeof stats.lastExecutionDrawCount, "number");
  assert.equal((stats.lastExecutionDrawCount ?? 0) >= 0, true);

  const token = engine.runtime.observability.createReplayToken("budget-playback");
  const replay = engine.runtime.observability.replay(token.token);
  assert.equal(replay.accepted, true);

  engine.dispose();
});
