import assert from "node:assert/strict";
import test from "node:test";

import { compileDocumentChangeSet } from "../incrementalCompiler";
import { createDocumentSnapshot } from "../../document/document-store";
import { createEngineSceneCompilerModule } from "./sceneCompiler";

/**
 * Verifies scene-compiler module compile output parity with canonical incremental compiler behavior.
 */
test("sceneCompiler module compile parity", () => {
  const module = createEngineSceneCompilerModule();
  const previousSnapshot = createDocumentSnapshot({
    revision: 1,
    nodes: {
      nodeA: {
        id: "nodeA",
        kind: "shape",
        payload: { transformRevision: 1, geometryRevision: 1 },
      },
    },
  });
  const currentSnapshot = createDocumentSnapshot({
    revision: 2,
    nodes: {
      nodeA: {
        id: "nodeA",
        kind: "shape",
        payload: { transformRevision: 2, geometryRevision: 1 },
      },
    },
  });
  const changeSet = {
    id: "change-set-1",
    operations: [
      {
        type: "upsert-node" as const,
        node: {
          id: "nodeA",
          kind: "shape" as const,
          payload: { transformRevision: 2, geometryRevision: 1 },
        },
      },
    ],
  };

  const fromModule = module.compileChangeSet({
    previousSnapshot,
    currentSnapshot,
    changeSet,
  });
  const fromCompiler = compileDocumentChangeSet({
    previousSnapshot,
    currentSnapshot,
    changeSet,
  });

  assert.deepEqual(fromModule, fromCompiler);
});

/**
 * Verifies remove-node path marks all invalidation lanes to keep runtime cleanup conservative.
 */
test("sceneCompiler module remove-node invalidation fan-out", () => {
  const module = createEngineSceneCompilerModule();
  const previousSnapshot = createDocumentSnapshot({
    revision: 1,
    nodes: {
      nodeA: {
        id: "nodeA",
        kind: "shape",
        payload: { transformRevision: 1, geometryRevision: 1 },
      },
    },
  });
  const currentSnapshot = createDocumentSnapshot({
    revision: 2,
    nodes: {},
  });

  const output = module.compileChangeSet({
    previousSnapshot,
    currentSnapshot,
    changeSet: {
      id: "remove-node-change-set",
      operations: [
        {
          type: "remove-node",
          nodeId: "nodeA",
        },
      ],
    },
  });

  assert.deepEqual(output.invalidation, {
    transform: true,
    geometry: true,
    material: true,
    text: true,
    visibility: true,
    picking: true,
    gpuUpload: true,
  });
});
