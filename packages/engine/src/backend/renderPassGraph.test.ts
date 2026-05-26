import assert from "node:assert/strict";
import test from "node:test";

import { createEmptyRenderPassGraph, topologicalSortPasses } from "./renderPassGraph";
import type { EngineRenderPass } from "./renderPassGraph";

test("empty render pass graph has no passes or targets", () => {
  const graph = createEmptyRenderPassGraph();
  assert.equal(graph.passes.length, 0);
  assert.equal(graph.targets.length, 0);
});

test("topological sort orders passes by dependency", () => {
  const passes: EngineRenderPass[] = [
    { id: "a", name: "A", targetId: null, dependencies: [], enabled: true },
    { id: "b", name: "B", targetId: null, dependencies: ["a"], enabled: true },
    { id: "c", name: "C", targetId: null, dependencies: ["b"], enabled: true },
  ];

  const sorted = topologicalSortPasses(passes);
  assert.deepEqual(sorted.map((p) => p.id), ["a", "b", "c"]);
});

test("topological sort handles independent passes", () => {
  const passes: EngineRenderPass[] = [
    { id: "a", name: "A", targetId: null, dependencies: [], enabled: true },
    { id: "b", name: "B", targetId: null, dependencies: [], enabled: true },
  ];

  const sorted = topologicalSortPasses(passes);
  const ids = sorted.map((p) => p.id);
  assert.ok(ids.includes("a") && ids.includes("b"));
  assert.equal(ids.length, 2);
});

test("topological sort returns original order on cyclic graph", () => {
  const passes: EngineRenderPass[] = [
    { id: "a", name: "A", targetId: null, dependencies: ["b"], enabled: true },
    { id: "b", name: "B", targetId: null, dependencies: ["a"], enabled: true },
  ];

  const sorted = topologicalSortPasses(passes);
  assert.deepEqual(sorted.map((p) => p.id), ["a", "b"]);
});

test("topological sort handles diamond dependency", () => {
  const passes: EngineRenderPass[] = [
    { id: "a", name: "A", targetId: null, dependencies: [], enabled: true },
    { id: "b", name: "B", targetId: null, dependencies: ["a"], enabled: true },
    { id: "c", name: "C", targetId: null, dependencies: ["a"], enabled: true },
    { id: "d", name: "D", targetId: null, dependencies: ["b", "c"], enabled: true },
  ];

  const sorted = topologicalSortPasses(passes);
  // D must come after B and C, which come after A.
  const ids = sorted.map((p) => p.id);
  assert.equal(ids[0], "a");
  assert.equal(ids[ids.length - 1], "d");
  assert.ok(ids.indexOf("b") < ids.indexOf("d"));
  assert.ok(ids.indexOf("c") < ids.indexOf("d"));
});
