import assert from "node:assert/strict";
import test from "node:test";

import type {
  EngineGraphNodeInput,
  EngineMeshPrimitiveInput,
} from "../orchestration/api/public-types/core-foundation.types";

/**
 * Verifies graph nodes accept explicit mesh primitive payload contracts.
 */
test("graph node contract accepts mesh primitive payload", () => {
  const mesh: EngineMeshPrimitiveInput = {
    topology: "triangles",
    positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    indices: [0, 1, 2],
    color: "#22c55e",
  };
  const node: EngineGraphNodeInput = {
    id: "node-mesh-contract",
    mesh,
  };

  assert.equal(node.mesh?.positions.length, 9);
  assert.deepEqual(node.mesh?.indices, [0, 1, 2]);
  assert.equal(node.mesh?.topology, "triangles");
});

/**
 * Verifies mesh primitive contract keeps indices optional for non-indexed triangle streams.
 */
test("mesh primitive contract keeps indices optional", () => {
  const mesh: EngineMeshPrimitiveInput = {
    positions: [0, 0, 0, 2, 0, 0, 0, 2, 0],
  };

  assert.equal(Array.isArray(mesh.indices), false);
  assert.equal(mesh.positions.length, 9);
});

/**
 * Verifies mesh primitive contract accepts non-triangle topology tokens for staged parity negotiation.
 */
test("mesh primitive contract accepts topology tokens", () => {
  const lineMesh: EngineMeshPrimitiveInput = {
    topology: "lines",
    positions: [0, 0, 0, 10, 0, 0],
  };

  assert.equal(lineMesh.topology, "lines");
});
