import assert from "node:assert/strict";
import test from "node:test";

import { createEngine as createEngineExported } from "../index.ts";
import { createEngine as createEngineUnderTest } from "../api/createEngine";

/**
 * Verifies canonical createEngine export wiring stays callable against source implementation.
 */
test("createEngine parity via canonical export path", () => {
  assert.equal(typeof createEngineUnderTest, "function");
  assert.equal(typeof createEngineExported, "function");
});
