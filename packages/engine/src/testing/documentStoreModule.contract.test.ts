import assert from "node:assert/strict";
import test from "node:test";

import { createEngineDocumentStoreModule } from "../kernel/core/document/document-store-module";
import { applyDocumentChangeSet, createDocumentSnapshot } from "../kernel/document/document-store";

/**
 * Verifies core document store module preserves canonical snapshot-creation behavior.
 */
test("document store module snapshot creation parity", () => {
  const module = createEngineDocumentStoreModule();

  const fromModule = module.createSnapshot({
    revision: 7,
    nodes: {
      b: {
        id: "b",
        kind: "shape",
        payload: { transformRevision: 2 },
      },
      a: {
        id: "a",
        kind: "group",
        payload: { transformRevision: 1 },
      },
    },
  });
  const fromStore = createDocumentSnapshot({
    revision: 7,
    nodes: {
      b: {
        id: "b",
        kind: "shape",
        payload: { transformRevision: 2 },
      },
      a: {
        id: "a",
        kind: "group",
        payload: { transformRevision: 1 },
      },
    },
  });

  assert.deepEqual(fromModule, fromStore);
});

/**
 * Verifies core document store module preserves canonical change-set application behavior.
 */
test("document store module change-set apply parity", () => {
  const module = createEngineDocumentStoreModule();
  const initialSnapshot = createDocumentSnapshot({
    revision: 0,
    nodes: {
      nodeA: {
        id: "nodeA",
        kind: "shape",
        payload: { geometryRevision: 1 },
      },
    },
  });
  const changeSet = {
    id: "cs-1",
    operations: [
      {
        type: "upsert-node" as const,
        node: {
          id: "nodeB",
          kind: "text" as const,
          payload: { textRevision: 2 },
        },
      },
      {
        type: "remove-node" as const,
        nodeId: "nodeA",
      },
    ],
  };

  const fromModule = module.applyChangeSet(initialSnapshot, changeSet);
  const fromStore = applyDocumentChangeSet(initialSnapshot, changeSet);

  assert.deepEqual(fromModule, fromStore);
});
