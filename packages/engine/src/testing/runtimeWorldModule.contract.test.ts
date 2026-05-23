import assert from "node:assert/strict";
import test from "node:test";

import { createEngineWorldModule } from "../kernel/core/world/runtime-world-module";
import { createRuntimeWorldFromDocument } from "../kernel/ecs/runtimeWorld";
import { createDocumentSnapshot } from "../kernel/document/document-store";

/**
 * Verifies core world module keeps canonical runtime-world projection behavior deterministic.
 */
test("world module world projection parity", () => {
  const worldModule = createEngineWorldModule();
  const snapshot = createDocumentSnapshot({
    revision: 2,
    nodes: {
      b: {
        id: "b",
        kind: "shape",
        payload: {},
      },
      a: {
        id: "a",
        kind: "group",
        payload: {},
      },
    },
  });

  const fromModule = worldModule.createWorldFromDocument(snapshot);
  const fromCanonical = createRuntimeWorldFromDocument(snapshot);

  assert.deepEqual(fromModule, fromCanonical);
});
