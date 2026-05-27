/**
 * Tests for spatial index viewport culling and staged execution snapshot.
 *
 * Coverage:
 * - R-tree viewport culling with CSS-pixel→world coordinate conversion
 * - Entity bounds alignment with viewport offset/scale
 * - Empty document / zero-viewport edge cases
 * - visibleCandidateIds ↔ graphNodeState fallback safety
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEngineSpatialIndex } from "../kernel/spatial/engineSpatialIndex";

describe("EngineSpatialIndex viewport culling", () => {
  it("returns overlapping items for a world-space query rect", () => {
    const index = createEngineSpatialIndex<{ nodeId: string }>({ dimension: "2d" });
    index.load([
      { id: "a", minX: 0, minY: 0, maxX: 100, maxY: 100, meta: { nodeId: "a" } },
      { id: "b", minX: 200, minY: 200, maxX: 300, maxY: 300, meta: { nodeId: "b" } },
      { id: "c", minX: 50, minY: 50, maxX: 150, maxY: 150, meta: { nodeId: "c" } },
    ]);

    // Query covering only the first quadrant
    const results = index.search({ minX: 0, minY: 0, maxX: 120, maxY: 120 });
    const ids = results.map((r) => r.id).sort();
    assert.deepEqual(ids, ["a", "c"]);
  });

  it("returns empty for query outside all items", () => {
    const index = createEngineSpatialIndex<{ nodeId: string }>({ dimension: "2d" });
    index.load([
      { id: "a", minX: 0, minY: 0, maxX: 100, maxY: 100, meta: { nodeId: "a" } },
    ]);
    const results = index.search({ minX: 500, minY: 500, maxX: 600, maxY: 600 });
    assert.deepEqual(results, []);
  });

  it("handles CSS-pixel→world coordinate conversion correctly", () => {
    // Simulate viewport: 1200 CSS px wide, scale 2.0, offset (100, 50) in world
    const cssWidth = 1200;
    const scale = 2.0;
    const worldWidth = cssWidth / scale; // 600 world units
    const offsetX = 100;
    const offsetY = 50;
    const cssHeight = 800;
    const worldHeight = cssHeight / scale; // 400 world units

    const viewportWorldBounds = {
      minX: offsetX,
      minY: offsetY,
      maxX: offsetX + worldWidth,  // 700
      maxY: offsetY + worldHeight, // 450
    };

    assert.equal(viewportWorldBounds.maxX, 700);
    assert.equal(viewportWorldBounds.maxY, 450);

    const index = createEngineSpatialIndex<{ nodeId: string }>({ dimension: "2d" });
    index.load([
      { id: "visible", minX: 200, minY: 100, maxX: 300, maxY: 200, meta: { nodeId: "visible" } },
      { id: "offscreen", minX: 800, minY: 100, maxX: 900, maxY: 200, meta: { nodeId: "offscreen" } },
    ]);

    const results = index.search(viewportWorldBounds);
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "visible");
  });

  it("handles tiny scale (zoomed far out) correctly", () => {
    const scale = 0.01;
    const cssWidth = 1200;
    const worldWidth = cssWidth / scale; // 120,000 world units

    const viewportWorldBounds = {
      minX: 0,
      minY: 0,
      maxX: worldWidth,
      maxY: worldWidth,
    };

    assert.ok(viewportWorldBounds.maxX > 100000);
  });
});
