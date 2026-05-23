import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_PLAN_FOUNDATION_API,
  resolveEngineRuntimePlanFoundationApiDescriptor,
} from "../../orchestration/runtime/plan/runtime-plan.foundation.contract";

/**
 * Verifies runtime plan foundation descriptor map keeps expected endpoint set.
 */
test("runtime plan foundation descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_PLAN_FOUNDATION_API).sort(), [
    "createBudgetPlan",
    "createFramePlan",
    "createLodPlan",
    "createRoiPlan",
    "createVisibilityPlan",
    "inspect",
  ]);
});

/**
 * Verifies runtime plan foundation descriptors keep required semantics.
 */
test("runtime plan foundation descriptors keep required semantics", () => {
  const frameDescriptor = ENGINE_RUNTIME_PLAN_FOUNDATION_API.createFramePlan;
  const inspectDescriptor = ENGINE_RUNTIME_PLAN_FOUNDATION_API.inspect;

  assert.equal(frameDescriptor.level, "foundation");
  assert.equal(frameDescriptor.stability, "beta");
  assert.deepEqual(frameDescriptor.errorCodes, ["ENGINE_PLAN_INVALID_REQUEST"]);
  assert.equal(inspectDescriptor.level, "foundation");
  assert.equal(inspectDescriptor.stability, "beta");
  assert.deepEqual(inspectDescriptor.errorCodes, ["ENGINE_PLAN_INSPECT_INVALID"]);
});

/**
 * Verifies runtime plan descriptor resolver returns canonical map entries.
 */
test("runtime plan foundation descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimePlanFoundationApiDescriptor("createFramePlan"),
    ENGINE_RUNTIME_PLAN_FOUNDATION_API.createFramePlan,
  );
  assert.deepEqual(
    resolveEngineRuntimePlanFoundationApiDescriptor("inspect"),
    ENGINE_RUNTIME_PLAN_FOUNDATION_API.inspect,
  );
});

/**
 * Verifies plan descriptor determinism text keeps explicit same-input guarantee.
 */
test("runtime plan foundation determinism statements are explicit", () => {
  for (const descriptor of Object.values(ENGINE_RUNTIME_PLAN_FOUNDATION_API)) {
    assert.equal(descriptor.determinism.includes("Same"), true);
  }
});
