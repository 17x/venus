import assert from "node:assert/strict";
import test from "node:test";

import { deriveCameraFrustum } from "../kernel/interaction/camera/cameraFrustum";
import { createEngineSpatialQueryModule } from "../kernel/spatial/spatialQuery/spatialQuery";

/**
 * Verifies canonical spatial query module resolves deterministic viewport and frustum ids.
 */
test("spatial query module deterministic ids", () => {
  const module = createEngineSpatialQueryModule();
  const nodes = [
    { id: "node-c", x: 30, y: 0, width: 10, height: 10 },
    { id: "node-a", x: 0, y: 0, width: 10, height: 10 },
    { id: "node-b", x: 5, y: 5, width: 10, height: 10 },
  ];

  const viewportIds = module.queryViewportCandidates(nodes, {
    x: 0,
    y: 0,
    width: 15,
    height: 15,
  });
  const frustum = module.queryFrustumVisibleSet(nodes, {
    x: 0,
    y: 0,
    width: 15,
    height: 15,
  });

  assert.deepEqual(viewportIds, ["node-a", "node-b"]);
  assert.deepEqual(frustum.nodeIds, ["node-a", "node-b"]);
});

/**
 * Verifies dense overlapping query candidates are sorted deterministically by id.
 */
test("spatial query module keeps dense overlapping results deterministic", () => {
  const module = createEngineSpatialQueryModule();
  const nodes = Array.from({ length: 24 }, (_, index) => ({
    id: `node-${String(24 - index).padStart(2, "0")}`,
    x: index % 3,
    y: index % 4,
    width: 8,
    height: 8,
  }));

  const resultA = module.queryViewportCandidates(nodes, { x: 0, y: 0, width: 16, height: 16 });
  const resultB = module.queryViewportCandidates(nodes.slice().reverse(), { x: 0, y: 0, width: 16, height: 16 });

  assert.deepEqual(resultA, resultB);
  assert.deepEqual(resultA, resultA.slice().sort((left, right) => left.localeCompare(right)));
});

/**
 * Verifies point queries break equal-distance candidates by id for stable picking.
 */
test("spatial query module point candidates break ties by id", () => {
  const module = createEngineSpatialQueryModule();
  const nodes = [
    { id: "right", x: 12, y: 8, width: 4, height: 4 },
    { id: "left", x: 4, y: 8, width: 4, height: 4 },
  ];

  assert.deepEqual(module.queryPointCandidates(nodes, { x: 10, y: 10 }, 8), ["left", "right"]);
});

/**
 * Verifies 3D frustum queries filter depth-aware nodes while preserving deterministic id order.
 */
test("spatial query module filters depth-aware nodes by camera frustum", () => {
  const module = createEngineSpatialQueryModule();
  const frustum = deriveCameraFrustum({
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    distance: 100,
    yaw: 0,
    pitch: 0,
    projectionMode: "perspective",
    perspectiveFovY: 60,
    near: 1,
    far: 150,
  }, 1);
  const nodes = [
    { id: "visible-b", x: 0, y: 0, z: 0, width: 8, height: 8, depth: 8 },
    { id: "behind-camera", x: 0, y: 0, z: 160, width: 8, height: 8, depth: 8 },
    { id: "visible-a", x: -10, y: -10, z: -20, width: 8, height: 8, depth: 8 },
  ];

  const result = module.queryFrustumVisibleSet(nodes, { x: -32, y: -32, width: 96, height: 96 }, frustum);

  assert.deepEqual(result.nodeIds, ["visible-a", "visible-b"]);
});
