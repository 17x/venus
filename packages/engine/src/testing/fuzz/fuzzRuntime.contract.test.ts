import assert from "node:assert/strict";
import test from "node:test";

import { resolveCreateEngineFrame } from "../../orchestration/render-planning/createEngineFrameResolver";

/**
 * Creates deterministic pseudo-random generator for fuzz input sampling.
 * @param seed Initial deterministic seed.
 */
function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  /**
   * Generates next pseudo-random number in [0, 1).
   */
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/**
 * Verifies frame resolver remains stable across deterministic fuzzed input range.
 */
test("fuzz runtime frame resolver stays finite and non-throwing", () => {
  const random = createDeterministicRandom(20260523);

  for (let index = 0; index < 2000; index += 1) {
    const nodeCount = Math.floor(random() * 50000);
    const width = 256 + Math.floor(random() * 4000);
    const height = 256 + Math.floor(random() * 3000);
    const scale = 0.1 + random() * 8;

    const decision = resolveCreateEngineFrame({
      scene: { nodeCount },
      viewport: {
        width,
        height,
        offsetX: random() * 5000 - 2500,
        offsetY: random() * 5000 - 2500,
        scale,
      },
      performance: {
        culling: random() > 0.2,
        overscanBorderPx: Math.floor(random() * 256),
      },
      policy: {
        profile: "interaction",
        preset: random() > 0.5 ? "high" : "balanced",
        budget: {
          drawBudgetMs: 4 + Math.floor(random() * 8),
          uploadBudgetBytes: 1_000_000 + Math.floor(random() * 8_000_000),
          frameBudgetMs: 16,
        },
      },
      interactionActive: random() > 0.5,
      nowMs: index * 8,
      lastInteractionAtMs: index * 8 - Math.floor(random() * 200),
      lastInteractionKind: random() > 0.5 ? "pan" : "zoom",
      cameraAnimationActive: random() > 0.8,
      cameraCachePreviewOnly: random() > 0.5,
      settleDelayMs: 40 + Math.floor(random() * 200),
      tileQueuePendingCount: Math.floor(random() * 400),
      dirtyRegionCount: Math.floor(random() * 64),
    });

    assert.equal(Number.isFinite(decision.shortlistCandidateRatio), true);
    assert.equal(decision.shortlistCandidateRatio >= 0, true);
    assert.equal(decision.shortlistCandidateRatio <= 1, true);
  }
});
