import type { EngineNodeId, EngineRenderableNode, EngineSceneSnapshot } from '../types/types.ts'
import type { EngineSpatialIndex } from '../spatial/index.ts'
import {
  createEngineSceneNodeMap,
  createEngineSceneSpatialIndex,
  loadEngineSceneSpatialIndex,
  removeEngineSceneNodeSubtree,
  type EngineSceneSpatialMeta,
  upsertEngineSceneNodeSubtree,
} from '../indexing/indexing.ts'

export type EngineSceneDirtyKind =
  | 'structure'
  | 'geometry'
  | 'transform'
  | 'style'
  | 'resource'

export interface EngineScenePatch {
  revision: string | number
  replaceAll?: boolean
  upsertNodes?: readonly EngineRenderableNode[]
  /** Parent id used when inserting or reparenting upserted nodes. `null` targets the root list. */
  upsertParentId?: EngineNodeId | null
  /** Optional insertion index within `upsertParentId`; omitted appends to the target sibling list. */
  upsertIndex?: number
  removeNodeIds?: readonly EngineNodeId[]
  sceneSize?: {
    width: number
    height: number
  }
}

export interface EngineScenePatchBatch {
  patches: readonly EngineScenePatch[]
}

export interface EngineScenePatchApplyResult {
  revision: string | number
  structureDirty: boolean
  sceneSizeDirty: boolean
  dirtyNodeIds: readonly EngineNodeId[]
  removedNodeIds: readonly EngineNodeId[]
  dirtyKindsByNodeId: Readonly<Record<EngineNodeId, readonly EngineSceneDirtyKind[]>>
}

export interface MutableEngineSceneState {
  revision: string | number
  width: number
  height: number
  nodes: EngineRenderableNode[]
  // Node lookup and spatial index are maintained incrementally so worker and
  // interaction code do not need to rebuild coarse indexes on every patch.
  nodeMap: Map<EngineNodeId, EngineRenderableNode>
  spatialIndex: EngineSpatialIndex<EngineSceneSpatialMeta>
}

// Initialize mutable scene state from snapshot input or an empty baseline.
/**
 * Handles createMutableEngineSceneState.
 * @param scene Scene snapshot.
 */
export function createMutableEngineSceneState(
  scene?: EngineSceneSnapshot,
): MutableEngineSceneState {
  if (!scene) {
    const spatialIndex = createEngineSceneSpatialIndex()
    return {
      revision: 0,
      width: 0,
      height: 0,
      nodes: [],
      nodeMap: new Map(),
      spatialIndex,
    }
  }

  const spatialIndex = createEngineSceneSpatialIndex()
  loadEngineSceneSpatialIndex(spatialIndex, scene.nodes)
  return {
    revision: scene.revision,
    width: scene.width,
    height: scene.height,
    nodes: [...scene.nodes],
    nodeMap: createEngineSceneNodeMap(scene.nodes),
    spatialIndex,
  }
}

