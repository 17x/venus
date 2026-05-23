import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveEngineFrameBudget,
  resolveFrameBudgetPressureReason,
  resolveFrameBudgetPressureSignals,
} from "../../optimization/frameBudgetBroker";

/**
 * Verifies pressure signals and reason labels are stable for low threshold inputs.
 */
test("frameBudgetBroker diagnostics low pressure reason", () => {
  const input = {
    phase: "static" as const,
    interactionActive: false,
    sceneNodeCount: 100,
    tileQueuePendingCount: 0,
    dirtyRegionCount: 0,
  };

  const signals = resolveFrameBudgetPressureSignals(input);
  assert.equal(signals.sceneNodeCountMedium, false);
  assert.equal(signals.tileQueuePendingHigh, false);

  const decision = resolveEngineFrameBudget(input);
  assert.equal(decision.pressure, "low");
  assert.equal(decision.reason, "within-low-thresholds");
});

/**
 * Verifies high-pressure diagnostics reasons include all triggered high-threshold signals.
 */
test("frameBudgetBroker diagnostics high pressure reason aggregation", () => {
  const input = {
    phase: "camera" as const,
    interactionActive: true,
    sceneNodeCount: 20_000,
    tileQueuePendingCount: 300,
    dirtyRegionCount: 28,
  };

  const decision = resolveEngineFrameBudget(input);
  assert.equal(decision.pressure, "high");
  assert.ok(decision.reason.includes("scene-node-count-high"));
  assert.ok(decision.reason.includes("tile-queue-pending-high"));
  assert.ok(decision.reason.includes("dirty-region-count-high"));
  assert.equal(decision.signals.sceneNodeCountHigh, true);
  assert.equal(decision.signals.tileQueuePendingHigh, true);
  assert.equal(decision.signals.dirtyRegionCountHigh, true);
});

/**
 * Verifies reason helper returns deterministic medium-tier reason strings.
 */
test("frameBudgetBroker diagnostics medium reason helper", () => {
  const reason = resolveFrameBudgetPressureReason("medium", {
    sceneNodeCountHigh: false,
    tileQueuePendingHigh: false,
    dirtyRegionCountHigh: false,
    sceneNodeCountMedium: true,
    tileQueuePendingMedium: false,
    dirtyRegionCountMedium: true,
  });

  assert.equal(reason, "scene-node-count-medium+dirty-region-count-medium");
});
