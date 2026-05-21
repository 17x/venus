import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_DIRTY_FOUNDATION_API,
  resolveEngineRuntimeDirtyFoundationApiDescriptor,
} from "../../runtime/dirty/dirty.foundation.contract";

/**
 * Verifies runtime dirty foundation API descriptor map keeps expected endpoint set.
 */
test("runtime dirty foundation descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_DIRTY_FOUNDATION_API).sort(), [
    "flush",
    "getPendingDomains",
    "getState",
    "mark",
    "markBatch",
    "reset",
  ]);
});

/**
 * Verifies runtime dirty foundation mark descriptor carries required error semantics.
 */
test("runtime dirty foundation mark keeps required error code", () => {
  const descriptor = ENGINE_RUNTIME_DIRTY_FOUNDATION_API.mark;

  assert.deepEqual(descriptor.errorCodes, ["ENGINE_DIRTY_INVALID_DOMAIN"]);
  assert.equal(descriptor.level, "foundation");
  assert.equal(descriptor.stability, "beta");
  assert.equal(descriptor.determinism.length > 0, true);
});

/**
 * Verifies descriptor resolver returns canonical descriptors by map key.
 */
test("runtime dirty foundation descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeDirtyFoundationApiDescriptor("getState"),
    ENGINE_RUNTIME_DIRTY_FOUNDATION_API.getState,
  );
  assert.deepEqual(
    resolveEngineRuntimeDirtyFoundationApiDescriptor("mark"),
    ENGINE_RUNTIME_DIRTY_FOUNDATION_API.mark,
  );
  assert.deepEqual(
    resolveEngineRuntimeDirtyFoundationApiDescriptor("markBatch"),
    ENGINE_RUNTIME_DIRTY_FOUNDATION_API.markBatch,
  );
  assert.deepEqual(
    resolveEngineRuntimeDirtyFoundationApiDescriptor("getPendingDomains"),
    ENGINE_RUNTIME_DIRTY_FOUNDATION_API.getPendingDomains,
  );
  assert.deepEqual(
    resolveEngineRuntimeDirtyFoundationApiDescriptor("flush"),
    ENGINE_RUNTIME_DIRTY_FOUNDATION_API.flush,
  );
  assert.deepEqual(
    resolveEngineRuntimeDirtyFoundationApiDescriptor("reset"),
    ENGINE_RUNTIME_DIRTY_FOUNDATION_API.reset,
  );
});
