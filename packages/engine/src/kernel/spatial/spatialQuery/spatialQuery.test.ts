import assert from "node:assert/strict";
import test from "node:test";

import { createEngineSpatialQueryModule } from "./spatialQuery";

/**
 * Verifies spatial-query module resolves viewport candidate ids by bounds intersection.
 */
test("spatialQuery module resolves viewport candidates", () => {
  const module = createEngineSpatialQueryModule();
  const ids = module.queryViewportCandidates(
    [
      { id: "node-a", x: 0, y: 0, width: 10, height: 10 },
      { id: "node-b", x: 20, y: 20, width: 10, height: 10 },
    ],
    { x: 0, y: 0, width: 12, height: 12 },
  );

  assert.deepEqual(ids, ["node-a"]);
});

/**
 * Verifies spatial-query module resolves frustum-visible result payload with deterministic node ids.
 */
test("spatialQuery module resolves frustum-visible set", () => {
  const module = createEngineSpatialQueryModule();
  const result = module.queryFrustumVisibleSet(
    [
      { id: "node-b", x: 5, y: 5, width: 10, height: 10 },
      { id: "node-a", x: 4, y: 4, width: 10, height: 10 },
    ],
    { x: 0, y: 0, width: 20, height: 20 },
  );

  assert.deepEqual(result.nodeIds, ["node-a", "node-b"]);
});

/**
 * Verifies point-candidate query applies tolerance window and stable distance ordering.
 */
test("spatialQuery module resolves point candidates with deterministic ranking", () => {
  const module = createEngineSpatialQueryModule();
  const ids = module.queryPointCandidates(
    [
      { id: "node-c", x: 15, y: 0, width: 8, height: 8 },
      { id: "node-a", x: 0, y: 0, width: 8, height: 8 },
      { id: "node-b", x: 6, y: 0, width: 8, height: 8 },
    ],
    { x: 8, y: 4 },
    10,
  );

  assert.deepEqual(ids, ["node-b", "node-a", "node-c"]);
});