/**
 * Applies an incremental scene patch while preserving existing node order
 * whenever possible.
  * @param state state parameter.
 * @param patch patch parameter.
*/
export function applyEngineScenePatch(
  state: MutableEngineSceneState,
  patch: EngineScenePatch,
): EngineScenePatchApplyResult {
  validateEngineScenePatch(state, patch)
  state.revision = patch.revision
  const dirtyKindsByNodeId = new Map<EngineNodeId, Set<EngineSceneDirtyKind>>()
  const removedNodeIds = new Set<EngineNodeId>()
  let structureDirty = false
  let sceneSizeDirty = false

  if (patch.sceneSize) {
    state.width = patch.sceneSize.width
    state.height = patch.sceneSize.height
    sceneSizeDirty = true
  }

  if (patch.replaceAll) {
    structureDirty = true
    state.nodes = [...(patch.upsertNodes ?? [])]
    state.nodeMap = createEngineSceneNodeMap(state.nodes)
    loadEngineSceneSpatialIndex(state.spatialIndex, state.nodes)
    state.nodes.forEach((node) => {
      markNodeDirtyKinds(dirtyKindsByNodeId, node.id, ['structure', 'geometry', 'style', 'resource', 'transform'])
    })
    return finalizePatchApplyResult({
      dirtyKindsByNodeId,
      removedNodeIds,
      revision: state.revision,
      sceneSizeDirty,
      structureDirty,
    })
  }

  if (patch.upsertNodes && patch.upsertNodes.length > 0) {
    for (let upsertOffset = 0; upsertOffset < patch.upsertNodes.length; upsertOffset += 1) {
      const nextNode = patch.upsertNodes[upsertOffset]
      const targetParentId = patch.upsertParentId
      const targetIndex = typeof patch.upsertIndex === 'number'
        ? patch.upsertIndex + upsertOffset
        : undefined
      const location = findNodeLocation(state.nodes, nextNode.id)
      if (location) {
        const previousNode = location.node
        if (targetParentId !== undefined) {
          if (
            targetParentId === location.parentId &&
            (targetIndex === undefined || targetIndex === location.index)
          ) {
            removeEngineSceneNodeSubtree(previousNode, state.nodeMap, state.spatialIndex)
            replaceNodeAtLocation(state.nodes, location, nextNode)
            if (location.isRoot) {
              upsertEngineSceneNodeSubtree(nextNode, state.nodeMap, state.spatialIndex)
            } else {
              state.nodeMap = createEngineSceneNodeMap(state.nodes)
              loadEngineSceneSpatialIndex(state.spatialIndex, state.nodes)
            }
            markNodeDirtyKinds(dirtyKindsByNodeId, nextNode.id, resolveNodeDirtyKinds(previousNode, nextNode))
            continue
          }

          removeEngineSceneNodeSubtree(previousNode, state.nodeMap, state.spatialIndex)
          removeNodesById(state.nodes, new Set([nextNode.id]))
          insertNodeIntoParent(state.nodes, targetParentId, nextNode, targetIndex)
          state.nodeMap = createEngineSceneNodeMap(state.nodes)
          loadEngineSceneSpatialIndex(state.spatialIndex, state.nodes)
          structureDirty = true
          markNodeDirtyKinds(dirtyKindsByNodeId, nextNode.id, [
            ...resolveNodeDirtyKinds(previousNode, nextNode),
            'structure',
          ])
          continue
        }

        removeEngineSceneNodeSubtree(previousNode, state.nodeMap, state.spatialIndex)
        replaceNodeAtLocation(state.nodes, location, nextNode)
        if (location.isRoot) {
          upsertEngineSceneNodeSubtree(nextNode, state.nodeMap, state.spatialIndex)
        } else {
          state.nodeMap = createEngineSceneNodeMap(state.nodes)
          loadEngineSceneSpatialIndex(state.spatialIndex, state.nodes)
        }
        markNodeDirtyKinds(dirtyKindsByNodeId, nextNode.id, resolveNodeDirtyKinds(previousNode, nextNode))
        continue
      }

      structureDirty = true
      if (targetParentId !== undefined) {
        insertNodeIntoParent(state.nodes, targetParentId, nextNode, targetIndex)
        state.nodeMap = createEngineSceneNodeMap(state.nodes)
        loadEngineSceneSpatialIndex(state.spatialIndex, state.nodes)
      } else {
        state.nodes.push(nextNode)
        upsertEngineSceneNodeSubtree(nextNode, state.nodeMap, state.spatialIndex)
      }
      markNodeDirtyKinds(dirtyKindsByNodeId, nextNode.id, ['structure', 'geometry', 'style', 'resource', 'transform'])
    }
  }

  if (patch.removeNodeIds && patch.removeNodeIds.length > 0) {
    const removeSet = new Set(patch.removeNodeIds)
    const removedNodes = removeNodesById(state.nodes, removeSet)
    if (removedNodes.length > 0) {
      structureDirty = true
      removedNodes.forEach((node) => {
        removedNodeIds.add(node.id)
        removeEngineSceneNodeSubtree(node, state.nodeMap, state.spatialIndex)
      })
      state.nodeMap = createEngineSceneNodeMap(state.nodes)
      loadEngineSceneSpatialIndex(state.spatialIndex, state.nodes)
    }
  }

  return finalizePatchApplyResult({
    dirtyKindsByNodeId,
    removedNodeIds,
    revision: state.revision,
    sceneSizeDirty,
    structureDirty,
  })
}

// Apply multiple patches and merge dirty markers into one summarized result.
/**
 * Handles applyEngineScenePatchBatch.
 * @param state state parameter.
 * @param batch batch parameter.
 */
