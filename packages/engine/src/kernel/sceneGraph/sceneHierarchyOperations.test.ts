import assert from "node:assert/strict";
import test from "node:test";

import { wouldReparentCreateCycle } from "./sceneHierarchyOperations";
import type { EngineHierarchyNode } from "./sceneHierarchyOperations";

test("reparent to null is never a cycle", () => {
  const nodes = new Map<string, EngineHierarchyNode>();
  assert.equal(wouldReparentCreateCycle("a", null, nodes), false);
});

test("reparent to self creates cycle", () => {
  assert.equal(wouldReparentCreateCycle("a", "a", new Map()), true);
});

test("reparent to descendant creates cycle", () => {
  const nodes = new Map<string, EngineHierarchyNode>([
    ["a", { id: "a", parentId: null, children: ["b"], visible: true, locked: false, frozen: false }],
    ["b", { id: "b", parentId: "a", children: ["c"], visible: true, locked: false, frozen: false }],
    ["c", { id: "c", parentId: "b", children: [], visible: true, locked: false, frozen: false }],
  ]);

  // Reparent "a" under "c" would create a cycle: a → b → c → a.
  assert.equal(wouldReparentCreateCycle("a", "c", nodes), true);
});

test("reparent to sibling does not create cycle", () => {
  const nodes = new Map<string, EngineHierarchyNode>([
    ["a", { id: "a", parentId: null, children: ["b", "c"], visible: true, locked: false, frozen: false }],
    ["b", { id: "b", parentId: "a", children: [], visible: true, locked: false, frozen: false }],
    ["c", { id: "c", parentId: "a", children: [], visible: true, locked: false, frozen: false }],
  ]);

  assert.equal(wouldReparentCreateCycle("b", "c", nodes), false);
});
