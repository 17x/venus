import assert from "node:assert/strict";
import test from "node:test";

import { createEngineCameraController } from "./engineCameraController";
import type { EngineCameraControllerScheduler } from "./engineCameraController";

/**
 * Creates a stub scheduler for testing camera animation damping.
 */
function createStubScheduler(): EngineCameraControllerScheduler {
  let handle = 0;
  const callbacks = new Map<number, () => void>();
  return {
    requestFrame: (cb) => {
      const id = ++handle;
      callbacks.set(id, cb);
      return id;
    },
    cancelFrame: (id) => {
      callbacks.delete(id);
    },
    /** Flushes one animation frame for testing. */
    flushFrame: () => {
      for (const cb of callbacks.values()) {
        cb();
      }
      callbacks.clear();
    },
  };
}

/**
 * Verifies camera damping interpolates toward target state over multiple frames.
 */
test("camera damping interpolates toward target over frames", () => {
  const scheduler = createStubScheduler();

  const controller = createEngineCameraController({
    initialState: { yaw: 0, pitch: 0, distance: 720, targetX: 0, targetY: 0, targetZ: 0 },
    scheduler,
    onCameraStateChanged: () => {},
    onRenderRequested: async () => {},
  });

  const initial = controller.getState();
  assert.equal(initial.yaw, 0);

  // Apply orbit command and flush one frame.
  controller.applyCommand({ type: "orbit", deltaYaw: 45, deltaPitch: 0 });
  (scheduler as ReturnType<typeof createStubScheduler>).flushFrame();

  // After flushing the smoothing loop, yaw should have moved toward target.
  const midState = controller.getState();
  assert.ok(midState.yaw > 0, `yaw should have moved from 0, got ${midState.yaw}`);
  assert.ok(midState.yaw <= 45, `yaw should not exceed target 45, got ${midState.yaw}`);
});

/**
 * Verifies zoom damping produces intermediate distance values.
 */
test("camera zoom damping interpolates distance", () => {
  const scheduler = createStubScheduler();

  const controller = createEngineCameraController({
    initialState: { yaw: 0, pitch: 0, distance: 720, targetX: 0, targetY: 0, targetZ: 0 },
    scheduler,
    onCameraStateChanged: () => {},
    onRenderRequested: async () => {},
  });

  const initial = controller.getState();
  assert.equal(initial.distance, 720);

  controller.applyCommand({ type: "dolly", zoomFactor: 2 });
  (scheduler as ReturnType<typeof createStubScheduler>).flushFrame();

  const midState = controller.getState();
  assert.ok(midState.distance < 720, `distance should decrease from 720, got ${midState.distance}`);
  assert.ok(midState.distance >= 360, `distance should not go below min 360, got ${midState.distance}`);
});

/**
 * Verifies setViewport command updates aspect ratio.
 */
test("setViewport command updates aspect ratio", () => {
  const scheduler = createStubScheduler();

  const controller = createEngineCameraController({
    initialState: { yaw: 0, pitch: 0, distance: 720, targetX: 0, targetY: 0, targetZ: 0 },
    scheduler,
    onCameraStateChanged: () => {},
    onRenderRequested: async () => {},
  });

  controller.applyCommand({ type: "setViewport", width: 1920, height: 1080 });
  (scheduler as ReturnType<typeof createStubScheduler>).flushFrame();

  const state = controller.getState();
  assert.equal(state.aspect, 1920 / 1080);
});
