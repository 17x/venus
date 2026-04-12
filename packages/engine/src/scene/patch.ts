import type { EngineNodeId, EngineRenderableNode, EngineSceneSnapshot } from './types.ts'
import type { EngineSpatialIndex } from '../spatial/index.ts'
import {
  createEngineSceneNodeMap,
  createEngineSceneSpatialIndex,
  loadEngineSceneSpatialIndex,
  removeEngineSceneNodeSubtree,
  type EngineSceneSpatialMeta,
  upsertEngineSceneNodeSubtree,
} from './indexing.ts'

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
 */
export function applyEngineScenePatch(
  state: MutableEngineSceneState,
  patch: EngineScenePatch,
): EngineScenePatchApplyResult {
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
    for (const nextNode of patch.upsertNodes) {
      const index = findNodeIndex(state.nodes, nextNode.id)
      if (index >= 0) {
        const previousNode = state.nodes[index]
        removeEngineSceneNodeSubtree(previousNode, state.nodeMap, state.spatialIndex)
        state.nodes[index] = nextNode
        upsertEngineSceneNodeSubtree(nextNode, state.nodeMap, state.spatialIndex)
        markNodeDirtyKinds(dirtyKindsByNodeId, nextNode.id, resolveNodeDirtyKinds(previousNode, nextNode))
        continue
      }

      structureDirty = true
      state.nodes.push(nextNode)
      upsertEngineSceneNodeSubtree(nextNode, state.nodeMap, state.spatialIndex)
      markNodeDirtyKinds(dirtyKindsByNodeId, nextNode.id, ['structure', 'geometry', 'style', 'resource', 'transform'])
    }
  }

  if (patch.removeNodeIds && patch.removeNodeIds.length > 0) {
    const removeSet = new Set(patch.removeNodeIds)
    state.nodes.forEach((node) => {
      if (!removeSet.has(node.id)) {
        return
      }

      structureDirty = true
      removedNodeIds.add(node.id)
      removeEngineSceneNodeSubtree(node, state.nodeMap, state.spatialIndex)
    })
    state.nodes = state.nodes.filter((node) => !removeSet.has(node.id))
  }

  return finalizePatchApplyResult({
    dirtyKindsByNodeId,
    removedNodeIds,
    revision: state.revision,
    sceneSizeDirty,
    structureDirty,
  })
}

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

function findNodeIndex(nodes: EngineRenderableNode[], nodeId: EngineNodeId): number {
  for (let index = 0; index < nodes.length; index += 1) {
    if (nodes[index].id === nodeId) {
      return index
    }
  }

  return -1
}

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

function markNodeDirtyKinds(
  dirtyKindsByNodeId: Map<EngineNodeId, Set<EngineSceneDirtyKind>>,
  nodeId: EngineNodeId,
  kinds: readonly EngineSceneDirtyKind[],
) {
  const current = dirtyKindsByNodeId.get(nodeId) ?? new Set<EngineSceneDirtyKind>()
  kinds.forEach((kind) => current.add(kind))
  dirtyKindsByNodeId.set(nodeId, current)
}

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
