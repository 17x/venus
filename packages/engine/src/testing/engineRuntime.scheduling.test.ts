import assert from "node:assert/strict";
import test from "node:test";

import { createEngineRuntimeShell } from "../runtime/engineRuntime";
import { createRuntimeAdapterTestDouble } from "./runtimeAdapterTestDouble";
import type { BackendSelectionResult } from "../api/public-types";
import type { EngineBackend } from "../backend/backend";

/**
 * Creates backend selection metadata for deterministic runtime tests.
 */
function createBackendSelectionResult(): BackendSelectionResult {
  return {
    requested: "auto",
    resolved: "headless",
    fallbackReason: "test",
    nativeEligible: false,
  };
}

/**
 * Creates an in-memory backend stub with observable counters.
 */
function createBackendStub() {
  let renderedFrames = 0;
  let disposed = 0;
  let lastResize = { width: 0, height: 0 };

  const backend: EngineBackend = {
    mode: "headless",
    renderFrame: () => {
      renderedFrames += 1;
    },
    resize: (surface) => {
      lastResize = surface;
    },
    dispose: () => {
      disposed += 1;
    },
  };

  return {
    backend,
    getRenderedFrames: () => renderedFrames,
    getDisposedCount: () => disposed,
    getLastResize: () => lastResize,
  };
}

/**
 * Verifies runtime shell keeps one-frame-ahead scheduling and cancels pending work on stop.
 */
test("createEngineRuntimeShell stop cancels pending frame scheduling", () => {
  const runtimeAdapterDouble = createRuntimeAdapterTestDouble();
  const backendStub = createBackendStub();
  const frameEvents: number[] = [];

  const shell = createEngineRuntimeShell(
    {
      surface: { width: 320, height: 180 },
      runtimeAdapter: runtimeAdapterDouble.adapter,
    },
    backendStub.backend,
    createBackendSelectionResult(),
    {
      onFrame: (timestampMs) => {
        frameEvents.push(timestampMs);
      },
    },
  );

  shell.start();
  assert.equal(shell.getStats().lifecycleState, "running");
  assert.equal(runtimeAdapterDouble.getPendingFrameCount(), 1);

  assert.equal(runtimeAdapterDouble.runNextFrame(16), true);
  assert.equal(backendStub.getRenderedFrames(), 1);
  assert.deepEqual(frameEvents, [16]);
  assert.equal(runtimeAdapterDouble.getPendingFrameCount(), 1);

  shell.stop();
  assert.equal(shell.getStats().lifecycleState, "stopped");
  assert.equal(runtimeAdapterDouble.getPendingFrameCount(), 0);
  assert.equal(runtimeAdapterDouble.getCancelCount() > 0, true);

  assert.equal(runtimeAdapterDouble.runNextFrame(32), false);
  assert.equal(backendStub.getRenderedFrames(), 1);
});

/**
 * Verifies dispose transitions are terminal and release backend resources once.
 */
test("createEngineRuntimeShell dispose is terminal and idempotent", () => {
  const runtimeAdapterDouble = createRuntimeAdapterTestDouble();
  const backendStub = createBackendStub();

  const shell = createEngineRuntimeShell(
    {
      surface: { width: 100, height: 100 },
      runtimeAdapter: runtimeAdapterDouble.adapter,
    },
    backendStub.backend,
    createBackendSelectionResult(),
  );

  shell.start();
  assert.equal(runtimeAdapterDouble.getPendingFrameCount(), 1);

  shell.dispose();
  assert.equal(shell.getStats().lifecycleState, "disposed");
  assert.equal(backendStub.getDisposedCount(), 1);
  assert.equal(runtimeAdapterDouble.getPendingFrameCount(), 0);

  shell.start();
  assert.equal(shell.getStats().lifecycleState, "disposed");
  assert.equal(runtimeAdapterDouble.getPendingFrameCount(), 0);

  shell.dispose();
  assert.equal(backendStub.getDisposedCount(), 1);
});

/**
 * Verifies runtime resize keeps backend and stats surfaces synchronized.
 */
test("createEngineRuntimeShell resize updates backend surface and stats", () => {
  const runtimeAdapterDouble = createRuntimeAdapterTestDouble();
  const backendStub = createBackendStub();

  const shell = createEngineRuntimeShell(
    {
      surface: { width: 200, height: 120 },
      runtimeAdapter: runtimeAdapterDouble.adapter,
    },
    backendStub.backend,
    createBackendSelectionResult(),
  );

  shell.resize(640, 480);

  assert.deepEqual(backendStub.getLastResize(), { width: 640, height: 480 });
  assert.equal(shell.getStats().width, 640);
  assert.equal(shell.getStats().height, 480);
});
