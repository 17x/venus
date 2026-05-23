import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../../index";

/**
 * Builds deterministic graph payload for stress testing runtime graph ingestion and rendering path.
 * @param count Number of nodes to include in generated graph.
 */
function createStressGraph(count: number): {
  revision: number;
  nodes: Array<{
    id: string;
    kind: "shape";
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    depth: number;
  }>;
} {
  const nodes = Array.from({ length: count }).map((_, index) => ({
    id: `stress-node-${index}`,
    kind: "shape" as const,
    x: (index % 250) * 10,
    y: Math.floor(index / 250) * 10,
    z: 0,
    width: 8,
    height: 8,
    depth: 1,
  }));
  return {
    revision: 1,
    nodes,
  };
}

/**
 * Verifies runtime can ingest and render dense stress graph without throwing.
 */
test("stress runtime handles dense graph ingestion and render", async () => {
  const engine = createEngine({
    surface: createTestSurface(1920, 1080),
    runtimeAdapter: {
      requestFrame: () => 1,
      cancelFrame: () => {},
      now: () => 0,
    },
  });

  await engine.ready();
  engine.setGraph(createStressGraph(20000));

  const query = engine.query({ x: 0, y: 0, width: 3000, height: 1200 });
  const render = await engine.render();

  assert.equal(query.nodeIds.length > 0, true);
  assert.equal(render.drawCount >= 0, true);
  assert.equal(render.visibleCount >= 0, true);

  engine.dispose();
});
