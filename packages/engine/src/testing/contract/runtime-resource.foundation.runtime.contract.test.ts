import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_RESOURCE_FOUNDATION_API,
  resolveEngineRuntimeResourceFoundationApiDescriptor,
} from "../../orchestration/runtime/resource/runtime-resource.foundation.contract";

/**
 * Verifies runtime resource foundation descriptor map keeps expected endpoint set.
 */
test("runtime resource foundation descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_RESOURCE_FOUNDATION_API).sort(), [
    "collectGarbage",
    "getResidency",
    "pin",
    "register",
    "release",
    "unpin",
    "update",
  ]);
});

/**
 * Verifies runtime resource foundation descriptors keep required error semantics.
 */
test("runtime resource foundation descriptors keep required error semantics", () => {
  const registerDescriptor = ENGINE_RUNTIME_RESOURCE_FOUNDATION_API.register;
  const updateDescriptor = ENGINE_RUNTIME_RESOURCE_FOUNDATION_API.update;

  assert.deepEqual(registerDescriptor.errorCodes, ["ENGINE_RESOURCE_INVALID_DESCRIPTOR"]);
  assert.equal(registerDescriptor.level, "foundation");
  assert.equal(registerDescriptor.stability, "beta");
  assert.equal(updateDescriptor.errorCodes.includes("ENGINE_RESOURCE_NOT_FOUND"), true);
});

/**
 * Verifies runtime resource descriptor resolver returns canonical map entries.
 */
test("runtime resource foundation descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeResourceFoundationApiDescriptor("register"),
    ENGINE_RUNTIME_RESOURCE_FOUNDATION_API.register,
  );
  assert.deepEqual(
    resolveEngineRuntimeResourceFoundationApiDescriptor("collectGarbage"),
    ENGINE_RUNTIME_RESOURCE_FOUNDATION_API.collectGarbage,
  );
});

/**
 * Verifies resource descriptor determinism text keeps explicit same-input guarantee.
 */
test("runtime resource foundation determinism statements are explicit", () => {
  for (const descriptor of Object.values(ENGINE_RUNTIME_RESOURCE_FOUNDATION_API)) {
    assert.equal(descriptor.determinism.includes("Same"), true);
  }
});
