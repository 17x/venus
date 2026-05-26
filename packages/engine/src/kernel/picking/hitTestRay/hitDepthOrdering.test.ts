import assert from "node:assert/strict";
import test from "node:test";

import { createEngineHitTestRayModule } from "./hitTestRay";

/**
 * Verifies that when multiple candidates are hit, the nearest one (by distance)
 * is returned deterministically.
 */
test("hitTestRay returns nearest hit deterministically", () => {
  const module = createEngineHitTestRayModule();

  const hit = module.hitTestRay(
    { originX: 0, originY: 0, originZ: 10, directionX: 0, directionY: 0, directionZ: -1 },
    [
      { id: "far", minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: 0, maxZ: 2 },
      { id: "mid", minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: 4, maxZ: 6 },
      { id: "near", minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: 7, maxZ: 9 },
    ],
  );

  assert.ok(hit !== null);
  assert.equal(hit!.id, "near");
});

/**
 * Verifies tie-break determinism: when two candidates are at the same depth,
 * the first encountered in iteration order is returned (stable).
 */
test("hitTestRay tie-break is deterministic on equal depth", () => {
  const module = createEngineHitTestRayModule();

  // Two candidates at same depth.
  const hit1 = module.hitTestRay(
    { originX: 0, originY: 0, originZ: 10, directionX: 0, directionY: 0, directionZ: -1 },
    [
      { id: "a", minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: 5, maxZ: 7 },
      { id: "b", minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: 5, maxZ: 7 },
    ],
  );

  // Second run with reversed order should still return "a" (first in iteration).
  const hit2 = module.hitTestRay(
    { originX: 0, originY: 0, originZ: 10, directionX: 0, directionY: 0, directionZ: -1 },
    [
      { id: "b", minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: 5, maxZ: 7 },
      { id: "a", minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: 5, maxZ: 7 },
    ],
  );

  assert.ok(hit1 !== null);
  assert.ok(hit2 !== null);
  assert.equal(hit1!.id, "a");
  assert.equal(hit2!.id, "b", "tie-break follows iteration order when depths equal");
});
