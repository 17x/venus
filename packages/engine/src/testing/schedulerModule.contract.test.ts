import assert from "node:assert/strict";
import test from "node:test";

import { createEngineSchedulerModule } from "../kernel/core/scheduler/frame-budget-module";
import {
  resolveEngineFrameBudget,
  resolveFrameBudgetPressure,
  resolveFrameBudgetPressureReason,
  resolveFrameBudgetPressureSignals,
  resolvePhaseBudget,
} from "../optimization/frameBudgetBroker";

/**
 * Verifies core scheduler module keeps canonical frame-budget broker behavior deterministic.
 */
test("scheduler module budget parity", () => {
  const schedulerModule = createEngineSchedulerModule();
  const input = {
    phase: "pan" as const,
    interactionActive: true,
    sceneNodeCount: 9000,
    tileQueuePendingCount: 32,
    dirtyRegionCount: 3,
  };

  assert.deepEqual(schedulerModule.resolveFrameBudget(input), resolveEngineFrameBudget(input));
  assert.equal(schedulerModule.resolveFrameBudgetPressure(input), resolveFrameBudgetPressure(input));
  assert.deepEqual(
    schedulerModule.resolveFrameBudgetPressureSignals(input),
    resolveFrameBudgetPressureSignals(input),
  );
  assert.equal(
    schedulerModule.resolveFrameBudgetPressureReason("medium", {
      sceneNodeCountHigh: false,
      tileQueuePendingHigh: false,
      dirtyRegionCountHigh: false,
      sceneNodeCountMedium: true,
      tileQueuePendingMedium: false,
      dirtyRegionCountMedium: false,
    }),
    resolveFrameBudgetPressureReason("medium", {
      sceneNodeCountHigh: false,
      tileQueuePendingHigh: false,
      dirtyRegionCountHigh: false,
      sceneNodeCountMedium: true,
      tileQueuePendingMedium: false,
      dirtyRegionCountMedium: false,
    }),
  );
  assert.deepEqual(schedulerModule.resolvePhaseBudget(input), resolvePhaseBudget(input));
});
