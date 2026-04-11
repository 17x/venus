import type { EngineNodeId, EngineRenderableNode, EngineSceneSnapshot } from './types.ts'

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

export interface MutableEngineSceneState {
  revision: string | number
  width: number
  height: number
  nodes: EngineRenderableNode[]
}

export function createMutableEngineSceneState(
  scene?: EngineSceneSnapshot,
): MutableEngineSceneState {
  if (!scene) {
    return {
      revision: 0,
      width: 0,
      height: 0,
      nodes: [],
    }
  }

  return {
    revision: scene.revision,
    width: scene.width,
    height: scene.height,
    nodes: [...scene.nodes],
  }
}

/**
 * Applies an incremental scene patch while preserving existing node order
 * whenever possible.
 */
export function applyEngineScenePatch(
  state: MutableEngineSceneState,
  patch: EngineScenePatch,
): void {
  state.revision = patch.revision

  if (patch.sceneSize) {
    state.width = patch.sceneSize.width
    state.height = patch.sceneSize.height
  }

  if (patch.replaceAll) {
    state.nodes = [...(patch.upsertNodes ?? [])]
    return
  }

  if (patch.upsertNodes && patch.upsertNodes.length > 0) {
    for (const nextNode of patch.upsertNodes) {
      const index = findNodeIndex(state.nodes, nextNode.id)
      if (index >= 0) {
        state.nodes[index] = nextNode
        continue
      }

      state.nodes.push(nextNode)
    }
  }

  if (patch.removeNodeIds && patch.removeNodeIds.length > 0) {
    const removeSet = new Set(patch.removeNodeIds)
    state.nodes = state.nodes.filter((node) => !removeSet.has(node.id))
  }
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
