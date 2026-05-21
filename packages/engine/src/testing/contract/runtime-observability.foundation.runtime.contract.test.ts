import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API,
  resolveEngineRuntimeObservabilityFoundationApiDescriptor,
} from "../../runtime/observability/runtime-observability.foundation.contract";

/**
 * Verifies runtime observability foundation descriptor map keeps expected endpoint set.
 */
test("runtime observability foundation descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API).sort(), [
    "captureFrame",
    "createReplayToken",
    "getMetricsSnapshot",
    "getTrace",
    "replay",
    "startTrace",
    "stopTrace",
  ]);
});

/**
 * Verifies runtime observability foundation descriptors keep required error semantics.
 */
test("runtime observability foundation descriptors keep required error semantics", () => {
  const startDescriptor = ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API.startTrace;
  const stopDescriptor = ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API.stopTrace;

  assert.equal(startDescriptor.level, "foundation");
  assert.equal(startDescriptor.stability, "beta");
  assert.deepEqual(startDescriptor.errorCodes, ["ENGINE_OBSERVABILITY_INVALID_INPUT"]);
  assert.deepEqual(stopDescriptor.errorCodes, ["ENGINE_OBSERVABILITY_TRACE_NOT_FOUND"]);
});

/**
 * Verifies runtime observability descriptor resolver returns canonical map entries.
 */
test("runtime observability foundation descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeObservabilityFoundationApiDescriptor("startTrace"),
    ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API.startTrace,
  );
  assert.deepEqual(
    resolveEngineRuntimeObservabilityFoundationApiDescriptor("replay"),
    ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API.replay,
  );
});

/**
 * Verifies observability descriptor determinism text keeps explicit same-input guarantee.
 */
test("runtime observability foundation determinism statements are explicit", () => {
  for (const descriptor of Object.values(ENGINE_RUNTIME_OBSERVABILITY_FOUNDATION_API)) {
    assert.equal(descriptor.determinism.includes("Same"), true);
  }
});
