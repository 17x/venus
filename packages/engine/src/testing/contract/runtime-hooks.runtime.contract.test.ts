import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_HOOKS_API,
  resolveEngineRuntimeHooksApiDescriptor,
} from "../../runtime/hooks/runtime-hooks.contract";

/**
 * Verifies runtime hooks descriptor map keeps expected endpoint set.
 */
test("runtime hooks descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_HOOKS_API).sort(), [
    "afterCompile",
    "afterRenderPlan",
    "afterSubmit",
    "beforeCompile",
    "beforeRenderPlan",
    "beforeSubmit",
    "getStats",
    "offAll",
  ]);
});

/**
 * Verifies runtime hooks descriptors keep required error semantics.
 */
test("runtime hooks descriptors keep required error semantics", () => {
  const beforeCompileDescriptor = ENGINE_RUNTIME_HOOKS_API.beforeCompile;
  const getStatsDescriptor = ENGINE_RUNTIME_HOOKS_API.getStats;

  assert.deepEqual(beforeCompileDescriptor.errorCodes, ["ENGINE_HOOKS_INVALID_LISTENER"]);
  assert.deepEqual(getStatsDescriptor.errorCodes, []);
  assert.equal(beforeCompileDescriptor.level, "developer");
  assert.equal(beforeCompileDescriptor.stability, "beta");
});

/**
 * Verifies runtime hooks descriptor resolver returns canonical map entries.
 */
test("runtime hooks descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeHooksApiDescriptor("beforeCompile"),
    ENGINE_RUNTIME_HOOKS_API.beforeCompile,
  );
  assert.deepEqual(
    resolveEngineRuntimeHooksApiDescriptor("afterCompile"),
    ENGINE_RUNTIME_HOOKS_API.afterCompile,
  );
  assert.deepEqual(
    resolveEngineRuntimeHooksApiDescriptor("beforeRenderPlan"),
    ENGINE_RUNTIME_HOOKS_API.beforeRenderPlan,
  );
  assert.deepEqual(
    resolveEngineRuntimeHooksApiDescriptor("afterRenderPlan"),
    ENGINE_RUNTIME_HOOKS_API.afterRenderPlan,
  );
  assert.deepEqual(
    resolveEngineRuntimeHooksApiDescriptor("beforeSubmit"),
    ENGINE_RUNTIME_HOOKS_API.beforeSubmit,
  );
  assert.deepEqual(
    resolveEngineRuntimeHooksApiDescriptor("afterSubmit"),
    ENGINE_RUNTIME_HOOKS_API.afterSubmit,
  );
  assert.deepEqual(
    resolveEngineRuntimeHooksApiDescriptor("offAll"),
    ENGINE_RUNTIME_HOOKS_API.offAll,
  );
  assert.deepEqual(
    resolveEngineRuntimeHooksApiDescriptor("getStats"),
    ENGINE_RUNTIME_HOOKS_API.getStats,
  );
});
