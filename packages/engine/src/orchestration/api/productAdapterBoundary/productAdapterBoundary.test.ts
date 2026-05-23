import assert from "node:assert/strict";
import test from "node:test";

import { createEngineProductAdapterBoundaryModule } from "./productAdapterBoundary";

/**
 * Verifies product-adapter boundary accepts neutral capability payloads.
 */
test("productAdapterBoundary module accepts neutral payload", () => {
  const module = createEngineProductAdapterBoundaryModule();
  const validation = module.validateSafeInput({
    graph: {
      nodes: [{ id: "node-a", kind: "shape" }],
    },
  });

  assert.equal(validation.safe, true);
  assert.equal(validation.violations.length, 0);
});

/**
 * Verifies product-adapter boundary rejects forbidden product semantic keys.
 */
test("productAdapterBoundary module rejects forbidden keys", () => {
  const module = createEngineProductAdapterBoundaryModule();
  const validation = module.validateSafeInput({
    historyStack: [],
    nested: {
      undoState: {
        enabled: true,
      },
    },
  });

  assert.equal(validation.safe, false);
  assert.deepEqual(
    validation.violations.map((violation) => violation.path),
    ["$.historyStack", "$.nested.undoState"],
  );
});
