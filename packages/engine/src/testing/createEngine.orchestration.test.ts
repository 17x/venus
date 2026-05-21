import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";

/**
 * Builds a deterministic runtime adapter that avoids scheduling real frame loops.
 * @param now Fixed timestamp used by runtime snapshots.
 */
function createDeterministicRuntimeAdapter(now: number) {
  return {
    requestFrame: (_callback: (timestampMs: number) => void) => 1,
    cancelFrame: (_handle: number) => {},
    now: () => now,
  };
}

test("createEngine lifecycle and resize remain operational with orchestration path", () => {
  const engine = createEngine({
    surface: createTestSurface(640, 480),
    runtimeAdapter: createDeterministicRuntimeAdapter(42),
  });

  engine.start();
  assert.equal(engine.getStats().lifecycleState, "running");

  engine.resize(800, 600);
  const statsAfterResize = engine.getStats();
  assert.equal(statsAfterResize.width, 800);
  assert.equal(statsAfterResize.height, 600);
  assert.equal(statsAfterResize.runtimeProfileId, "headless-runtime");
  assert.equal(typeof statsAfterResize.runtimeCapabilityCount, "number");
  assert.equal(typeof statsAfterResize.lastFramePressureReason, "string");
  assert.equal(typeof statsAfterResize.lastFramePressureSignals?.sceneNodeCountHigh, "boolean");
  assert.equal(typeof statsAfterResize.lastDocumentRevision, "number");
  assert.equal(typeof statsAfterResize.lastCompileChangeSetId, "string");
  assert.equal(typeof statsAfterResize.lastCompileChangedNodeCount, "number");
  assert.equal(typeof statsAfterResize.lastExecutionDrawCount, "number");
  assert.equal(typeof statsAfterResize.lastRuntimeWorldRevision, "number");
  assert.equal(typeof statsAfterResize.lastDirtyDomainCount, "number");
  assert.equal(typeof statsAfterResize.lastEncodedCommandCount, "number");
  assert.equal(typeof statsAfterResize.lastReplayEventCount, "number");
  assert.equal(
    statsAfterResize.lastReplayFirstCommandId === null
      || typeof statsAfterResize.lastReplayFirstCommandId === "string",
    true,
  );
  assert.equal(typeof statsAfterResize.lastBoundaryViolationCount, "number");
  assert.equal(typeof statsAfterResize.lastPublicApiViolationCount, "number");

  engine.pause();
  assert.equal(engine.getStats().lifecycleState, "paused");

  engine.resume();
  assert.equal(engine.getStats().lifecycleState, "running");

  engine.stop();
  assert.equal(engine.getStats().lifecycleState, "stopped");

  const backendInfo = engine.getBackendInfo();
  assert.equal(backendInfo.requested, "auto");
  assert.equal(backendInfo.resolved, "headless");

  engine.dispose();
  assert.equal(engine.getStats().lifecycleState, "disposed");
});

test("createEngine auto backend resolves canvas2d when surface carries canvas", () => {
  const mockContext = {
    save() {},
    setTransform() {},
    clearRect() {},
    restore() {},
  } as unknown as CanvasRenderingContext2D;

  const engine = createEngine({
    surface: {
      width: 320,
      height: 240,
      canvas: {
        width: 320,
        height: 240,
        getContext: (contextId) => contextId === "2d" ? mockContext : null,
      },
    },
    runtimeAdapter: createDeterministicRuntimeAdapter(84),
  });

  const backendInfo = engine.getBackendInfo();
  assert.equal(backendInfo.requested, "auto");
  assert.equal(backendInfo.resolved, "canvas2d");
  assert.equal(backendInfo.fallbackReason, "auto-priority-canvas2d");

  const stats = engine.getStats();
  assert.equal(stats.runtimeProfileId, "browser-platform-runtime");
  assert.equal(typeof stats.runtimeCapabilityCount, "number");

  engine.dispose();
});