export function applyEngineScenePatchBatch(
  state: MutableEngineSceneState,
  batch: EngineScenePatchBatch,
) {
  // Batch apply is the preferred write path. It lets callers merge many small
  // edits into one scene-state/index update pass before render or worker sync.
  const dirtyKindsByNodeId = new Map<EngineNodeId, Set<EngineSceneDirtyKind>>()
  const removedNodeIds = new Set<EngineNodeId>()
  let structureDirty = false
  let sceneSizeDirty = false

  batch.patches.forEach((patch) => {
    const result = applyEngineScenePatch(state, patch)
    structureDirty = structureDirty || result.structureDirty
    sceneSizeDirty = sceneSizeDirty || result.sceneSizeDirty
    result.dirtyNodeIds.forEach((nodeId) => {
      markNodeDirtyKinds(
        dirtyKindsByNodeId,
        nodeId,
        result.dirtyKindsByNodeId[nodeId] ?? [],
      )
    })
    result.removedNodeIds.forEach((nodeId) => {
      removedNodeIds.add(nodeId)
    })
  })

  return finalizePatchApplyResult({
    dirtyKindsByNodeId,
    removedNodeIds,
    revision: state.revision,
    sceneSizeDirty,
    structureDirty,
  })
}

function validateEngineScenePatch(
  state: MutableEngineSceneState,
  patch: EngineScenePatch,
): void {
  if (!patch.upsertNodes || patch.upsertNodes.length === 0 || patch.upsertParentId === undefined) {
    return
  }

  const targetParentId = patch.upsertParentId
  if (targetParentId !== null && !hasGroupNode(state.nodes, targetParentId)) {
    const firstNodeId = patch.upsertNodes[0]?.id ?? '<unknown>'
    throw new Error(`Cannot upsert node "${firstNodeId}": parent "${targetParentId}" was not found or is not a group`)
  }

  for (const nextNode of patch.upsertNodes) {
    const location = findNodeLocation(state.nodes, nextNode.id)
    if (!location || targetParentId === null) {
      continue
    }

    if (nodeContainsId(location.node, targetParentId)) {
      throw new Error(`Cannot reparent node "${nextNode.id}" into its own descendant "${targetParentId}"`)
    }
  }
}

// Flatten hierarchical group nodes into pre-order sequence for index-based lookups.
/**
 * Handles flattenEngineSceneNodes.
 * @param nodes nodes parameter.
 */
export function flattenEngineSceneNodes(
  nodes: readonly EngineRenderableNode[],
): EngineRenderableNode[] {
  const flattened: EngineRenderableNode[] = []
  const walk = (entryNodes: readonly EngineRenderableNode[]) => {
    for (const node of entryNodes) {
      flattened.push(node)
      if (node.type === 'group') {
        walk(node.children)
      }
    }
  }

  walk(nodes)
  return flattened
}

// Resolve a node by flattened traversal index without exposing traversal details to callers.
/**
 * Handles resolveNodeByFlattenedIndex.
 * @param nodes nodes parameter.
 * @param targetIndex targetIndex parameter.
 */
export function resolveNodeByFlattenedIndex(
  nodes: readonly EngineRenderableNode[],
  targetIndex: number,
): EngineRenderableNode | null {
  if (targetIndex < 0) {
    return null
  }

  const flattenedNodes = flattenEngineSceneNodes(nodes)
  return flattenedNodes[targetIndex] ?? null
}

interface EngineNodeLocation {
  node: EngineRenderableNode
  index: number
  isRoot: boolean
  parentId: EngineNodeId | null
}

// Resolve one node location by id so patches can update nested group children in place.
function findNodeLocation(
  nodes: EngineRenderableNode[],
  nodeId: EngineNodeId,
  parentId: EngineNodeId | null = null,
): EngineNodeLocation | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.id === nodeId) {
      return {node, index, isRoot: parentId === null, parentId}
    }

    if (node.type === 'group') {
      const childLocation = findNodeLocation([...node.children], nodeId, node.id)
      if (childLocation) {
        return childLocation
      }
    }
  }

  return null
}

// Replace one node and refresh immutable parent child arrays as needed.
function replaceNodeAtLocation(
  rootNodes: EngineRenderableNode[],
  location: EngineNodeLocation,
  nextNode: EngineRenderableNode,
): void {
  if (location.isRoot) {
    rootNodes[location.index] = nextNode
    return
  }

  const replaceInChildren = (nodes: EngineRenderableNode[]): boolean => {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]
      if (node.type !== 'group') {
        continue
      }

      const childIndex = node.children.findIndex((child) => child.id === location.node.id)
      if (childIndex >= 0) {
        const nextChildren = [...node.children]
        nextChildren[childIndex] = nextNode
        nodes[index] = {...node, children: nextChildren}
        return true
      }

      const nestedChildren = [...node.children]
      if (replaceInChildren(nestedChildren)) {
        nodes[index] = {...node, children: nestedChildren}
        return true
      }
    }

    return false
  }

  replaceInChildren(rootNodes)
}

