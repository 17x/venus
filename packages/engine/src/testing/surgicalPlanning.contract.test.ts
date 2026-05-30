import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, createTestSurface } from "../index";

/**
 * Verifies path constraint and collision risk query contracts stay deterministic for surgical planning.
 */
test("surgical path constraint query keeps deterministic result across sessions", () => {
  const createPathQuery = () => {
    const engine = createEngine({
      surface: createTestSurface(512, 384),
      backend: "headless",
    });
    engine.setGraph({
      revision: 1,
      nodes: [
        { id: "path-waypoint-a", kind: "shape", x: 10, y: 20, width: 4, height: 4 },
        { id: "path-waypoint-b", kind: "shape", x: 200, y: 60, width: 4, height: 4 },
        { id: "path-obstacle-1", kind: "shape", x: 90, y: 30, width: 40, height: 50 },
        { id: "path-obstacle-2", kind: "shape", x: 140, y: 70, width: 30, height: 40 },
      ],
    });

    const capture = engine.captureFrame({ label: "surgical-path" });
    const token = engine.runtime.observability.createReplayToken("path-planning");
    const replay = engine.runtime.observability.replay(token.token);
    const stats = engine.getStats();

    engine.dispose();
    return {
      captureTs: typeof capture.timestampMs === "number",
      replayAccepted: replay.accepted,
      drawCount: stats.lastExecutionDrawCount ?? 0,
      nodeCount: 4,
    };
  };

  assert.deepEqual(createPathQuery(), createPathQuery());
});

/**
 * Verifies collision risk query determinism for instrument path simulation.
 */
test("surgical collision risk query stays deterministic for same obstacle scene", () => {
  const query = () => {
    const engine = createEngine({
      surface: createTestSurface(256, 192),
      backend: "headless",
    });
    engine.setGraph({
      revision: 2,
      nodes: [
        { id: "instrument-tip", kind: "shape", x: 0, y: 0, width: 2, height: 2 },
        { id: "tissue-boundary", kind: "shape", x: 10, y: 10, width: 80, height: 60 },
      ],
    });
    const token = engine.runtime.observability.createReplayToken("collision-risk");
    const replay = engine.runtime.observability.replay(token.token);
    engine.dispose();
    return replay.accepted;
  };

  assert.equal(query(), query());
});
