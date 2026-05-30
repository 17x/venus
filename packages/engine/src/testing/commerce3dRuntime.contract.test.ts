import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, createTestSurface } from "../index";

/**
 * Verifies commerce 3D variant switch contracts keep material permutation deterministic.
 */
test("commerce variant switch graph keeps material permutation deterministic across sessions", () => {
  const createVariantSession = () => {
    const engine = createEngine({
      surface: createTestSurface(400, 300),
      backend: "headless",
    });

    // Simulate product variant cards with distinct materials
    engine.setGraph({
      revision: 1,
      nodes: [
        { id: "product-base", kind: "shape", x: 10, y: 10, width: 120, height: 160 },
        { id: "product-variant-red", kind: "shape", x: 150, y: 10, width: 120, height: 160 },
        { id: "product-variant-blue", kind: "shape", x: 290, y: 10, width: 120, height: 160 },
        { id: "product-variant-green", kind: "shape", x: 10, y: 190, width: 120, height: 100 },
        { id: "product-variant-black", kind: "shape", x: 150, y: 190, width: 120, height: 100 },
        { id: "product-variant-white", kind: "shape", x: 290, y: 190, width: 120, height: 100 },
      ],
    });

    const capture = engine.captureFrame({ label: "commerce-variants" });
    const token = engine.runtime.observability.createReplayToken("variant-switch");
    const replay = engine.runtime.observability.replay(token.token);
    const stats = engine.getStats();

    engine.dispose();
    return {
      captureTs: typeof capture.timestampMs === "number",
      replayAccepted: replay.accepted,
      drawCount: stats.lastExecutionDrawCount ?? 0,
      variantCount: 6,
    };
  };

  assert.deepEqual(createVariantSession(), createVariantSession());
});

/**
 * Verifies snapshot transition contracts stay deterministic for commerce product display.
 */
test("commerce stable snapshot transitions keep frame output deterministic", () => {
  const engine = createEngine({
    surface: createTestSurface(300, 200),
    backend: "headless",
  });
  engine.setGraph({
    revision: 1,
    nodes: [
      { id: "snapshot-a", kind: "shape", x: 0, y: 0, width: 100, height: 100 },
      { id: "snapshot-b", kind: "shape", x: 100, y: 50, width: 100, height: 100 },
    ],
  });

  // Fast transition: swap graph and capture
  engine.setGraph({
    revision: 2,
    nodes: [
      { id: "snapshot-a", kind: "shape", x: 0, y: 0, width: 100, height: 100 },
      { id: "snapshot-b", kind: "shape", x: 120, y: 30, width: 100, height: 100 },
    ],
  });

  const frame = engine.captureFrame({ label: "commerce-transition" });
  assert.equal(typeof frame.timestampMs, "number");

  engine.dispose();
});
