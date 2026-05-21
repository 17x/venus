import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_RUNTIME_WORLD_FOUNDATION_API,
  resolveEngineRuntimeWorldFoundationApiDescriptor,
} from "../../runtime/world/runtime-world.foundation.contract";
import { createDocumentSnapshot } from "../../document/document-store";
import { createRuntimeWorldFromDocument } from "../../ecs/runtimeWorld";

/**
 * Verifies runtime world foundation API descriptor map keeps expected endpoint set.
 */
test("runtime world foundation descriptor set is complete", () => {
  assert.deepEqual(Object.keys(ENGINE_RUNTIME_WORLD_FOUNDATION_API).sort(), [
    "clear",
    "compileFromDocument",
    "getGraphStats",
    "getWorldSnapshot",
    "queryComponent",
    "queryEntity",
  ]);
});

/**
 * Verifies runtime world foundation descriptors carry required error semantics.
 */
test("runtime world foundation descriptors keep required error code", () => {
  const snapshotDescriptor = ENGINE_RUNTIME_WORLD_FOUNDATION_API.getWorldSnapshot;
  const statsDescriptor = ENGINE_RUNTIME_WORLD_FOUNDATION_API.getGraphStats;

  assert.deepEqual(snapshotDescriptor.errorCodes, ["ENGINE_WORLD_NOT_COMPILED"]);
  assert.deepEqual(statsDescriptor.errorCodes, ["ENGINE_WORLD_NOT_COMPILED"]);
  assert.equal(snapshotDescriptor.level, "foundation");
  assert.equal(statsDescriptor.level, "foundation");
  assert.equal(snapshotDescriptor.stability, "beta");
  assert.equal(statsDescriptor.stability, "beta");
});

/**
 * Verifies descriptor resolver returns canonical descriptors by map key.
 */
test("runtime world foundation descriptor resolver returns canonical entries", () => {
  assert.deepEqual(
    resolveEngineRuntimeWorldFoundationApiDescriptor("compileFromDocument"),
    ENGINE_RUNTIME_WORLD_FOUNDATION_API.compileFromDocument,
  );
  assert.deepEqual(
    resolveEngineRuntimeWorldFoundationApiDescriptor("getWorldSnapshot"),
    ENGINE_RUNTIME_WORLD_FOUNDATION_API.getWorldSnapshot,
  );
  assert.deepEqual(
    resolveEngineRuntimeWorldFoundationApiDescriptor("queryEntity"),
    ENGINE_RUNTIME_WORLD_FOUNDATION_API.queryEntity,
  );
  assert.deepEqual(
    resolveEngineRuntimeWorldFoundationApiDescriptor("queryComponent"),
    ENGINE_RUNTIME_WORLD_FOUNDATION_API.queryComponent,
  );
  assert.deepEqual(
    resolveEngineRuntimeWorldFoundationApiDescriptor("getGraphStats"),
    ENGINE_RUNTIME_WORLD_FOUNDATION_API.getGraphStats,
  );
  assert.deepEqual(
    resolveEngineRuntimeWorldFoundationApiDescriptor("clear"),
    ENGINE_RUNTIME_WORLD_FOUNDATION_API.clear,
  );
});

/**
 * Verifies runtime world snapshot generation is deterministic for identical document snapshots.
 */
test("runtime world snapshot generation stays deterministic", () => {
  const snapshot = createDocumentSnapshot({
    revision: 3,
    nodes: {
      nodeB: {
        id: "nodeB",
        kind: "shape",
        payload: {
          geometryRevision: 1,
        },
      },
      nodeA: {
        id: "nodeA",
        kind: "group",
        payload: {
          transformRevision: 1,
        },
      },
    },
  });

  const worldFirst = createRuntimeWorldFromDocument(snapshot);
  const worldSecond = createRuntimeWorldFromDocument(snapshot);

  assert.deepEqual(worldFirst, worldSecond);
  assert.equal(worldFirst.revision, snapshot.revision);
  assert.deepEqual(
    worldFirst.entities.map((entity) => entity.id),
    ["nodeA", "nodeB"],
  );
});
