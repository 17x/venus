import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_CACHE_API,
  resolveEngineRuntimeCacheApiDescriptor,
} from "../../orchestration/runtime/cache/runtime-cache.contract";

/**
 * Verifies runtime cache descriptor map keeps expected endpoint set.
 */
test("runtime cache descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_CACHE_API).sort(), [
    "get",
    "getStats",
    "invalidate",
    "invalidateByTag",
    "set",
  ]);
});

/**
 * Verifies runtime cache descriptors keep required error semantics.
 */
test("runtime cache descriptors keep required error semantics", () => {
  const getDescriptor = ENGINE_RUNTIME_CACHE_API.get;
  const invalidateTagDescriptor = ENGINE_RUNTIME_CACHE_API.invalidateByTag;

  assert.deepEqual(getDescriptor.errorCodes, [
    "ENGINE_CACHE_INVALID_NAMESPACE",
    "ENGINE_CACHE_INVALID_KEY",
  ]);
  assert.deepEqual(invalidateTagDescriptor.errorCodes, ["ENGINE_CACHE_INVALID_TAG"]);
  assert.equal(getDescriptor.level, "developer");
  assert.equal(getDescriptor.stability, "beta");
});

/**
 * Verifies runtime cache descriptor resolver returns canonical map entries.
 */
test("runtime cache descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeCacheApiDescriptor("get"),
    ENGINE_RUNTIME_CACHE_API.get,
  );
  assert.deepEqual(
    resolveEngineRuntimeCacheApiDescriptor("set"),
    ENGINE_RUNTIME_CACHE_API.set,
  );
  assert.deepEqual(
    resolveEngineRuntimeCacheApiDescriptor("invalidate"),
    ENGINE_RUNTIME_CACHE_API.invalidate,
  );
  assert.deepEqual(
    resolveEngineRuntimeCacheApiDescriptor("invalidateByTag"),
    ENGINE_RUNTIME_CACHE_API.invalidateByTag,
  );
  assert.deepEqual(
    resolveEngineRuntimeCacheApiDescriptor("getStats"),
    ENGINE_RUNTIME_CACHE_API.getStats,
  );
});
