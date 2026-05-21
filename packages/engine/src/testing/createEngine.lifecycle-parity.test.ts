import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";

/**
 * Declares one lifecycle action and its expected terminal state in parity fixtures.
 */
interface LifecycleParityStep {
  /**
   * Human-readable step label used in assertion messages.
   */
  label: string;
  /**
   * Engine operation executed in sequence.
   */
  execute: () => void;
  /**
   * Expected lifecycle state after the operation.
   */
  expectedState: "created" | "running" | "paused" | "stopped" | "disposed";
}

/**
 * Creates a deterministic runtime adapter for lifecycle parity fixtures.
 * @param now Fixed timestamp supplied to captureFrame and stats snapshots.
 */
function createLifecycleRuntimeAdapter(now: number) {
  return {
    requestFrame: (_callback: (timestampMs: number) => void) => 1,
    cancelFrame: (_handle: number) => {},
    now: () => now,
  };
}

/**
 * Verifies createEngine lifecycle transitions remain parity-stable for staged canonical shell.
 */
test("createEngine lifecycle parity fixture", () => {
  const engine = createEngine({
    surface: createTestSurface(300, 200),
    runtimeAdapter: createLifecycleRuntimeAdapter(99),
  });

  const steps: LifecycleParityStep[] = [
    {
      label: "start enters running",
      execute: () => engine.start(),
      expectedState: "running",
    },
    {
      label: "pause enters paused",
      execute: () => engine.pause(),
      expectedState: "paused",
    },
    {
      label: "resume returns to running",
      execute: () => engine.resume(),
      expectedState: "running",
    },
    {
      label: "stop enters stopped",
      execute: () => engine.stop(),
      expectedState: "stopped",
    },
    {
      label: "start from stopped re-enters running",
      execute: () => engine.start(),
      expectedState: "running",
    },
    {
      label: "dispose enters disposed",
      execute: () => engine.dispose(),
      expectedState: "disposed",
    },
    {
      label: "start after dispose remains disposed",
      execute: () => engine.start(),
      expectedState: "disposed",
    },
  ];

  for (const step of steps) {
    step.execute();
    assert.equal(engine.getStats().lifecycleState, step.expectedState, step.label);
  }
});
