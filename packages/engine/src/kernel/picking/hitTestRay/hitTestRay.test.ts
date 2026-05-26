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

/**
 * Verifies triangle-level ray intersection hits a triangle facing the ray.
 */
test("hitTestRay resolves triangle-level hit", () => {
  const module = createEngineHitTestRayModule();

  // Triangle in XY plane at z=0: (0,0,0), (2,0,0), (0,2,0)
  // Ray from above pointing down.
  const hit = module.hitTestRay(
    {
      originX: 0.5,
      originY: 0.5,
      originZ: 5,
      directionX: 0,
      directionY: 0,
      directionZ: -1,
    },
    [
      {
        id: "tri",
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
        minZ: -0.1,
        maxZ: 0.1,
        triangles: [
          {
            v0x: 0, v0y: 0, v0z: 0,
            v1x: 2, v1y: 0, v1z: 0,
            v2x: 0, v2y: 2, v2z: 0,
          },
        ],
      },
    ],
  );

  assert.ok(hit !== null, "triangle must be hit");
  assert.equal(hit!.id, "tri");
  assert.ok(Math.abs(hit!.distance - 5) < 0.001, `expected distance ~5, got ${hit!.distance}`);
});

/**
 * Verifies triangle ray intersection misses when ray is parallel to triangle plane.
 */
test("hitTestRay misses triangle when ray is parallel", () => {
  const module = createEngineHitTestRayModule();

  // Triangle in XY plane at z=0; ray parallel to XY plane.
  const hit = module.hitTestRay(
    {
      originX: 0.5,
      originY: 0.5,
      originZ: 1,
      directionX: 1,
      directionY: 0,
      directionZ: 0,
    },
    [
      {
        id: "tri",
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
        minZ: -0.1,
        maxZ: 0.1,
        triangles: [
          {
            v0x: 0, v0y: 0, v0z: 0,
            v1x: 2, v1y: 0, v1z: 0,
            v2x: 0, v2y: 2, v2z: 0,
          },
        ],
      },
    ],
  );

  assert.equal(hit, null);
});

/**
 * Verifies nearest triangle hit is preferred when multiple triangles in one candidate.
 */
test("hitTestRay picks nearest triangle among multiple", () => {
  const module = createEngineHitTestRayModule();

  // Two triangles at different z depths.
  const nearTri = {
    v0x: 0, v0y: 0, v0z: 3,
    v1x: 2, v1y: 0, v1z: 3,
    v2x: 0, v2y: 2, v2z: 3,
  };
  const farTri = {
    v0x: 0, v0y: 0, v0z: 0,
    v1x: 2, v1y: 0, v1z: 0,
    v2x: 0, v2y: 2, v2z: 0,
  };

  const hit = module.hitTestRay(
    {
      originX: 0.5,
      originY: 0.5,
      originZ: 5,
      directionX: 0,
      directionY: 0,
      directionZ: -1,
    },
    [
      {
        id: "multi-tri",
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
        minZ: 0,
        maxZ: 3,
        triangles: [farTri, nearTri],
      },
    ],
  );

  assert.ok(hit !== null, "candidate must be hit");
  // Near triangle at z=3 is at distance ~2 from ray at z=5.
  assert.ok(Math.abs(hit!.distance - 2) < 0.001, `expected distance ~2, got ${hit!.distance}`);
});

/**
 * Verifies triangle ray intersection misses when hit point is outside triangle barycentric bounds.
 */
test("hitTestRay misses triangle when ray passes outside", () => {
  const module = createEngineHitTestRayModule();

  // Ray from above pointing down hits outside the triangle.
  const hit = module.hitTestRay(
    {
      originX: 3,
      originY: 3,
      originZ: 5,
      directionX: 0,
      directionY: 0,
      directionZ: -1,
    },
    [
      {
        id: "tri",
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
        minZ: -0.1,
        maxZ: 0.1,
        triangles: [
          {
            v0x: 0, v0y: 0, v0z: 0,
            v1x: 2, v1y: 0, v1z: 0,
            v2x: 0, v2y: 2, v2z: 0,
          },
        ],
      },
    ],
  );

  assert.equal(hit, null);
});
