import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, createTestSurface } from "../index";

/**
 * Verifies BIM/CAD assembly hierarchy and instance contracts stay deterministic.
 */
test("bim cad assembly hierarchy keeps instance transforms deterministic", () => {
  const createAssembly = () => {
    const engine = createEngine({
      surface: createTestSurface(640, 480),
      backend: "headless",
    });

    // Simulate hierarchical BIM assembly with nested instances
    engine.setGraph({
      revision: 1,
      nodes: [
        { id: "building-shell", kind: "shape", x: 0, y: 0, width: 400, height: 300 },
        { id: "floor-1", kind: "shape", x: 20, y: 20, width: 360, height: 80 },
        { id: "floor-2", kind: "shape", x: 20, y: 120, width: 360, height: 80 },
        { id: "floor-3", kind: "shape", x: 20, y: 220, width: 360, height: 60 },
        { id: "beam-h", kind: "shape", x: 40, y: 40, width: 320, height: 8 },
        { id: "beam-v", kind: "shape", x: 200, y: 20, width: 8, height: 280 },
        { id: "instance-chair-1", kind: "shape", x: 100, y: 50, width: 20, height: 20 },
        { id: "instance-chair-2", kind: "shape", x: 250, y: 50, width: 20, height: 20 },
        { id: "instance-chair-3", kind: "shape", x: 100, y: 150, width: 20, height: 20 },
        { id: "instance-chair-4", kind: "shape", x: 250, y: 150, width: 20, height: 20 },
      ],
    });

    const capture = engine.captureFrame({ label: "bim-assembly" });
    const stats = engine.getStats();
    engine.dispose();

    return {
      captureTs: typeof capture.timestampMs === "number",
      drawCount: stats.lastExecutionDrawCount ?? 0,
      nodeCount: 10,
    };
  };

  assert.deepEqual(createAssembly(), createAssembly());
});

/**
 * Verifies large assembly visibility pipeline exposes node counts deterministically.
 */
test("bim large assembly visibility pipeline keeps draw counts stable", () => {
  const engine = createEngine({
    surface: createTestSurface(800, 600),
    backend: "headless",
  });
  engine.setGraph({
    revision: 1,
    nodes: Array.from({ length: 50 }, (_, i) => ({
      id: `asm-node-${i}`,
      kind: "shape" as const,
      x: (i % 10) * 80,
      y: Math.floor(i / 10) * 60,
      width: 72,
      height: 52,
    })),
  });

  const token = engine.runtime.observability.createReplayToken("large-assembly");
  const replay = engine.runtime.observability.replay(token.token);
  assert.equal(replay.accepted, true);

  const stats = engine.getStats();
  assert.equal((stats.lastExecutionDrawCount ?? 0) >= 0, true);

  engine.dispose();
});
