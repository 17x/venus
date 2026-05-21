import assert from "node:assert/strict";
import test from "node:test";

import { applyDocumentChangeSet, createDocumentSnapshot } from "../document-store";
import { createEngineDocumentGraphModule } from "./documentGraph";

/**
 * Verifies document-graph module snapshot creation parity with canonical document-store behavior.
 */
test("documentGraph module snapshot parity", () => {
  const module = createEngineDocumentGraphModule();
  const fromModule = module.createSnapshot({
    revision: 2,
    nodes: {
      nodeB: {
        id: "nodeB",
        kind: "shape",
        payload: { geometryRevision: 1 },
      },
      nodeA: {
        id: "nodeA",
        kind: "group",
        payload: { transformRevision: 1 },
      },
    },
  });

  const fromStore = createDocumentSnapshot({
    revision: 2,
    nodes: {
      nodeB: {
        id: "nodeB",
        kind: "shape",
        payload: { geometryRevision: 1 },
      },
      nodeA: {
        id: "nodeA",
        kind: "group",
        payload: { transformRevision: 1 },
      },
    },
  });

  assert.deepEqual(fromModule, fromStore);
});

/**
 * Verifies document-graph module change-set application parity with canonical document-store behavior.
 */
test("documentGraph module change-set parity", () => {
  const module = createEngineDocumentGraphModule();
  const snapshot = createDocumentSnapshot({
    revision: 0,
    nodes: {
      nodeA: {
        id: "nodeA",
        kind: "shape",
        payload: { transformRevision: 1 },
      },
    },
  });
  const changeSet = {
    id: "change-set-1",
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

  const fromModule = module.applyChangeSet(snapshot, changeSet);
  const fromStore = applyDocumentChangeSet(snapshot, changeSet);

  assert.deepEqual(fromModule, fromStore);
});

/**
 * Verifies removing a missing node is deterministic no-op for node table and monotonic revision update.
 */
test("documentGraph module handles missing-node removal deterministically", () => {
  const module = createEngineDocumentGraphModule();
  const snapshot = createDocumentSnapshot({
    revision: 3,
    nodes: {
      nodeA: {
        id: "nodeA",
        kind: "shape",
        payload: { transformRevision: 1 },
      },
    },
  });

  const nextSnapshot = module.applyChangeSet(snapshot, {
    id: "change-set-missing-remove",
    operations: [
      {
        type: "remove-node",
        nodeId: "node-missing",
      },
    ],
  });

  assert.deepEqual(Object.keys(nextSnapshot.nodes), ["nodeA"]);
  assert.equal(nextSnapshot.revision, 4);
});
