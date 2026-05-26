/**
 * Declares scene hierarchy operations for entity tree manipulation.
 */
export interface EngineSceneHierarchyOperations {
  /** Reparents one node to a new parent. Returns false if cycle would be created. */
  reparent(nodeId: string, newParentId: string | null): boolean;
  /** Sets the visibility of one node and optionally its descendants. */
  setVisibility(nodeId: string, visible: boolean, propagateToDescendants: boolean): void;
  /** Locks one node to prevent selection and transform changes. */
  lock(nodeId: string): void;
  /** Unlocks one previously locked node. */
  unlock(nodeId: string): void;
  /** Freezes one node to prevent all mutations (visibility, transform, selection). */
  freeze(nodeId: string): void;
  /** Unfreezes one previously frozen node. */
  unfreeze(nodeId: string): void;
  /** Returns whether one node is currently visible. */
  isVisible(nodeId: string): boolean;
  /** Returns whether one node is currently locked. */
  isLocked(nodeId: string): boolean;
  /** Returns whether one node is currently frozen. */
  isFrozen(nodeId: string): boolean;
}

/**
 * Declares one hierarchy node record for scene tree management.
 */
export interface EngineHierarchyNode {
  /** Stable node id. */
  id: string;
  /** Parent node id or null. */
  parentId: string | null;
  /** Child node ids. */
  children: readonly string[];
  /** Visibility flag. */
  visible: boolean;
  /** Lock flag. */
  locked: boolean;
  /** Freeze flag. */
  frozen: boolean;
}

/**
 * Detects whether reparenting would create a cycle in the hierarchy.
 * @param nodeId The node to reparent.
 * @param newParentId Proposed new parent.
 * @param nodesById Map of all hierarchy nodes.
 */
export function wouldReparentCreateCycle(
  nodeId: string,
  newParentId: string | null,
  nodesById: ReadonlyMap<string, EngineHierarchyNode>,
): boolean {
  if (newParentId === null) {
    return false;
  }
  if (newParentId === nodeId) {
    return true;
  }
  let current: string | null = newParentId;
  while (current !== null) {
    if (current === nodeId) {
      return true;
    }
    const parent = nodesById.get(current);
    current = parent?.parentId ?? null;
  }
  return false;
}
