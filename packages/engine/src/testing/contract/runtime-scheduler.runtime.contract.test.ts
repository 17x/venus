import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_SCHEDULER_API,
  resolveEngineRuntimeSchedulerApiDescriptor,
} from "../../runtime/scheduler/runtime-scheduler.contract";

/**
 * Verifies runtime scheduler descriptor map keeps expected endpoint set.
 */
test("runtime scheduler descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_SCHEDULER_API).sort(), [
    "cancel",
    "flush",
    "getQueueStats",
    "schedule",
  ]);
});

/**
 * Verifies runtime scheduler descriptors keep required error semantics.
 */
test("runtime scheduler descriptors keep required error semantics", () => {
  const scheduleDescriptor = ENGINE_RUNTIME_SCHEDULER_API.schedule;
  const cancelDescriptor = ENGINE_RUNTIME_SCHEDULER_API.cancel;

  assert.deepEqual(scheduleDescriptor.errorCodes, [
    "ENGINE_SCHEDULER_INVALID_TASK",
    "ENGINE_SCHEDULER_INVALID_QUEUE",
  ]);
  assert.deepEqual(cancelDescriptor.errorCodes, ["ENGINE_SCHEDULER_TASK_NOT_FOUND"]);
  assert.equal(scheduleDescriptor.level, "developer");
  assert.equal(scheduleDescriptor.stability, "beta");
});

/**
 * Verifies runtime scheduler descriptor resolver returns canonical map entries.
 */
test("runtime scheduler descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeSchedulerApiDescriptor("schedule"),
    ENGINE_RUNTIME_SCHEDULER_API.schedule,
  );
  assert.deepEqual(
    resolveEngineRuntimeSchedulerApiDescriptor("cancel"),
    ENGINE_RUNTIME_SCHEDULER_API.cancel,
  );
  assert.deepEqual(
    resolveEngineRuntimeSchedulerApiDescriptor("flush"),
    ENGINE_RUNTIME_SCHEDULER_API.flush,
  );
  assert.deepEqual(
    resolveEngineRuntimeSchedulerApiDescriptor("getQueueStats"),
    ENGINE_RUNTIME_SCHEDULER_API.getQueueStats,
  );
});
