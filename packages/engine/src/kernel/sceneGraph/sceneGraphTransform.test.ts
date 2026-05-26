import assert from "node:assert/strict";
import test from "node:test";

import { createIdentityMatrix4, transformPoint3D } from "@venus/lib/math";
import {
  composeNodeWorldMatrix,
  createIdentityLocalTransform,
  markSubtreeWorldMatrixDirty,
  resolveNodeWorldMatrix,
} from "./sceneGraphTransform";
import type { EngineSceneGraphNode } from "./sceneGraphTransform";

/**
 * Verifies that a root node with identity local transform resolves to identity world matrix.
 */
test("root node with identity local transform resolves to identity world matrix", () => {
  const node: EngineSceneGraphNode = {
    id: "root",
    parentId: null,
    localTransform: createIdentityLocalTransform(),
    worldMatrix: null,
    worldMatrixDirty: true,
  };

  const nodesById = new Map<string, EngineSceneGraphNode>([[node.id, node]]);
  const world = resolveNodeWorldMatrix(node, nodesById);

  const identity = createIdentityMatrix4();
  for (let i = 0; i < 16; i += 1) {
    assert.ok(Math.abs((world[i] ?? 0) - (identity[i] ?? 0)) < 1e-12, `element ${i} mismatch`);
  }
  assert.equal(node.worldMatrixDirty, false);
});

/**
 * Verifies child node inherits parent translation in its world matrix.
 */
test("child node world matrix inherits parent translation", () => {
  const parent: EngineSceneGraphNode = {
    id: "parent",
    parentId: null,
    localTransform: { tx: 5, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 },
    worldMatrix: null,
    worldMatrixDirty: true,
  };

  const child: EngineSceneGraphNode = {
    id: "child",
    parentId: "parent",
    localTransform: { tx: 3, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 },
    worldMatrix: null,
    worldMatrixDirty: true,
  };

  const nodesById = new Map<string, EngineSceneGraphNode>([
    [parent.id, parent],
    [child.id, child],
  ]);

  const world = resolveNodeWorldMatrix(child, nodesById);

  // Point at origin should be at (8, 0, 0) in world space.
  const result = transformPoint3D(world, 0, 0, 0);
  assert.equal(result.x, 8);
  assert.equal(result.y, 0);
  assert.equal(result.z, 0);
});

/**
 * Verifies dirty flag propagates from parent to all descendants.
 */
test("markSubtreeWorldMatrixDirty propagates to descendants", () => {
  const parent: EngineSceneGraphNode = {
    id: "parent",
    parentId: null,
    localTransform: createIdentityLocalTransform(),
    worldMatrix: createIdentityMatrix4(),
    worldMatrixDirty: false,
  };

  const child1: EngineSceneGraphNode = {
    id: "child1",
    parentId: "parent",
    localTransform: createIdentityLocalTransform(),
    worldMatrix: createIdentityMatrix4(),
    worldMatrixDirty: false,
  };

  const child2: EngineSceneGraphNode = {
    id: "child2",
    parentId: "parent",
    localTransform: createIdentityLocalTransform(),
    worldMatrix: createIdentityMatrix4(),
    worldMatrixDirty: false,
  };

  const grandchild: EngineSceneGraphNode = {
    id: "grandchild",
    parentId: "child1",
    localTransform: createIdentityLocalTransform(),
    worldMatrix: createIdentityMatrix4(),
    worldMatrixDirty: false,
  };

  const childrenMap = new Map<string, EngineSceneGraphNode[]>([
    ["parent", [child1, child2]],
    ["child1", [grandchild]],
    ["child2", []],
    ["grandchild", []],
  ]);

  markSubtreeWorldMatrixDirty(parent, (id) => childrenMap.get(id) ?? []);

  assert.equal(parent.worldMatrixDirty, true);
  assert.equal(parent.worldMatrix, null);
  assert.equal(child1.worldMatrixDirty, true);
  assert.equal(child1.worldMatrix, null);
  assert.equal(child2.worldMatrixDirty, true);
  assert.equal(child2.worldMatrix, null);
  assert.equal(grandchild.worldMatrixDirty, true);
  assert.equal(grandchild.worldMatrix, null);
});

/**
 * Verifies three-level hierarchy composes transforms correctly.
 */
