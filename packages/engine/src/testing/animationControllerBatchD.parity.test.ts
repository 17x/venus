import assert from "node:assert/strict";
import test from "node:test";

import {
  createEngineAnimationController as createModuleEngineAnimationController,
} from "../kernel/animation/engineAnimationController";

import {
  createEngineAnimationController as createEngineAnimationControllerUnderTest,
} from "../kernel/animation/engineAnimationController";

/**
 * Creates one deterministic frame payload for animation tick comparison.
 * @param now Current timestamp in milliseconds.
 * @returns Frame payload consumed by animation controllers.
 */
function createFrame(now: number) {
  return {
    now,
    dt: 16,
  };
}

/**
 * Verifies canonical animation controller export path preserves module tick/update sequencing.
 */
test("createEngineAnimationController parity", () => {
  const module = createModuleEngineAnimationController();
  const next = createEngineAnimationControllerUnderTest();

  const moduleUpdates: number[] = [];
  const nextUpdates: number[] = [];
  let moduleComplete = 0;
  let nextComplete = 0;

  module.start({
    from: 0,
    to: 10,
    duration: 100,
    easing: "linear",
    onUpdate: (value) => {
      moduleUpdates.push(value);
    },
    onComplete: () => {
      moduleComplete += 1;
    },
  });

  next.start({
    from: 0,
    to: 10,
    duration: 100,
    easing: "linear",
    onUpdate: (value) => {
      nextUpdates.push(value);
    },
    onComplete: () => {
      nextComplete += 1;
    },
  });

  const ticks = [1000, 1040, 1100, 1160];
  for (const now of ticks) {
    const frame = createFrame(now);
    module.tick(frame);
    next.tick(frame);
  }

  assert.deepEqual(nextUpdates, moduleUpdates);
  assert.equal(nextComplete, moduleComplete);
  assert.equal(nextComplete, 1);
});
