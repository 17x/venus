import assert from "node:assert/strict";
import test from "node:test";

import { createEngineDirtyPropagationModule } from "./dirtyPropagation";

/**
 * Verifies dirty-propagation module keeps deterministic sorted dirty domains.
 */
test("dirtyPropagation module keeps deterministic ordering", () => {
  const module = createEngineDirtyPropagationModule();
  const empty = module.createEmptyState();
  const marked = module.markDirtyBatch(empty, ["resource", "geometry", "transform"]);

  assert.deepEqual(marked.dirtyDomains, ["geometry", "resource", "transform"]);
});

/**
 * Verifies dirty-propagation module flush removes only requested domains.
 */
test("dirtyPropagation module flush removes requested domains", () => {
  const module = createEngineDirtyPropagationModule();
  const state = module.markDirtyBatch(module.createEmptyState(), [
    "geometry",
    "material",
    "visibility",
  ]);
  const flushed = module.flushDirty(state, ["material"]);

  assert.deepEqual(flushed.dirtyDomains, ["geometry", "visibility"]);
});