test("three-level hierarchy composes local transforms in parent-first order", () => {
  const root: EngineSceneGraphNode = {
    id: "root",
    parentId: null,
    localTransform: { tx: 2, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 },
    worldMatrix: null,
    worldMatrixDirty: true,
  };

  const mid: EngineSceneGraphNode = {
    id: "mid",
    parentId: "root",
    localTransform: { tx: 0, ty: 3, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 },
    worldMatrix: null,
    worldMatrixDirty: true,
  };

  const leaf: EngineSceneGraphNode = {
    id: "leaf",
    parentId: "mid",
    localTransform: { tx: 0, ty: 0, tz: 4, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 },
    worldMatrix: null,
    worldMatrixDirty: true,
  };

  const nodesById = new Map<string, EngineSceneGraphNode>([
    [root.id, root],
    [mid.id, mid],
    [leaf.id, leaf],
  ]);

  const leafWorld = resolveNodeWorldMatrix(leaf, nodesById);

  // Leaf at (0,0,0) in local → (2, 3, 4) in world (root.x + mid.y + leaf.z).
  const result = transformPoint3D(leafWorld, 0, 0, 0);
  assert.equal(result.x, 2);
  assert.equal(result.y, 3);
  assert.equal(result.z, 4);
});

/**
 * Verifies orphaned nodes (parentId not in map) are treated as roots.
 */
test("orphaned node resolves as root with identity parent", () => {
  const orphan: EngineSceneGraphNode = {
    id: "orphan",
    parentId: "missing-parent",
    localTransform: { tx: 10, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 },
    worldMatrix: null,
    worldMatrixDirty: true,
  };

  const nodesById = new Map<string, EngineSceneGraphNode>([[orphan.id, orphan]]);
  const world = resolveNodeWorldMatrix(orphan, nodesById);

  const result = transformPoint3D(world, 0, 0, 0);
  assert.equal(result.x, 10);
});

/**
 * Verifies deep hierarchy (10 levels) produces correct accumulated world transform.
 * TP-004: parent-child transform inheritance with deep hierarchy stress.
 */
test("deep 10-level hierarchy composes accumulated translation correctly", () => {
  const nodesById = new Map<string, EngineSceneGraphNode>();
  const nodes: EngineSceneGraphNode[] = [];

  // Build chain: root → child1 → child2 → ... → child9
  // Each node translates (1, 0, 0) locally → leaf should be at (10, 0, 0).
  for (let i = 0; i < 10; i += 1) {
    const node: EngineSceneGraphNode = {
      id: `n${i}`,
      parentId: i === 0 ? null : `n${i - 1}`,
      localTransform: { tx: 1, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 },
      worldMatrix: null,
      worldMatrixDirty: true,
    };
    nodes.push(node);
    nodesById.set(node.id, node);
  }

  const leafWorld = resolveNodeWorldMatrix(nodes[9], nodesById);
  const result = transformPoint3D(leafWorld, 0, 0, 0);

  assert.equal(result.x, 10);
  assert.equal(result.y, 0);
  assert.equal(result.z, 0);

  // All nodes should now have resolved (non-dirty) world matrices.
  for (const node of nodes) {
    assert.equal(node.worldMatrixDirty, false);
    assert.ok(node.worldMatrix !== null);
  }
});

/**
 * Verifies dirty propagation in a 50-node chain only invalidates descendants.
 * TP-004: deep hierarchy dirty propagation stress.
 */
test("dirty propagation in 50-node chain only affects descendants", () => {
  const nodesById = new Map<string, EngineSceneGraphNode>();
  const nodes: EngineSceneGraphNode[] = [];

  for (let i = 0; i < 50; i += 1) {
    const node: EngineSceneGraphNode = {
      id: `n${i}`,
      parentId: i === 0 ? null : `n${i - 1}`,
      localTransform: createIdentityLocalTransform(),
      worldMatrix: createIdentityMatrix4(),
      worldMatrixDirty: false,
    };
    nodes.push(node);
    nodesById.set(node.id, node);
  }

  // Resolve all world matrices first.
  resolveNodeWorldMatrix(nodes[49], nodesById);

  // Build children lookup: each node has one child (the next in chain).
  const childrenMap = new Map<string, EngineSceneGraphNode[]>();
  for (let i = 0; i < 49; i += 1) {
    childrenMap.set(`n${i}`, [nodes[i + 1]]);
  }
  childrenMap.set("n49", []);

  // Mark node 25 as dirty.
  markSubtreeWorldMatrixDirty(nodes[25], (id) => childrenMap.get(id) ?? []);

  // Nodes 0-24 should remain clean.
  for (let i = 0; i < 25; i += 1) {
    assert.equal(nodes[i].worldMatrixDirty, false, `node ${i} should be clean`);
  }
  // Nodes 25-49 should be dirty.
  for (let i = 25; i < 50; i += 1) {
    assert.equal(nodes[i].worldMatrixDirty, true, `node ${i} should be dirty`);
  }
});
