import assert from "node:assert/strict";
import test from "node:test";

import { resolveEngineFrameBudget as resolveEngineFrameBudgetCanonical } from "../optimization/frameBudgetBroker.ts";
import { resolveEngineRenderStrategy as resolveEngineRenderStrategyCanonical } from "../orchestration/render-runtime/strategy.ts";

/**
 * Returns one canonical strategy input snapshot.
 * @param {Partial<{
 *   nowMs: number,
 *   lodEnabled: boolean,
 *   cameraAnimationActive: boolean,
 *   cameraCachePreviewOnly: boolean,
 *   lastInteractionAtMs: number,
 *   lastInteractionKind: "none" | "set" | "pan" | "zoom",
 *   settleDelayMs: number,
 *   interactionHoldMs: number,
 *   forceSharpFrame: boolean,
 * }>} [overrides] Scenario-specific override fields.
 */
function createSharedStrategyInput(overrides = {}) {
  return {
    nowMs: overrides.nowMs ?? 100,
    lodEnabled: overrides.lodEnabled ?? true,
    cameraAnimationActive: overrides.cameraAnimationActive ?? false,
    cameraCachePreviewOnly: overrides.cameraCachePreviewOnly ?? true,
    lastInteractionAtMs: overrides.lastInteractionAtMs ?? 80,
    lastInteractionKind: overrides.lastInteractionKind ?? "pan",
    settleDelayMs: overrides.settleDelayMs ?? 120,
    interactionHoldMs: overrides.interactionHoldMs ?? 56,
    forceSharpFrame: overrides.forceSharpFrame ?? false,
  };
}

/**
 * Returns one canonical static-pressure budget input snapshot.
 * @param {number} sceneNodeCount Scene node count used to trigger pressure tiers.
 */
function createSharedBudgetInput(sceneNodeCount) {
  return {
    phase: "static",
    interactionActive: false,
    sceneNodeCount,
    tileQueuePendingCount: 0,
    dirtyRegionCount: 0,
  };
}

/**
 * Verifies canonical strategy phases remain deterministic on shared scenarios.
 */
test("canonical strategy deterministic smoke", () => {
  const scenarios = [
    createSharedStrategyInput({
      cameraAnimationActive: true,
      lastInteractionKind: "none",
    }),
    createSharedStrategyInput({
      cameraAnimationActive: false,
      lastInteractionKind: "pan",
      nowMs: 100,
      lastInteractionAtMs: 80,
    }),
    createSharedStrategyInput({
      cameraAnimationActive: false,
      lastInteractionKind: "zoom",
      nowMs: 100,
      lastInteractionAtMs: 80,
    }),
    createSharedStrategyInput({
      cameraAnimationActive: false,
      lastInteractionKind: "pan",
      nowMs: 200,
      lastInteractionAtMs: 80,
    }),
  ];

  for (const scenario of scenarios) {
    const resolved = resolveEngineRenderStrategyCanonical(scenario);
    assert.equal(typeof resolved.phase, "string");
    assert.equal(typeof resolved.interactionActive, "boolean");
    assert.equal(
      resolved.quality === "full" || resolved.quality === "interactive",
      true,
    );
  }

  const forcedSharp = resolveEngineRenderStrategyCanonical(
    createSharedStrategyInput({ forceSharpFrame: true }),
  );
  assert.equal(forcedSharp.phase, "settling");
  assert.equal(forcedSharp.quality, "full");
  assert.equal(forcedSharp.cachePreviewOnly, false);
});

/**
 * Verifies canonical pressure tiers stay monotonic on shared static-scene thresholds.
 */
test("canonical static pressure monotonic smoke", () => {
  const scenarios = [
    createSharedBudgetInput(100),
    createSharedBudgetInput(9_000),
    createSharedBudgetInput(20_000),
  ];

  const low = resolveEngineFrameBudgetCanonical(scenarios[0]);
  const medium = resolveEngineFrameBudgetCanonical(scenarios[1]);
  const high = resolveEngineFrameBudgetCanonical(scenarios[2]);

  assert.equal(low.pressure, "low");
  assert.equal(medium.pressure === "low" || medium.pressure === "medium", true);
  assert.equal(high.pressure === "high" || high.pressure === "medium", true);
});
