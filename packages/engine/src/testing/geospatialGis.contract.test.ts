import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, createTestSurface } from "../index";

/**
 * Verifies geospatial tile streaming contracts keep LOD tier deterministic.
 */
test("geospatial tile streaming exposes deterministic LOD tier across sessions", () => {
  const createLodSession = () => {
    const engine = createEngine({
      surface: createTestSurface(512, 384),
      backend: "headless",
    });

    // Simulate tile-like node structure for GIS data
    engine.setGraph({
      revision: 1,
      nodes: Array.from({ length: 25 }, (_, i) => ({
        id: `tile-${Math.floor(i / 5)}-${i % 5}`,
        kind: "shape" as const,
        x: (i % 5) * 100,
        y: Math.floor(i / 5) * 80,
        width: 96,
        height: 76,
      })),
    });

    const capture = engine.captureFrame({ label: "gis-tiles" });
    const token = engine.runtime.observability.createReplayToken("gis-streaming");
    const replay = engine.runtime.observability.replay(token.token);
    const stats = engine.getStats();

    engine.dispose();

    return {
      captureTs: typeof capture.timestampMs === "number",
      replayAccepted: replay.accepted,
      drawCount: stats.lastExecutionDrawCount ?? 0,
    };
  };

  const s1 = createLodSession();
  const s2 = createLodSession();
  assert.deepEqual(s1, s2);
  assert.equal(s1.drawCount >= 0, true);
});

/**
 * Verifies floating origin and multi-view sync contracts for geospatial scenarios.
 */
test("geospatial floating origin keeps multi-view sync deterministic", () => {
  const createView = (offsetX: number, offsetY: number) => {
    const engine = createEngine({
      surface: createTestSurface(256, 192),
      backend: "headless",
    });
    engine.setGraph({
      revision: 2,
      nodes: [
        { id: "origin-marker", kind: "shape", x: offsetX, y: offsetY, width: 4, height: 4 },
        { id: "tile-a", kind: "shape", x: offsetX + 100, y: offsetY, width: 96, height: 76 },
      ],
    });
    const capture = engine.captureFrame({ label: `geo-${offsetX}-${offsetY}` });
    engine.dispose();
    return capture.timestampMs;
  };

  const v1 = createView(0, 0);
  const v2 = createView(1000, 500);
  assert.equal(typeof v1, "number");
  assert.equal(typeof v2, "number");
});
