import assert from "node:assert/strict";
import test from "node:test";

import {
  composeMatrix4,
  createIdentityMatrix4,
  createRotationXMatrix4,
  createRotationYMatrix4,
  createRotationZMatrix4,
  createScaleMatrix4,
  createTranslationMatrix4,
  invertMatrix4,
  multiplyMatrices4,
  transformPoint3D,
} from "./matrix4.ts";

/** Verifies identity matrix leaves a point unchanged. */
test("identity matrix transforms point to itself", () => {
  const identity = createIdentityMatrix4();
  const result = transformPoint3D(identity, 5, -3, 7);
  assert.equal(result.x, 5);
  assert.equal(result.y, -3);
  assert.equal(result.z, 7);
});

/** Verifies translation matrix offsets a point correctly. */
test("translation matrix offsets point", () => {
  const t = createTranslationMatrix4(10, -5, 3);
  const result = transformPoint3D(t, 2, 2, 2);
  assert.equal(result.x, 12);
  assert.equal(result.y, -3);
  assert.equal(result.z, 5);
});

/** Verifies scale matrix scales a point. */
test("scale matrix scales point", () => {
  const s = createScaleMatrix4(2, 3, 0.5);
  const result = transformPoint3D(s, 10, 10, 10);
  assert.equal(result.x, 20);
  assert.equal(result.y, 30);
  assert.equal(result.z, 5);
});

/** Verifies rotation around x-axis transforms y and z coordinates. */
test("rotation X matrix transforms y and z", () => {
  const rx = createRotationXMatrix4(Math.PI / 2); // 90 degrees
  const result = transformPoint3D(rx, 0, 1, 0);
  assert.ok(Math.abs(result.x) < 1e-10);
  assert.ok(Math.abs(result.y) < 1e-10);
  assert.ok(Math.abs(result.z - 1) < 1e-10);
});

/** Verifies rotation around y-axis transforms x and z coordinates. */
test("rotation Y matrix transforms x and z", () => {
  const ry = createRotationYMatrix4(Math.PI / 2); // 90 degrees
  const result = transformPoint3D(ry, 1, 0, 0);
  assert.ok(Math.abs(result.x) < 1e-10);
  assert.ok(Math.abs(result.y) < 1e-10);
  assert.ok(Math.abs(result.z + 1) < 1e-10);
});

/** Verifies rotation around z-axis transforms x and y coordinates. */
test("rotation Z matrix transforms x and y", () => {
  const rz = createRotationZMatrix4(Math.PI / 2); // 90 degrees
  const result = transformPoint3D(rz, 1, 0, 0);
  assert.ok(Math.abs(result.x) < 1e-10);
  assert.ok(Math.abs(result.y - 1) < 1e-10);
  assert.ok(Math.abs(result.z) < 1e-10);
});

/** Verifies composeMatrix4 produces correct world transform. */
test("compose produces correct world transform", () => {
  // Translate(5,0,0) * Scale(2,2,2) on point (1,1,1) → (7,2,2)
  const m = composeMatrix4(5, 0, 0, 0, 0, 0, 2, 2, 2);
  const result = transformPoint3D(m, 1, 1, 1);
  assert.equal(result.x, 7);
  assert.equal(result.y, 2);
  assert.equal(result.z, 2);
});

/** Verifies matrix multiplication is associative with identity. */
test("matrix multiply with identity is neutral", () => {
  const identity = createIdentityMatrix4();
  const t = createTranslationMatrix4(5, 0, 0);
  const left = multiplyMatrices4(t, identity);
  const right = multiplyMatrices4(identity, t);

  for (let i = 0; i < 16; i += 1) {
    assert.ok(Math.abs((left[i] ?? 0) - (t[i] ?? 0)) < 1e-12);
    assert.ok(Math.abs((right[i] ?? 0) - (t[i] ?? 0)) < 1e-12);
  }
});

/** Verifies invert produces the inverse of a translation matrix. */
test("invert of translation gives reverse translation", () => {
  const t = createTranslationMatrix4(5, -3, 7);
  const inv = invertMatrix4(t);
  const result = transformPoint3D(inv, 5, -3, 7);
  assert.ok(Math.abs(result.x) < 1e-12);
  assert.ok(Math.abs(result.y) < 1e-12);
  assert.ok(Math.abs(result.z) < 1e-12);
});

/** Verifies invert(multiply(A, B)) equals multiply(invert(B), invert(A)). */
test("invert of product equals reverse product of inverses", () => {
  const t = createTranslationMatrix4(1, 2, 3);
  const s = createScaleMatrix4(2, 2, 2);
  const product = multiplyMatrices4(t, s);
  const invProduct = invertMatrix4(product);
  const invS = invertMatrix4(s);
  const invT = invertMatrix4(t);
  const expected = multiplyMatrices4(invS, invT);

  for (let i = 0; i < 16; i += 1) {
    assert.ok(
      Math.abs((invProduct[i] ?? 0) - (expected[i] ?? 0)) < 1e-10,
      `element ${i}: ${invProduct[i]} !== ${expected[i]}`,
    );
  }
});

/** Verifies singular matrix inversion returns identity. */
test("singular matrix invert returns identity", () => {
  const zero: readonly number[] = new Array(16).fill(0) as readonly number[];
  const inv = invertMatrix4(zero as unknown as readonly [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
  ]);
  const identity = createIdentityMatrix4();
  for (let i = 0; i < 16; i += 1) {
    assert.equal(inv[i], identity[i]);
  }
});

/** Verifies compose with rotation and scale produces correct result. */
test("compose with rotation and scale", () => {
  // Point (1,0,0) rotated 90° around Z becomes (0,1,0), scaled by 2 → (0,2,0), translated by (5,0,0) → (5,2,0)
  const m = composeMatrix4(5, 0, 0, 0, 0, Math.PI / 2, 2, 2, 2);
  const result = transformPoint3D(m, 1, 0, 0);
  assert.ok(Math.abs(result.x - 5) < 1e-10);
  assert.ok(Math.abs(result.y - 2) < 1e-10);
  assert.ok(Math.abs(result.z) < 1e-10);
});
