import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_EVENTS_API,
  resolveEngineRuntimeEventsApiDescriptor,
} from "../../runtime/events/runtime-events.contract";

/**
 * Verifies runtime events descriptor map keeps expected endpoint set.
 */
test("runtime events descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_EVENTS_API).sort(), [
    "getListenerStats",
    "off",
    "offAll",
    "on",
    "onMany",
    "once",
    "pause",
    "resume",
  ]);
});

/**
 * Verifies runtime events envelope-critical endpoints keep required error semantics.
 */
test("runtime events critical descriptors keep required error codes", () => {
  const onDescriptor = ENGINE_RUNTIME_EVENTS_API.on;
  const pauseDescriptor = ENGINE_RUNTIME_EVENTS_API.pause;

  assert.deepEqual(onDescriptor.errorCodes, ["ENGINE_EVENTS_INVALID_TYPE", "ENGINE_EVENTS_INVALID_LISTENER"]);
  assert.deepEqual(pauseDescriptor.errorCodes, ["ENGINE_EVENTS_INVALID_TYPE"]);
  assert.equal(onDescriptor.level, "developer");
  assert.equal(onDescriptor.stability, "beta");
  assert.equal(onDescriptor.determinism.length > 0, true);
});

/**
 * Verifies descriptor resolver returns canonical descriptors by map key.
 */
test("runtime events descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeEventsApiDescriptor("on"),
    ENGINE_RUNTIME_EVENTS_API.on,
  );
  assert.deepEqual(
    resolveEngineRuntimeEventsApiDescriptor("off"),
    ENGINE_RUNTIME_EVENTS_API.off,
  );
  assert.deepEqual(
    resolveEngineRuntimeEventsApiDescriptor("once"),
    ENGINE_RUNTIME_EVENTS_API.once,
  );
  assert.deepEqual(
    resolveEngineRuntimeEventsApiDescriptor("onMany"),
    ENGINE_RUNTIME_EVENTS_API.onMany,
  );
  assert.deepEqual(
    resolveEngineRuntimeEventsApiDescriptor("offAll"),
    ENGINE_RUNTIME_EVENTS_API.offAll,
  );
  assert.deepEqual(
    resolveEngineRuntimeEventsApiDescriptor("pause"),
    ENGINE_RUNTIME_EVENTS_API.pause,
  );
  assert.deepEqual(
    resolveEngineRuntimeEventsApiDescriptor("resume"),
    ENGINE_RUNTIME_EVENTS_API.resume,
  );
  assert.deepEqual(
    resolveEngineRuntimeEventsApiDescriptor("getListenerStats"),
    ENGINE_RUNTIME_EVENTS_API.getListenerStats,
  );
});
