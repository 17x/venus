import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface, type EngineSceneAsset } from "../index";

const sceneAsset: EngineSceneAsset = {
  id: "vehicle-model",
  nodes: [
    {
      id: "vehicle-body",
      name: "Vehicle Body",
      mesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        indices: [0, 1, 2],
      },
    },
  ],
};

test("runtime model namespace registers assets instances lod and diagnostics", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  const registered = engine.runtime.model.registerAsset({
    id: "vehicle-model",
    scene: sceneAsset,
    lodDistances: [10, 30],
  });
  assert.equal(registered.registeredModelCount, 1);
  assert.equal(registered.meshNodeCount, 1);

  const diagnostics = engine.runtime.model.setInstances([
    { id: "vehicle-near", modelId: "vehicle-model", translation: [0, 0, 5] },
    { id: "vehicle-far", modelId: "vehicle-model", translation: [0, 0, 40], scale: [2, 2, 2] },
  ]);
  assert.equal(diagnostics.instanceCount, 2);
  assert.equal(diagnostics.instancedModelCount, 1);
  assert.equal(diagnostics.lodResolvedInstanceCount, 2);
  assert.equal(diagnostics.missingModelInstanceCount, 0);

  const instances = engine.runtime.model.getInstances({ cameraPosition: [0, 0, 0] });
  assert.deepEqual(
    instances.map((instance) => ({ id: instance.id, lodLevel: instance.lodLevel, scale: instance.scale })),
    [
      { id: "vehicle-far", lodLevel: 2, scale: [2, 2, 2] },
      { id: "vehicle-near", lodLevel: 0, scale: [1, 1, 1] },
    ],
  );

  const unregistered = engine.runtime.model.unregisterAsset("vehicle-model");
  assert.deepEqual(unregistered, { unregistered: true, removedInstanceCount: 2 });
  assert.equal(engine.runtime.model.getDiagnostics().registeredModelCount, 0);
  assert.equal(engine.runtime.model.getDiagnostics().instanceCount, 0);
});
