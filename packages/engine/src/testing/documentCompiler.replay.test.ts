import assert from "node:assert/strict";
import test from "node:test";

import type { EngineDocumentChangeSet } from "../kernel/document/document-contracts";
import { applyDocumentChangeSet, createDocumentSnapshot } from "../kernel/document/document-store";
import { compileDocumentChangeSet } from "../kernel/compiler/incrementalCompiler";

/**
 * Runs one deterministic replay sequence and returns final snapshot and compile outputs.
 * @param changeSets Ordered change-set sequence.
 */
function runReplaySequence(changeSets: readonly EngineDocumentChangeSet[]) {
  let snapshot = createDocumentSnapshot();
  const compileOutputs = [];

  for (const changeSet of changeSets) {
    const nextSnapshot = applyDocumentChangeSet(snapshot, changeSet);
    const compileOutput = compileDocumentChangeSet({
      previousSnapshot: snapshot,
      currentSnapshot: nextSnapshot,
      changeSet,
    });
    compileOutputs.push(compileOutput);
    snapshot = nextSnapshot;
  }

  return {
    snapshot,
    compileOutputs,
  };
}

/**
 * Verifies repeated replay of the same change-set sequence is deterministic.
 */
test("document/compiler replay sequence is deterministic", () => {
  const changeSets: readonly EngineDocumentChangeSet[] = [
    {
      id: "cs-1",
      operations: [
        {
          type: "upsert-node",
          node: {
            id: "shape-a",
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
      ],
    },
    {
      id: "cs-2",
      operations: [
        {
          type: "upsert-node",
          node: {
            id: "shape-a",
            kind: "shape",
            payload: {
              transformRevision: 2,
              geometryRevision: 1,
              materialRevision: 1,
              visibilityRevision: 1,
              pickingRevision: 1,
              gpuUploadRevision: 1,
            },
          },
        },
      ],
    },
    {
      id: "cs-3",
      operations: [
        {
          type: "remove-node",
          nodeId: "shape-a",
        },
      ],
    },
  ];

  const runA = runReplaySequence(changeSets);
  const runB = runReplaySequence(changeSets);

  assert.deepEqual(runA.snapshot, runB.snapshot);
  assert.deepEqual(runA.compileOutputs, runB.compileOutputs);
});

/**
 * Verifies compiler invalidation summary reflects changed revision categories.
 */
test("document/compiler invalidation categories reflect revision transitions", () => {
  const initialSnapshot = createDocumentSnapshot();
  const createChangeSet: EngineDocumentChangeSet = {
    id: "create-text",
    operations: [
      {
        type: "upsert-node",
        node: {
          id: "text-a",
          kind: "text",
          payload: {
            textRevision: 1,
            visibilityRevision: 1,
            gpuUploadRevision: 1,
          },
        },
      },
    ],
  };

  const createdSnapshot = applyDocumentChangeSet(initialSnapshot, createChangeSet);
  const createCompileOutput = compileDocumentChangeSet({
    previousSnapshot: initialSnapshot,
    currentSnapshot: createdSnapshot,
    changeSet: createChangeSet,
  });

  assert.equal(createCompileOutput.invalidation.text, true);
  assert.equal(createCompileOutput.invalidation.visibility, true);
  assert.equal(createCompileOutput.invalidation.gpuUpload, true);

  const updateChangeSet: EngineDocumentChangeSet = {
    id: "update-text-only",
    operations: [
      {
        type: "upsert-node",
        node: {
          id: "text-a",
          kind: "text",
          payload: {
            textRevision: 2,
            visibilityRevision: 1,
            gpuUploadRevision: 1,
          },
        },
      },
    ],
  };

  const updatedSnapshot = applyDocumentChangeSet(createdSnapshot, updateChangeSet);
  const updateCompileOutput = compileDocumentChangeSet({
    previousSnapshot: createdSnapshot,
    currentSnapshot: updatedSnapshot,
    changeSet: updateChangeSet,
  });

  assert.equal(updateCompileOutput.invalidation.text, true);
  assert.equal(updateCompileOutput.invalidation.visibility, false);
  assert.equal(updateCompileOutput.invalidation.gpuUpload, false);
});
