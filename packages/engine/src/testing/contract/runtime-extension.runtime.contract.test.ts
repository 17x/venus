import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_EXTENSION_API,
  resolveEngineRuntimeExtensionApiDescriptor,
} from "../../runtime/extension/runtime-extension.contract";

/**
 * Verifies runtime extension descriptor map keeps expected endpoint set.
 */
test("runtime extension descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_EXTENSION_API).sort(), [
    "getState",
    "list",
    "register",
    "unregister",
  ]);
});

/**
 * Verifies runtime extension descriptors keep required error semantics.
 */
test("runtime extension descriptors keep required error semantics", () => {
  const registerDescriptor = ENGINE_RUNTIME_EXTENSION_API.register;
  const getStateDescriptor = ENGINE_RUNTIME_EXTENSION_API.getState;

  assert.deepEqual(registerDescriptor.errorCodes, [
    "ENGINE_EXTENSION_INVALID_PLUGIN",
    "ENGINE_EXTENSION_DUPLICATE_PLUGIN",
  ]);
  assert.deepEqual(getStateDescriptor.errorCodes, ["ENGINE_EXTENSION_NOT_FOUND"]);
  assert.equal(registerDescriptor.level, "developer");
  assert.equal(registerDescriptor.stability, "beta");
});

/**
 * Verifies runtime extension descriptor resolver returns canonical map entries.
 */
test("runtime extension descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeExtensionApiDescriptor("register"),
    ENGINE_RUNTIME_EXTENSION_API.register,
  );
  assert.deepEqual(
    resolveEngineRuntimeExtensionApiDescriptor("unregister"),
    ENGINE_RUNTIME_EXTENSION_API.unregister,
  );
  assert.deepEqual(
    resolveEngineRuntimeExtensionApiDescriptor("list"),
    ENGINE_RUNTIME_EXTENSION_API.list,
  );
  assert.deepEqual(
    resolveEngineRuntimeExtensionApiDescriptor("getState"),
    ENGINE_RUNTIME_EXTENSION_API.getState,
  );
});
