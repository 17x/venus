/**
 * Tests for the EngineBvh (BVH) spatial index introduced alongside RBush3D.
 *
 * Coverage:
 * - BVH construction with varying primitive counts
 * - AABB ray intersection (slab method)
 * - raycastClosest correctness
 * - 2D vs 3D dimension modes
 * - Empty BVH edge cases
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEngineBvh } from "../kernel/spatial/bvh";
import type { BvhPrimitive, BvhAABB } from "../kernel/spatial/bvh";

/** Creates one test AABB centered at (cx, cy, cz) with half-size (hs). */
function makeAABB(cx: number, cy: number, cz: number, hs: number): BvhAABB {
  return { minX: cx - hs, minY: cy - hs, minZ: cz - hs, maxX: cx + hs, maxY: cy + hs, maxZ: cz + hs };
}

/** Creates one test primitive. */
function makePrimitive(id: string, cx: number, cy: number, cz: number, hs: number): BvhPrimitive {
  return { aabb: makeAABB(cx, cy, cz, hs), id, meta: {} };
}

describe("EngineBvh construction", () => {
  it("builds an empty BVH without errors", () => {
    const bvh = createEngineBvh({ dimension: "3d" });
    bvh.build([]);
    assert.equal(bvh.getPrimitiveCount(), 0);
    assert.equal(bvh.getNodeCount(), 0);
  });

  it("builds a single-primitive BVH as one leaf node", () => {
    const bvh = createEngineBvh({ dimension: "3d" });
    bvh.build([makePrimitive("a", 0, 0, 0, 10)]);
    assert.equal(bvh.getPrimitiveCount(), 1);
    // Single primitive under MIN_LEAF_PRIMITIVES (4) → leaf node
    assert.ok(bvh.getNodeCount() >= 1);
  });

  it("builds a multi-primitive BVH with internal nodes", () => {
    const bvh = createEngineBvh({ dimension: "3d" });
    const primitives: BvhPrimitive[] = [];
    for (let i = 0; i < 20; i++) {
      primitives.push(makePrimitive(`p${i}`, i * 100, 0, 0, 25));
    }
    bvh.build(primitives);
    assert.equal(bvh.getPrimitiveCount(), 20);
    // Should have internal nodes + leaf nodes
    assert.ok(bvh.getNodeCount() > 1);
  });
});

describe("EngineBvh raycastClosest", () => {
  it("returns null for empty BVH", () => {
    const bvh = createEngineBvh({ dimension: "3d" });
    bvh.build([]);
    const result = bvh.raycastClosest({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    assert.equal(result, null);
  });

  it("finds the closest primitive along a ray", () => {
    const bvh = createEngineBvh({ dimension: "3d" });
    bvh.build([
      makePrimitive("near", 50, 0, 0, 10),
      makePrimitive("far", 200, 0, 0, 10),
    ]);
    const result = bvh.raycastClosest({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    assert.ok(result !== null);
    assert.equal(result!.id, "near");
  });

  it("returns null when ray misses all primitives", () => {
    const bvh = createEngineBvh({ dimension: "3d" });
    bvh.build([makePrimitive("p", 100, 100, 0, 10)]);
    // Ray goes along negative X, away from the primitive at +X
    const result = bvh.raycastClosest({ x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 });
    assert.equal(result, null);
  });

  it("works in 2D mode (Z axis excluded from splitting)", () => {
    const bvh2d = createEngineBvh({ dimension: "2d" });
    bvh2d.build([
      makePrimitive("a", 10, 20, 0, 5),
      makePrimitive("b", 80, 60, 0, 5),
    ]);
    assert.equal(bvh2d.getPrimitiveCount(), 2);
    const result = bvh2d.raycastClosest({ x: 0, y: 0, z: 0 }, { x: 0.7, y: 0.7, z: 0 });
    assert.ok(result !== null);
    assert.equal(result!.id, "a");
  });
});

describe("EngineBvh raycast", () => {
  it("returns all primitives for a basic raycast call", () => {
    const bvh = createEngineBvh({ dimension: "3d" });
    bvh.build([
      makePrimitive("a", 0, 0, 0, 10),
      makePrimitive("b", 50, 0, 0, 10),
    ]);
    const results = bvh.raycast(
      { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 },
      { minX: 1, minY: 0, minZ: 0, maxX: 1, maxY: 0, maxZ: 0 },
    );
    assert.equal(results.length, 2);
  });
});
