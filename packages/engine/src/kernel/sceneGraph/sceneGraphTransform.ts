import { composeMatrix4, multiplyMatrices4, createIdentityMatrix4 } from "@venus/lib/math";
import type { Mat4 } from "@venus/lib/math";

/**
 * Declares the local transform component of a scene graph node.
 * Translation, rotation (Euler XYZ in radians), and scale.
 */
export interface EngineSceneGraphLocalTransform {
  /** Translation x in world units. */
  tx: number;
  /** Translation y in world units. */
  ty: number;
  /** Translation z in world units. */
  tz: number;
  /** Rotation around x-axis in radians. */
  rx: number;
  /** Rotation around y-axis in radians. */
  ry: number;
  /** Rotation around z-axis in radians. */
  rz: number;
  /** Scale along x-axis. */
  sx: number;
  /** Scale along y-axis. */
  sy: number;
  /** Scale along z-axis. */
  sz: number;
}

/**
 * Declares one scene graph node with local transform, world matrix cache, and dirty flag.
 */
export interface EngineSceneGraphNode {
  /** Stable node identifier. */
  id: string;
  /** Parent node id, or null for root nodes. */
  parentId: string | null;
  /** Local translation, rotation, and scale. */
  localTransform: EngineSceneGraphLocalTransform;
  /** Cached world matrix, set to null when dirty. */
  worldMatrix: Mat4 | null;
  /** Whether this node's world matrix needs recomputation. */
  worldMatrixDirty: boolean;
}

/**
 * Creates a default identity local transform.
 */
export function createIdentityLocalTransform(): EngineSceneGraphLocalTransform {
  return { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 };
}

/**
 * Computes the local-to-world matrix for one node given its parent's world matrix.
 * Stores the result in the node's worldMatrix cache and clears the dirty flag.
 * @param node Scene graph node to compose.
 * @param parentWorldMatrix Parent's world matrix, or identity for root nodes.
 */
export function composeNodeWorldMatrix(
  node: EngineSceneGraphNode,
  parentWorldMatrix: Mat4,
): Mat4 {
  const local = composeMatrix4(
    node.localTransform.tx,
    node.localTransform.ty,
    node.localTransform.tz,
    node.localTransform.rx,
    node.localTransform.ry,
    node.localTransform.rz,
    node.localTransform.sx,
    node.localTransform.sy,
    node.localTransform.sz,
  );
  const world = multiplyMatrices4(parentWorldMatrix, local);
  node.worldMatrix = world;
  node.worldMatrixDirty = false;
  return world;
}

/**
 * Marks a node and all its descendants as dirty in the world matrix cache.
 * Used when a node's local transform changes; all children must recompute.
 * @param node The node whose subtree should be invalidated.
 * @param getChildren Resolver that returns child nodes for a given parent id.
 */
export function markSubtreeWorldMatrixDirty(
  node: EngineSceneGraphNode,
  getChildren: (parentId: string) => readonly EngineSceneGraphNode[],
): void {
  node.worldMatrixDirty = true;
  node.worldMatrix = null;
  const children = getChildren(node.id);
  for (const child of children) {
    markSubtreeWorldMatrixDirty(child, getChildren);
  }
}

/**
 * Resolves world matrix for one node from a flat node map, recomputing dirty ancestors as needed.
 * Maintains the invariant: a node's worldMatrix is valid iff worldMatrixDirty is false and
 * all ancestors' world matrices are also valid.
 * @param node The node whose world matrix to resolve.
 * @param nodesById Map of all nodes keyed by id.
 */
export function resolveNodeWorldMatrix(
  node: EngineSceneGraphNode,
  nodesById: ReadonlyMap<string, EngineSceneGraphNode>,
): Mat4 {
  const parentWorld = resolveParentWorldMatrix(node, nodesById);
  if (!node.worldMatrixDirty && node.worldMatrix !== null) {
    return node.worldMatrix;
  }
  return composeNodeWorldMatrix(node, parentWorld);
}

/**
 * Recursively resolves the world matrix of a node's parent chain.
 * Returns identity for root nodes (null parentId).
 */
function resolveParentWorldMatrix(
  node: EngineSceneGraphNode,
  nodesById: ReadonlyMap<string, EngineSceneGraphNode>,
): Mat4 {
  if (node.parentId === null) {
    return createIdentityMatrix4();
  }
  const parent = nodesById.get(node.parentId);
  if (!parent) {
    // Orphaned node: treat as root.
    return createIdentityMatrix4();
  }
  return resolveNodeWorldMatrix(parent, nodesById);
}
