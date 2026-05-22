import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_POLICY_API,
  resolveEngineRuntimePolicyApiDescriptor,
} from "../../runtime/policy/runtime-policy.contract";

/**
 * Verifies runtime policy descriptor map keeps expected endpoint set.
 */
test("runtime policy descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_POLICY_API).sort(), [
    "getEffectivePolicy",
    "setFallbackPolicy",
    "setRenderPolicy",
    "setResourcePolicy",
  ]);
});

/**
 * Verifies runtime policy descriptors keep required error semantics.
 */
test("runtime policy descriptors keep required error semantics", () => {
  const renderDescriptor = ENGINE_RUNTIME_POLICY_API.setRenderPolicy;
  const fallbackDescriptor = ENGINE_RUNTIME_POLICY_API.setFallbackPolicy;

  assert.deepEqual(renderDescriptor.errorCodes, [
    "ENGINE_POLICY_INVALID_INPUT",
    "ENGINE_POLICY_CONFLICT",
  ]);
  assert.deepEqual(fallbackDescriptor.errorCodes, [
    "ENGINE_POLICY_INVALID_INPUT",
    "ENGINE_POLICY_CONFLICT",
  ]);
  assert.equal(renderDescriptor.level, "developer");
  assert.equal(renderDescriptor.stability, "beta");
});

/**
 * Verifies runtime policy descriptor resolver returns canonical map entries.
 */
test("runtime policy descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimePolicyApiDescriptor("setRenderPolicy"),
    ENGINE_RUNTIME_POLICY_API.setRenderPolicy,
  );
  assert.deepEqual(
    resolveEngineRuntimePolicyApiDescriptor("setResourcePolicy"),
    ENGINE_RUNTIME_POLICY_API.setResourcePolicy,
  );
  assert.deepEqual(
    resolveEngineRuntimePolicyApiDescriptor("setFallbackPolicy"),
    ENGINE_RUNTIME_POLICY_API.setFallbackPolicy,
  );
  assert.deepEqual(
    resolveEngineRuntimePolicyApiDescriptor("getEffectivePolicy"),
    ENGINE_RUNTIME_POLICY_API.getEffectivePolicy,
  );
});
