import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultCascadedShadowStrategy } from "./cascadedShadowStrategy";

test("default cascaded strategy has 3 cascades", () => {
  const strategy = createDefaultCascadedShadowStrategy();
  assert.equal(strategy.cascadeCount, 3);
  assert.equal(strategy.cascadePolicies.length, 3);
});

test("cascade resolutions decrease with distance", () => {
  const strategy = createDefaultCascadedShadowStrategy();
  assert.ok(strategy.cascadePolicies[0].mapSize > strategy.cascadePolicies[1].mapSize);
  assert.ok(strategy.cascadePolicies[1].mapSize > strategy.cascadePolicies[2].mapSize);
});
