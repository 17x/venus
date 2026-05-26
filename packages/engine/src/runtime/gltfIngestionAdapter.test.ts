import assert from "node:assert/strict";
import test from "node:test";

import { createEngineGltfIngestionAdapter } from "./gltfIngestionAdapter";

test("glTF ingestion adapter maps nodes with default transforms", () => {
  const adapter = createEngineGltfIngestionAdapter();
  const gltf = {
    asset: { version: "2.0" },
    nodes: [{ name: "Root" }],
  };

  const asset = adapter.ingest(gltf, "test.glb");
  assert.equal(asset.metadata.sourceFormat, "gltf");
  assert.equal(asset.nodes.length, 1);
  assert.equal(asset.nodes[0].name, "Root");
  assert.deepEqual(asset.nodes[0].translation, [0, 0, 0]);
});

test("glTF ingestion adapter maps materials", () => {
  const adapter = createEngineGltfIngestionAdapter();
  const gltf = {
    asset: { version: "2.0" },
    nodes: [],
    materials: [{
      name: "Red",
      pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1], metallicFactor: 0, roughnessFactor: 0.5 },
    }],
  };

  const asset = adapter.ingest(gltf, "test.glb");
  assert.equal(asset.materials.length, 1);
  assert.equal(asset.materials[0].name, "Red");
  assert.equal(asset.materials[0].type, "pbr");
});

test("glTF ingestion adapter maps node children", () => {
  const adapter = createEngineGltfIngestionAdapter();
  const gltf = {
    asset: { version: "2.0" },
    nodes: [
      { name: "Parent", children: [1, 2] },
      { name: "Child1" },
      { name: "Child2" },
    ],
  };

  const asset = adapter.ingest(gltf, "test.glb");
  assert.deepEqual(asset.nodes[0].children, ["node-1", "node-2"]);
});
