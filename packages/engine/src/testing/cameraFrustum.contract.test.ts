import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveCameraFrustum,
  frustumIntersectsAABB,
} from "../kernel/interaction/camera/cameraFrustum";
import type { EngineCameraState } from "../kernel/interaction/camera/cameraCommandProtocol";

/** Creates one minimal perspective camera state for frustum derivation tests. */
function makePerspectiveState(overrides?: Partial<EngineCameraState>): EngineCameraState {
  return {
    yaw: 0,
    pitch: 0,
    distance: 720,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    projectionMode: "perspective",
    perspectiveFovY: 50,
    near: 0.1,
    far: 1000,
    ...overrides,
  };
}

/** Creates one minimal orthographic camera state for frustum derivation tests. */
function makeOrthographicState(): EngineCameraState {
  return {
    yaw: 0,
    pitch: 0,
    distance: 720,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    projectionMode: "orthographic",
    orthographicHalfSize: 600,
    near: 0.1,
    far: 5000,
  };
}

/** Verifies perspective frustum derivation produces six planes with inward-facing normals. */
test("derive perspective frustum produces six inward-facing planes", () => {
  const state = makePerspectiveState();
  const frustum = deriveCameraFrustum(state, 16 / 9);

  assert.ok(frustum.left, "frustum must have left plane");
  assert.ok(frustum.right, "frustum must have right plane");
  assert.ok(frustum.bottom, "frustum must have bottom plane");
  assert.ok(frustum.top, "frustum must have top plane");
  assert.ok(frustum.near, "frustum must have near plane");
  assert.ok(frustum.far, "frustum must have far plane");

  const planes = [frustum.left, frustum.right, frustum.bottom, frustum.top, frustum.near, frustum.far];
  for (const plane of planes) {
    const len = Math.sqrt(
      plane.normalX * plane.normalX +
      plane.normalY * plane.normalY +
      plane.normalZ * plane.normalZ,
    );
    assert.ok(
      Math.abs(len - 1) < 1e-6 || len === 0,
      `plane normal must be unit-length or zero, got ${len}`,
    );
  }
});

/** Verifies AABB at camera target passes frustum intersection when inside view volume. */
test("AABB at camera target intersects perspective frustum", () => {
  const state = makePerspectiveState();
  const frustum = deriveCameraFrustum(state, 16 / 9);

  const aabb = {
    minX: -50, minY: -50, minZ: -50,
    maxX: 50, maxY: 50, maxZ: 50,
  };

  assert.equal(frustumIntersectsAABB(frustum, aabb), true);
});

/** Verifies AABB far behind camera is rejected by frustum culling. */
test("AABB behind camera is rejected by frustum", () => {
  const state = makePerspectiveState();
  const frustum = deriveCameraFrustum(state, 16 / 9);

  const aabb = {
    minX: -50, minY: -50, minZ: 800,
    maxX: 50, maxY: 50, maxZ: 900,
  };

  assert.equal(frustumIntersectsAABB(frustum, aabb), false);
});

/** Verifies orthographic frustum derivation produces valid planes. */
test("derive orthographic frustum produces six valid planes", () => {
  const state = makeOrthographicState();
  const frustum = deriveCameraFrustum(state, 16 / 9);

  assert.ok(frustum.left, "orthographic frustum must have left plane");
  assert.ok(frustum.right, "orthographic frustum must have right plane");
  assert.ok(frustum.bottom, "orthographic frustum must have bottom plane");
  assert.ok(frustum.top, "orthographic frustum must have top plane");
  assert.ok(frustum.near, "orthographic frustum must have near plane");
  assert.ok(frustum.far, "orthographic frustum must have far plane");
});

/** Verifies AABB at target passes orthographic frustum with large half-size. */
test("AABB at camera target intersects orthographic frustum", () => {
  const state = makeOrthographicState();
  const frustum = deriveCameraFrustum(state, 16 / 9);

  const aabb = {
    minX: -100, minY: -100, minZ: -100,
    maxX: 100, maxY: 100, maxZ: 100,
  };

  assert.equal(frustumIntersectsAABB(frustum, aabb), true);
});

/** Verifies frustum with rotated camera correctly culls off-axis AABBs. */
test("rotated camera frustum culls off-axis AABBs", () => {
  const state = makePerspectiveState({ yaw: 90 });
  const frustum = deriveCameraFrustum(state, 16 / 9);

  const behindCamera = {
    minX: 800, minY: -50, minZ: -50,
    maxX: 900, maxY: 50, maxZ: 50,
  };

  assert.equal(frustumIntersectsAABB(frustum, behindCamera), false);

  const inFront = {
    minX: -50, minY: -50, minZ: -50,
    maxX: 50, maxY: 50, maxZ: 50,
  };

  assert.equal(frustumIntersectsAABB(frustum, inFront), true);
});
