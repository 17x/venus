import assert from "node:assert/strict";
import test from "node:test";

import { deriveBoundsFromPositions } from "./boundsFromGeometry";

/** Verifies bounds are correctly derived from a simple quad position array. */
test("deriveBoundsFromPositions computes correct AABB from quad", () => {
  const positions = [
    0, 0, 0,
    40, 0, 0,
    0, 30, 0,
    40, 30, 0,
  ];

  const bounds = deriveBoundsFromPositions(positions);

  assert.equal(bounds.minX, 0);
  assert.equal(bounds.maxX, 40);
  assert.equal(bounds.minY, 0);
  assert.equal(bounds.maxY, 30);
  assert.equal(bounds.minZ, 0);
  assert.equal(bounds.maxZ, 0);
});

/** Verifies padding is correctly applied to all axes. */
test("deriveBoundsFromPositions applies padding to all axes", () => {
  const positions = [10, 10, 10, 20, 20, 20];
  const bounds = deriveBoundsFromPositions(positions, 5);

  assert.equal(bounds.minX, 5);
  assert.equal(bounds.maxX, 25);
  assert.equal(bounds.minY, 5);
  assert.equal(bounds.maxY, 25);
});

/** Verifies empty input returns unit fallback bounds. */
test("deriveBoundsFromPositions returns unit fallback for empty input", () => {
  const bounds = deriveBoundsFromPositions([]);

  assert.equal(bounds.minX, -0.5);
  assert.equal(bounds.maxX, 0.5);
  assert.equal(bounds.minY, -0.5);
  assert.equal(bounds.maxY, 0.5);
});

/** Verifies non-finite values are skipped. */
test("deriveBoundsFromPositions skips non-finite values", () => {
  const positions = [
    Number.NaN, Number.NaN, Number.NaN,
    1, 2, 3,
    Number.POSITIVE_INFINITY, 0, 0,
  ];

  const bounds = deriveBoundsFromPositions(positions);

  assert.equal(bounds.minX, 1);
  assert.equal(bounds.maxX, 1);
  assert.equal(bounds.minY, 2);
  assert.equal(bounds.maxY, 2);
  assert.equal(bounds.minZ, 3);
  assert.equal(bounds.maxZ, 3);
});
