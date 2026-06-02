import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";

test("graph materials expose texture refs, sampler config, and mesh uvs", async () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
    strict3d: true,
  });

  engine.setGraph({
    revision: "texture-graph-1",
    materials: [
      {
        id: "mat-ground",
        type: "pbr",
        name: "Ground Material",
        baseColor: [1, 1, 1, 1],
        metallic: 0,
        roughness: 0.82,
        emissive: [0, 0, 0],
        emissiveIntensity: 0,
        normalScale: 1,
        aoStrength: 1,
        opacity: 1,
        transparent: false,
        alphaTest: 0,
        doubleSided: false,
        baseColorTexture: "/textures/grass_cc0_oga.png",
        baseColorTextureSampler: {
          wrapS: "repeat",
          wrapT: "repeat",
          minFilter: "linear",
          magFilter: "linear",
        },
      },
    ],
    nodes: [
      {
        id: "mesh-ground",
        kind: "mesh",
        materialId: "mat-ground",
        mesh: {
          topology: "triangles",
          materialId: "mat-ground",
          positions: [0, 0, 0, 20, 0, 0, 0, 0, 20, 20, 0, 20],
          indices: [0, 1, 2, 2, 1, 3],
          uvs: [0, 0, 2, 0, 0, 2, 2, 2],
          color: "#ffffff",
        },
      },
    ],
  });

  const graph = engine.getGraph();
  assert.equal(graph.materials?.length, 1);
  assert.equal(graph.materials?.[0]?.id, "mat-ground");
  assert.equal(graph.materials?.[0]?.type, "pbr");
  assert.equal("baseColorTexture" in (graph.materials?.[0] ?? {}), true);
  assert.deepEqual(
    graph.materials?.[0]?.type === "pbr" ? graph.materials[0].baseColorTextureSampler : undefined,
    {
      wrapS: "repeat",
      wrapT: "repeat",
      minFilter: "linear",
      magFilter: "linear",
    },
  );
  assert.deepEqual(graph.nodes[0]?.mesh?.uvs, [0, 0, 2, 0, 0, 2, 2, 2]);
  assert.equal(graph.nodes[0]?.mesh?.materialId, "mat-ground");

  await engine.render();
  engine.dispose();
});
