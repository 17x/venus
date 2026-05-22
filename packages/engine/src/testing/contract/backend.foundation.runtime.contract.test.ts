import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_BACKEND_FOUNDATION_API,
  resolveEngineRuntimeBackendFoundationApiDescriptor,
} from "../../runtime/backend/backend.foundation.contract";
import {
  createDefaultEngineBackendProbes,
  resolveBackendSelection,
} from "../../backend/backendSelector";

/**
 * Verifies runtime backend foundation API descriptor map keeps expected endpoint set.
 */
test("runtime backend foundation descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_BACKEND_FOUNDATION_API).sort(), [
    "getActive",
    "getCapabilities",
    "getFallbackTrace",
    "getLimits",
    "listAvailable",
    "probeHeadless",
    "select",
  ]);
});

/**
 * Verifies runtime backend foundation descriptors carry required error semantics.
 */
test("runtime backend foundation descriptors keep required error codes", () => {
  assert.deepEqual(ENGINE_RUNTIME_BACKEND_FOUNDATION_API.listAvailable.errorCodes, [
    "ENGINE_BACKEND_PROBE_FAILED",
  ]);
  assert.deepEqual(ENGINE_RUNTIME_BACKEND_FOUNDATION_API.getActive.errorCodes, [
    "ENGINE_BACKEND_UNAVAILABLE",
  ]);
  assert.deepEqual(ENGINE_RUNTIME_BACKEND_FOUNDATION_API.getFallbackTrace.errorCodes, [
    "ENGINE_BACKEND_PROBE_FAILED",
  ]);
});

/**
 * Verifies backend descriptor resolver returns canonical descriptors by map key.
 */
test("runtime backend foundation descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeBackendFoundationApiDescriptor("listAvailable"),
    ENGINE_RUNTIME_BACKEND_FOUNDATION_API.listAvailable,
  );
  assert.deepEqual(
    resolveEngineRuntimeBackendFoundationApiDescriptor("select"),
    ENGINE_RUNTIME_BACKEND_FOUNDATION_API.select,
  );
  assert.deepEqual(
    resolveEngineRuntimeBackendFoundationApiDescriptor("getActive"),
    ENGINE_RUNTIME_BACKEND_FOUNDATION_API.getActive,
  );
  assert.deepEqual(
    resolveEngineRuntimeBackendFoundationApiDescriptor("getCapabilities"),
    ENGINE_RUNTIME_BACKEND_FOUNDATION_API.getCapabilities,
  );
  assert.deepEqual(
    resolveEngineRuntimeBackendFoundationApiDescriptor("getLimits"),
    ENGINE_RUNTIME_BACKEND_FOUNDATION_API.getLimits,
  );
  assert.deepEqual(
    resolveEngineRuntimeBackendFoundationApiDescriptor("getFallbackTrace"),
    ENGINE_RUNTIME_BACKEND_FOUNDATION_API.getFallbackTrace,
  );
  assert.deepEqual(
    resolveEngineRuntimeBackendFoundationApiDescriptor("probeHeadless"),
    ENGINE_RUNTIME_BACKEND_FOUNDATION_API.probeHeadless,
  );
});

/**
 * Verifies backend availability and fallback trace semantics remain deterministic.
 */
test("runtime backend availability and fallback trace semantics remain stable", () => {
  const probes = createDefaultEngineBackendProbes();
  const available = probes.map((probe) => probe.mode);
  const selection = resolveBackendSelection({
    surface: {
      width: 320,
      height: 180,
    },
    backend: "auto",
  }, probes);

  assert.equal(available.includes(selection.resolved), true);
  assert.equal(selection.requested, "auto");
  assert.equal(typeof selection.fallbackReason, "string");
});
