import assert from "node:assert/strict";
import test from "node:test";

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
