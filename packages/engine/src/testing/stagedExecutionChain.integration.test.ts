import assert from "node:assert/strict";
import test from "node:test";

import type { EngineDocumentChangeSet } from "../kernel/document/document-contracts";
import { applyDocumentChangeSet, createDocumentSnapshot } from "../kernel/document/document-store";
import { compileDocumentChangeSet } from "../kernel/compiler/incrementalCompiler";
import { resolveStagedExecutionSnapshot } from "../orchestration/render-execution/stagedExecutionChain";

/**
 * Verifies staged execution chain runs deterministically through document->compiler->ecs->spatial->picking.
 */
test("staged execution chain deterministic integration", () => {
  const initialSnapshot = createDocumentSnapshot();
  const changeSet: EngineDocumentChangeSet = {
    id: "integration-shape-seed",
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
      {
        type: "upsert-node",
        node: {
          id: "shape-b",
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
  };

  const currentSnapshot = applyDocumentChangeSet(initialSnapshot, changeSet);
  const compile = compileDocumentChangeSet({
    previousSnapshot: initialSnapshot,
    currentSnapshot,
    changeSet,
  });

  const executionA = resolveStagedExecutionSnapshot({
    document: currentSnapshot,
    compile,
    viewport: {
      width: 40,
      height: 40,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    },
  });
  const executionB = resolveStagedExecutionSnapshot({
    document: currentSnapshot,
    compile,
    viewport: {
      width: 40,
      height: 40,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    },
  });

  assert.deepEqual(executionA, executionB);
  assert.equal(executionA.documentRevision, currentSnapshot.revision);
  assert.equal(executionA.drawCount > 0, true);
  assert.equal(executionA.pickingHitIds.length > 0, true);
});

test("staged execution visibility uses semantic world bounds and inverse viewport transform", () => {
  const initialSnapshot = createDocumentSnapshot();
  const changeSet: EngineDocumentChangeSet = {
    id: "semantic-visible-seed",
    operations: [{
      type: "upsert-node",
      node: {
        id: "visible-shape",
        kind: "shape",
        payload: {},
        semantic3d: {
          bounds: { x: 100, y: 100, z: 0, width: 20, height: 20, depth: 0 },
          transform: { x: 100, y: 100, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 },
          visible: true,
        },
      },
    }],
  };
  const currentSnapshot = applyDocumentChangeSet(initialSnapshot, changeSet);
  const compile = compileDocumentChangeSet({ previousSnapshot: initialSnapshot, currentSnapshot, changeSet });

  const execution = resolveStagedExecutionSnapshot({
    document: currentSnapshot,
    compile,
    viewport: { width: 200, height: 200, offsetX: -100, offsetY: -100, scale: 2 },
  });

  assert.deepEqual(execution.visibleCandidateIds, ["visible-shape"]);
  assert.deepEqual(execution.pickingHitIds, ["visible-shape"]);
});
