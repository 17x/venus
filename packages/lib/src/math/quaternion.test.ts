import assert from "node:assert/strict";
import test from "node:test";

import {
  createIdentityQuat,
  multiplyQuats,
  normalizeQuat,
  quatFromEuler,
  slerpQuats,
} from "./quaternion.ts";

/** Verifies identity quaternion has w=1. */
test("identity quaternion has w equals 1", () => {
  const q = createIdentityQuat();
  assert.equal(q[3], 1);
});

/** Verifies quatFromEuler with 90° Y rotation produces correct quaternion. */
test("quatFromEuler 90 degrees Y rotation", () => {
  const q = quatFromEuler(0, Math.PI / 2, 0);
  // cos(45°) = sin(45°) ≈ 0.7071
  const expected = Math.SQRT1_2;
  assert.ok(Math.abs(q[0]) < 1e-10);
  assert.ok(Math.abs(q[1] - expected) < 1e-10);
  assert.ok(Math.abs(q[2]) < 1e-10);
  assert.ok(Math.abs(q[3] - expected) < 1e-10);
});

/** Verifies quaternion multiplication is associative with identity. */
test("quaternion multiply with identity is neutral", () => {
  const q = quatFromEuler(0.5, 0.3, 0.1);
  const identity = createIdentityQuat();

  const left = multiplyQuats(identity, q);
  const right = multiplyQuats(q, identity);

  for (let i = 0; i < 4; i += 1) {
    assert.ok(Math.abs((left[i] ?? 0) - (q[i] ?? 0)) < 1e-12);
    assert.ok(Math.abs((right[i] ?? 0) - (q[i] ?? 0)) < 1e-12);
  }
});

/** Verifies slerp at t=0 returns start quaternion. */
test("slerp at t equals 0 returns start quaternion", () => {
  const q1 = createIdentityQuat();
  const q2 = quatFromEuler(0, Math.PI / 2, 0);
  const result = slerpQuats(q1, q2, 0);

  for (let i = 0; i < 4; i += 1) {
    assert.ok(Math.abs((result[i] ?? 0) - (q1[i] ?? 0)) < 1e-12);
  }
});

/** Verifies slerp at t=1 returns end quaternion. */
test("slerp at t equals 1 returns end quaternion", () => {
  const q1 = createIdentityQuat();
  const q2 = quatFromEuler(0, Math.PI / 2, 0);
  const result = slerpQuats(q1, q2, 1);

  for (let i = 0; i < 4; i += 1) {
    assert.ok(Math.abs((result[i] ?? 0) - (q2[i] ?? 0)) < 1e-12);
  }
});

/** Verifies normalize returns unit-length quaternion. */
test("normalize returns unit-length quaternion", () => {
  const q = normalizeQuat([2, 0, 0, 2]);
  const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  assert.ok(Math.abs(len - 1) < 1e-12);
});
