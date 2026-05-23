import assert from "node:assert/strict";
import test from "node:test";

import { createEngineHitTestRayModule } from "./hitTestRay";

/**
 * Verifies ray hit-test module returns nearest candidate hit.
 */
test("hitTestRay module resolves nearest hit", () => {
  const module = createEngineHitTestRayModule();
  const hit = module.hitTestRay(
    {
      originX: 0,
      originY: 0,
      originZ: 10,
      directionX: 0,
      directionY: 0,
      directionZ: -1,
    },
    [
      {
        id: "far",
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: 0,
        maxZ: 2,
      },
      {
        id: "near",
        minX: -1,
        maxX: 1,
        minY: -1,
        maxY: 1,
        minZ: 6,
        maxZ: 8,
      },
    ],
  );

  assert.equal(hit?.id, "near");
});

/**
 * Verifies ray hit-test module returns null when no candidate intersects.
 */
test("hitTestRay module returns null when no hit", () => {
  const module = createEngineHitTestRayModule();
  const hit = module.hitTestRay(
    {
      originX: 0,
      originY: 0,
      originZ: 10,
      directionX: 1,
      directionY: 0,
      directionZ: 0,
    },
    [
      {
        id: "box",
        minX: -2,
        maxX: -1,
        minY: -1,
        maxY: 1,
        minZ: 0,
        maxZ: 2,
      },
    ],
  );

  assert.equal(hit, null);
});
