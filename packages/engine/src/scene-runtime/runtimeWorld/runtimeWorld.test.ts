import assert from "node:assert/strict";
import test from "node:test";

import { createDocumentSnapshot } from "../../document/document-store";
import { createRuntimeWorldFromDocument } from "../../ecs/runtimeWorld";
import { createEngineRuntimeWorldModule } from "./runtimeWorld";

/**
 * Verifies runtime-world module parity with canonical runtime world construction logic.
 */
test("runtimeWorld module build parity", () => {
  const module = createEngineRuntimeWorldModule();
  const snapshot = createDocumentSnapshot({
    revision: 4,
    nodes: {
      nodeB: {
        id: "nodeB",
        kind: "shape",
        payload: { geometryRevision: 2 },
      },
      nodeA: {
        id: "nodeA",
        kind: "group",
        payload: { transformRevision: 3 },
      },
    },
  });

  const fromModule = module.buildFromDocument(snapshot);
  const fromWorld = createRuntimeWorldFromDocument(snapshot);

  assert.deepEqual(fromModule, fromWorld);
});