// Inserts a node into root or one group node while preserving immutable child arrays.
function insertNodeIntoParent(
  rootNodes: EngineRenderableNode[],
  parentId: EngineNodeId | null,
  node: EngineRenderableNode,
  index?: number,
): void {
  if (parentId === null) {
    insertNodeIntoSiblings(rootNodes, node, index)
    return
  }

  const insertInChildren = (nodes: EngineRenderableNode[]): boolean => {
    for (let entryIndex = 0; entryIndex < nodes.length; entryIndex += 1) {
      const entry = nodes[entryIndex]
      if (entry.type !== 'group') {
        continue
      }

      if (entry.id === parentId) {
        const nextChildren = [...entry.children]
        insertNodeIntoSiblings(nextChildren, node, index)
        nodes[entryIndex] = {...entry, children: nextChildren}
        return true
      }

      const nestedChildren = [...entry.children]
      if (insertInChildren(nestedChildren)) {
        nodes[entryIndex] = {...entry, children: nestedChildren}
        return true
      }
    }

    return false
  }

  if (!insertInChildren(rootNodes)) {
    throw new Error(`Cannot upsert node "${node.id}": parent "${parentId}" was not found or is not a group`)
  }
}

function insertNodeIntoSiblings(
  siblings: EngineRenderableNode[],
  node: EngineRenderableNode,
  index?: number,
): void {
  if (typeof index !== 'number' || !Number.isFinite(index)) {
    siblings.push(node)
    return
  }

  const clampedIndex = Math.max(0, Math.min(siblings.length, Math.trunc(index)))
  siblings.splice(clampedIndex, 0, node)
}

function nodeContainsId(node: EngineRenderableNode, nodeId: EngineNodeId): boolean {
  if (node.id === nodeId) {
    return true
  }

  if (node.type !== 'group') {
    return false
  }

  return node.children.some((child) => nodeContainsId(child, nodeId))
}

function hasGroupNode(nodes: readonly EngineRenderableNode[], nodeId: EngineNodeId): boolean {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node.type === 'group'
    }

    if (node.type === 'group' && hasGroupNode(node.children, nodeId)) {
      return true
    }
  }

  return false
}

// Removes matching nodes at any depth and refreshes parent child arrays.
function removeNodesById(
  nodes: EngineRenderableNode[],
  removeSet: ReadonlySet<EngineNodeId>,
): EngineRenderableNode[] {
  const removedNodes: EngineRenderableNode[] = []
  const nextRootNodes: EngineRenderableNode[] = []

  for (const node of nodes) {
    if (removeSet.has(node.id)) {
      removedNodes.push(node)
      continue
    }

    if (node.type === 'group') {
      const nextChildren: EngineRenderableNode[] = []
      for (const child of node.children) {
        if (removeSet.has(child.id)) {
          removedNodes.push(child)
          continue
        }

        if (child.type === 'group') {
          const childChildren = [...child.children]
          const nestedRemoved = removeNodesById(childChildren, removeSet)
          removedNodes.push(...nestedRemoved)
          nextChildren.push({...child, children: childChildren})
          continue
        }

        nextChildren.push(child)
      }
      nextRootNodes.push({...node, children: nextChildren})
      continue
    }

    nextRootNodes.push(node)
  }

  nodes.splice(0, nodes.length, ...nextRootNodes)
  return removedNodes
}

// Compare node payloads and classify which render/index domains should be invalidated.
/**
 * Handles resolveNodeDirtyKinds.
 * @param previous previous parameter.
 * @param next next parameter.
 */
