import assert from "node:assert/strict";
import test from "node:test";

import { createEngineCompilerModule } from "../kernel/core/compiler/incremental-compiler-module";
import { compileDocumentChangeSet } from "../kernel/compiler/incrementalCompiler";
import { createDocumentSnapshot } from "../kernel/document/document-store";

/**
 * Verifies core compiler module keeps canonical compile behavior deterministic.
 */
test("compiler module compile parity", () => {
  const compilerModule = createEngineCompilerModule();
  const previousSnapshot = createDocumentSnapshot();
  const currentSnapshot = createDocumentSnapshot({
    revision: 1,
    nodes: {
      n1: {
        id: "n1",
        kind: "shape",
        payload: {
          transformRevision: 1,
          geometryRevision: 1,
          materialRevision: 1,
          visibilityRevision: 1,
          pickingRevision: 1,
          gpuUploadRevision: 1,
        },
      },
    },
  });
  const changeSet = {
    id: "compile-1",
    operations: [
      {
        type: "upsert-node" as const,
        node: {
          id: "n1",
          kind: "shape" as const,
          payload: {
            transformRevision: 1,
            geometryRevision: 1,
            materialRevision: 1,
            visibilityRevision: 1,
            pickingRevision: 1,
            gpuUploadRevision: 1,
          },
        },
      },
    ],
  };

  const fromModule = compilerModule.compileChangeSet({
    previousSnapshot,
    currentSnapshot,
    changeSet,
  });
  const fromCanonical = compileDocumentChangeSet({
    previousSnapshot,
    currentSnapshot,
    changeSet,
  });

  assert.deepEqual(fromModule, fromCanonical);
});
