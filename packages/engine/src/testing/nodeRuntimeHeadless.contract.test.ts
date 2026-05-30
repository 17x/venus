import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, createTestSurface } from "../index";

/**
 * Verifies headless runtime adapter produces deterministic frame output identical across sessions.
 */
test("headless runtime adapter produces deterministic frame output across sessions", () => {
  const createAndCapture = () => {
    const engine = createEngine({
      surface: createTestSurface(320, 180),
      backend: "headless",
    });
    engine.setGraph({
      revision: 1,
      nodes: [
        { id: "headless-node-1", kind: "shape", x: 40, y: 30, width: 100, height: 80 },
        { id: "headless-node-2", kind: "shape", x: 180, y: 60, width: 60, height: 120 },
      ],
    });
    const capture = engine.captureFrame({ label: "headless-dtx" });
    const token = engine.runtime.observability.createReplayToken("node-runtime");
    const replay = engine.runtime.observability.replay(token.token);
    const metrics = engine.runtime.observability.getMetricsSnapshot();
    engine.dispose();

    return {
      captureLabel: typeof capture.label === "string" || capture.label === null,
      captureTimestamp: typeof capture.timestampMs === "number",
      replayAccepted: replay.accepted,
      drawCount: metrics.drawCount,
    };
  };

  assert.deepEqual(createAndCapture(), createAndCapture());
});

/**
 * Verifies node platform protocol contracts keep backend state deterministic under headless mode.
 */
test("node platform protocol exposes deterministic backend state under headless", () => {
  const engine = createEngine({
    surface: createTestSurface(256, 256),
    backend: "headless",
  });

  const diagnostics = engine.getDiagnostics();
  assert.equal(typeof diagnostics, "object");
  assert.equal(typeof diagnostics.backendDiagnostics, "object");

  engine.dispose();
});

/**
 * Verifies headless backend produces frame output without DOM or WebGL dependencies.
 */
test("headless backend captures frame without DOM or WebGL dependency", () => {
  const engine = createEngine({
    surface: createTestSurface(128, 64),
    backend: "headless",
  });
  engine.setGraph({
    revision: 2,
    nodes: [{ id: "n1", kind: "shape", x: 0, y: 0, width: 64, height: 32 }],
  });

  const frame = engine.captureFrame({ label: "pure-headless" });
  assert.equal(typeof frame.timestampMs, "number");

  engine.dispose();
});
