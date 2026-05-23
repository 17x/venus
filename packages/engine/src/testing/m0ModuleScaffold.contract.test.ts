import assert from "node:assert/strict";
import test from "node:test";

import { createDocumentSnapshot } from "../kernel/document/document-store";
import { createEngineBackendSelectorModule } from "../backend/backendSelector/backendSelector";
import { createEngineCommandEncoderModule } from "../kernel/command-buffer/commandEncoder/commandEncoder";
import { createEngineDirtyPropagationModule } from "../kernel/dirty/dirtyPropagation/dirtyPropagation";
import { createEngineDocumentGraphModule } from "../kernel/document/documentGraph/documentGraph";
import { createEnginePublicApiSurfaceModule } from "../orchestration/api/publicApiSurface/publicApiSurface";
import { createEngineRuntimeWorldModule } from "../kernel/scene-runtime/runtimeWorld/runtimeWorld";

/**
 * Verifies newly scaffolded M0 modules can be constructed and produce deterministic baseline behavior.
 */
test("m0 module scaffold baseline behavior", () => {
  const documentGraph = createEngineDocumentGraphModule();
  const dirty = createEngineDirtyPropagationModule();
  const encoder = createEngineCommandEncoderModule();
  const backendSelector = createEngineBackendSelectorModule();
  const publicApiSurface = createEnginePublicApiSurfaceModule();
  const runtimeWorld = createEngineRuntimeWorldModule();

  const snapshot = documentGraph.createSnapshot({
    revision: 1,
    nodes: {
      nodeB: {
        id: "nodeB",
        kind: "shape",
        payload: { transformRevision: 1 },
      },
      nodeA: {
        id: "nodeA",
        kind: "group",
        payload: { transformRevision: 1 },
      },
    },
  });
  const world = runtimeWorld.buildFromDocument(snapshot);
  const dirtyState = dirty.markDirtyBatch(dirty.createEmptyState(), [
    "visibility",
    "geometry",
  ]);
  const encoded = encoder.encode([
    { id: "cmd-b", kind: "draw", payload: {} },
    { id: "cmd-a", kind: "set-state", payload: {} },
  ]);
  const selection = backendSelector.resolveSelection(
    {
      backend: "auto",
      surface: {
        width: 100,
        height: 100,
      },
    },
    [{ mode: "headless", canUse: () => true }],
  );
  const violations = publicApiSurface.validateDescriptors([
    {
      name: "engine.capability.render.renderFrame",
      level: "developer",
      stability: "stable",
    },
    {
      name: "engine.medical.load",
      level: "developer",
      stability: "experimental",
    },
  ]);

  assert.equal(snapshot.revision, 1);
  assert.deepEqual(
    Object.keys(snapshot.nodes),
    ["nodeA", "nodeB"],
  );
  assert.equal(world.entities.length, 2);
  assert.deepEqual(dirtyState.dirtyDomains, ["geometry", "visibility"]);
  assert.deepEqual(
    encoded.commands.map((command) => command.id),
    ["cmd-a", "cmd-b"],
  );
  assert.equal(selection.resolved, "headless");
  assert.equal(violations.length, 1);

  // Keep canonical document-store path in assertion chain so M0 scaffolds stay aligned.
  assert.deepEqual(snapshot, createDocumentSnapshot({ revision: 1, nodes: snapshot.nodes }));
});
