import assert from "node:assert/strict";
import test from "node:test";

import { computeCameraStateHash, createEmptyVisibleSetSnapshot } from "./visibleSetSnapshot";

test("computeCameraStateHash produces deterministic output", () => {
  const h1 = computeCameraStateHash(0, 0, 720, 0, 0, 0);
  const h2 = computeCameraStateHash(0, 0, 720, 0, 0, 0);
  assert.equal(h1, h2);
});

test("computeCameraStateHash differs for different states", () => {
  const h1 = computeCameraStateHash(0, 0, 720, 0, 0, 0);
  const h2 = computeCameraStateHash(45, 0, 720, 0, 0, 0);
  assert.notEqual(h1, h2);
});

test("empty visible set snapshot has zero draw calls", () => {
  const snapshot = createEmptyVisibleSetSnapshot(42);
  assert.equal(snapshot.frameId, 42);
  assert.equal(snapshot.visibleNodeIds.length, 0);
  assert.equal(snapshot.drawCallCount, 0);
  assert.equal(snapshot.renderPath, "none");
});
