import assert from "node:assert/strict";
import test from "node:test";

import { createZeroInstancedDrawDiagnostics } from "./instancedDrawContract";

test("zero instanced draw diagnostics has all zeros and none reason", () => {
  const diag = createZeroInstancedDrawDiagnostics();
  assert.equal(diag.attemptedCount, 0);
  assert.equal(diag.succeededCount, 0);
  assert.equal(diag.rejectedCount, 0);
  assert.equal(diag.totalInstanceCount, 0);
  assert.equal(diag.rejectionReason, "none");
});