function resolveNodeDirtyKinds(
  previous: EngineRenderableNode,
  next: EngineRenderableNode,
): EngineSceneDirtyKind[] {
  if (previous.type !== next.type) {
    return ['structure', 'geometry', 'style', 'resource', 'transform']
  }

  const kinds = new Set<EngineSceneDirtyKind>()
  if (JSON.stringify(previous.transform ?? null) !== JSON.stringify(next.transform ?? null)) {
    kinds.add('transform')
  }

  if (previous.opacity !== next.opacity || previous.blendMode !== next.blendMode) {
    kinds.add('style')
  }

  switch (next.type) {
    case 'image': {
      const previousImage = previous as Extract<EngineRenderableNode, {type: 'image'}>
      if (
        previousImage.x !== next.x ||
        previousImage.y !== next.y ||
        previousImage.width !== next.width ||
        previousImage.height !== next.height ||
        JSON.stringify(previousImage.sourceRect ?? null) !== JSON.stringify(next.sourceRect ?? null)
      ) {
        kinds.add('geometry')
      }
      if (
        previousImage.assetId !== next.assetId ||
        previousImage.imageSmoothing !== next.imageSmoothing ||
        JSON.stringify(previousImage.naturalSize ?? null) !== JSON.stringify(next.naturalSize ?? null)
      ) {
        kinds.add('resource')
      }
      break
    }
    case 'text': {
      const previousText = previous as Extract<EngineRenderableNode, {type: 'text'}>
      if (
        previousText.x !== next.x ||
        previousText.y !== next.y ||
        previousText.width !== next.width ||
        previousText.height !== next.height ||
        previousText.wrap !== next.wrap
      ) {
        kinds.add('geometry')
      }
      if (JSON.stringify(previousText.style) !== JSON.stringify(next.style)) {
        kinds.add('style')
      }
      if (
        previousText.text !== next.text ||
        JSON.stringify(previousText.runs ?? null) !== JSON.stringify(next.runs ?? null)
      ) {
        kinds.add('resource')
      }
      break
    }
    case 'group': {
      const previousGroup = previous as Extract<EngineRenderableNode, {type: 'group'}>
      if (JSON.stringify(previousGroup.children) !== JSON.stringify(next.children)) {
        kinds.add('structure')
        kinds.add('geometry')
      }
      break
    }
    case 'shape': {
      const previousShape = previous as Extract<EngineRenderableNode, {type: 'shape'}>
      if (
        previousShape.shape !== next.shape ||
        previousShape.x !== next.x ||
        previousShape.y !== next.y ||
        previousShape.width !== next.width ||
        previousShape.height !== next.height ||
        JSON.stringify(previousShape.points ?? null) !== JSON.stringify(next.points ?? null) ||
        JSON.stringify(previousShape.bezierPoints ?? null) !== JSON.stringify(next.bezierPoints ?? null) ||
        previousShape.closed !== next.closed
      ) {
        kinds.add('geometry')
      }
      if (
        previousShape.fill !== next.fill ||
        previousShape.stroke !== next.stroke ||
        previousShape.strokeWidth !== next.strokeWidth
      ) {
        kinds.add('style')
      }
      break
    }
  }

  if (kinds.size === 0) {
    kinds.add('geometry')
  }

  return Array.from(kinds)
}

// Merge dirty-kind flags per node across incremental patch operations.
/**
 * Handles markNodeDirtyKinds.
 * @param dirtyKindsByNodeId dirtyKindsByNodeId parameter.
 * @param nodeId nodeId parameter.
 * @param kinds kinds parameter.
 */
function markNodeDirtyKinds(
  dirtyKindsByNodeId: Map<EngineNodeId, Set<EngineSceneDirtyKind>>,
  nodeId: EngineNodeId,
  kinds: readonly EngineSceneDirtyKind[],
) {
  const current = dirtyKindsByNodeId.get(nodeId) ?? new Set<EngineSceneDirtyKind>()
  kinds.forEach((kind) => current.add(kind))
  dirtyKindsByNodeId.set(nodeId, current)
}

// Freeze mutable patch bookkeeping structures into a serializable apply result.
/**
 * Handles finalizePatchApplyResult.
 * @param options Options object for this operation.
 */
function finalizePatchApplyResult(options: {
  revision: string | number
  structureDirty: boolean
  sceneSizeDirty: boolean
  dirtyKindsByNodeId: Map<EngineNodeId, Set<EngineSceneDirtyKind>>
  removedNodeIds: Set<EngineNodeId>
}): EngineScenePatchApplyResult {
  const dirtyKindsByNodeIdRecord: Record<EngineNodeId, readonly EngineSceneDirtyKind[]> = {}

  options.dirtyKindsByNodeId.forEach((kinds, nodeId) => {
    dirtyKindsByNodeIdRecord[nodeId] = Array.from(kinds)
  })

  return {
    revision: options.revision,
    structureDirty: options.structureDirty,
    sceneSizeDirty: options.sceneSizeDirty,
    dirtyNodeIds: Array.from(options.dirtyKindsByNodeId.keys()),
    removedNodeIds: Array.from(options.removedNodeIds),
    dirtyKindsByNodeId: dirtyKindsByNodeIdRecord,
  }
}
