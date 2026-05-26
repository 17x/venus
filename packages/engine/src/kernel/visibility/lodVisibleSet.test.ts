import assert from "node:assert/strict";
import test from "node:test";

import { resolveLodLevel } from "./lodVisibleSet";

test("resolveLodLevel returns 0 when distance is within first threshold", () => {
  assert.equal(resolveLodLevel(5, [10, 50, 200]), 0);
});

test("resolveLodLevel returns 1 when distance exceeds first threshold", () => {
  assert.equal(resolveLodLevel(30, [10, 50, 200]), 1);
});

test("resolveLodLevel returns last+1 when beyond all thresholds", () => {
  assert.equal(resolveLodLevel(500, [10, 50, 200]), 3);
});
