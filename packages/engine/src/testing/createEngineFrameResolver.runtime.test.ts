import assert from "node:assert/strict";
import test from "node:test";

import { resolveCreateEngineFrame } from "../render-planning/createEngineFrameResolver";

/**
 * Verifies frame resolver returns integrated runtime strategy and budget decisions.
 */
test("resolveCreateEngineFrame includes runtime strategy and budget decision", () => {
  const decision = resolveCreateEngineFrame({
    scene: { nodeCount: 1200 },
    viewport: {
      width: 1000,
      height: 700,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    },
    performance: {
      culling: true,
      overscanBorderPx: 96,
    },
    policy: {
      profile: "editor",
      preset: "high",
      budget: {
        drawBudgetMs: 6,
        uploadBudgetBytes: 3_000_000,
        frameBudgetMs: 16,
      },
    },
    interactionActive: true,
    nowMs: 100,
    lastInteractionAtMs: 90,
    lastInteractionKind: "pan",
    cameraAnimationActive: false,
    cameraCachePreviewOnly: true,
    settleDelayMs: 120,
    tileQueuePendingCount: 0,
    dirtyRegionCount: 0,
  });

  assert.equal(typeof decision.runtime.strategy.phase, "string");
  assert.equal(typeof decision.runtime.budget.pressure, "string");
  assert.equal(typeof decision.runtime.budget.reason, "string");
  assert.equal(decision.runtime.strategy.interactionActive, true);
  assert.ok(decision.runtime.budget.budget.drawSubmitBudgetMs > 0);
  assert.equal(typeof decision.runtime.budget.signals.sceneNodeCountHigh, "boolean");
  assert.equal(typeof decision.runtime.budget.signals.tileQueuePendingMedium, "boolean");
});
