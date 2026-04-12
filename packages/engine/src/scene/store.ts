import {hitTestEngineSceneState, type EngineHitTestResult} from './hitTest.ts'
import {
  applyEngineScenePatch,
  applyEngineScenePatchBatch,
  createMutableEngineSceneState,
  type EngineScenePatch,
  type EngineScenePatchApplyResult,
  type EngineScenePatchBatch,
  type MutableEngineSceneState,
} from './patch.ts'
import type {
  EngineNodeId,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
} from './types.ts'
import {
  createEngineSceneBufferLayout,
  type EngineSceneBufferLayout,
  syncEngineSceneBufferLayout,
  writeSceneToBufferLayout,
} from './buffer.ts'

export interface EngineSceneStoreDiagnostics {
  revision: string | number
  nodeCount: number
  indexedNodeCount: number
  planVersion: number
  bufferVersion: number
  width: number
  height: number
}

export interface EngineSceneStoreTransaction {
  insertNodes(nodes: readonly EngineRenderableNode[]): void
  updateNodes(nodes: readonly EngineRenderableNode[]): void
  removeNodeIds(ids: readonly EngineNodeId[]): void
  resizeScene(size: {width: number; height: number}): void
}

export interface EngineSceneStore {
  loadScene(scene: EngineSceneSnapshot): EngineScenePatchApplyResult
  applyScenePatch(patch: EngineScenePatch): EngineScenePatchApplyResult
  applyScenePatchBatch(batch: EngineScenePatchBatch): EngineScenePatchApplyResult
  transaction(
    run: (transaction: EngineSceneStoreTransaction) => void,
    options?: {revision?: string | number},
  ): EngineScenePatchApplyResult | null
  query(bounds: EngineRect): EngineNodeId[]
  hitTest(point: {x: number; y: number}, tolerance?: number): EngineHitTestResult | null
  getNode(nodeId: EngineNodeId): EngineRenderableNode | null
  getSnapshot(): EngineSceneSnapshot
  getMutableState(): MutableEngineSceneState
  getBufferLayout(): EngineSceneBufferLayout
  getDiagnostics(): EngineSceneStoreDiagnostics
}

export interface CreateEngineSceneStoreOptions {
  initialScene?: EngineSceneSnapshot
}

/**
 * Engine-owned scene store.
 *
 * Responsibility split:
 * - runtime/app layers keep document truth and produce scene patches
 * - engine owns render-facing state, indexes, and query/hit-test surfaces
 *
 * This keeps buffer/index evolution inside engine without forcing external
 * callers to mutate low-level memory structures directly.
 */
export function createEngineSceneStore(
  options: CreateEngineSceneStoreOptions = {},
): EngineSceneStore {
  const state = createMutableEngineSceneState(options.initialScene)
  const snapshot: EngineSceneSnapshot = {
    revision: state.revision,
    width: state.width,
    height: state.height,
    nodes: state.nodes,
    metadata: {
      planVersion: 0,
      bufferVersion: 0,
      dirtyNodeIds: [],
      removedNodeIds: [],
    },
  }
  const bufferLayout = createEngineSceneBufferLayout(snapshot)

  const syncSceneArtifacts = (result: EngineScenePatchApplyResult) => {
    snapshot.revision = state.revision
    snapshot.width = state.width
    snapshot.height = state.height
    snapshot.nodes = state.nodes
    snapshot.metadata = {
      planVersion: (snapshot.metadata?.planVersion ?? 0) + 1,
      bufferVersion: (snapshot.metadata?.bufferVersion ?? 0) + 1,
      dirtyNodeIds: result.dirtyNodeIds,
      removedNodeIds: result.removedNodeIds,
      bufferLayout,
    }
    try {
      syncEngineSceneBufferLayout(bufferLayout, snapshot, {
        dirtyNodeIds: result.dirtyNodeIds,
        removedNodeIds: result.removedNodeIds,
        structureDirty: result.structureDirty,
      })
    } catch {
      writeSceneToBufferLayout(bufferLayout, state.nodes)
    }
    return result
  }

  const loadScene = (scene: EngineSceneSnapshot) => {
    return syncSceneArtifacts(applyEngineScenePatch(state, {
      revision: scene.revision,
      replaceAll: true,
      upsertNodes: scene.nodes,
      sceneSize: {
        width: scene.width,
        height: scene.height,
      },
    }))
  }

  const applyScenePatch = (patch: EngineScenePatch) => {
    return syncSceneArtifacts(applyEngineScenePatch(state, patch))
  }

  const applyScenePatchBatch = (batch: EngineScenePatchBatch) => {
    return syncSceneArtifacts(applyEngineScenePatchBatch(state, batch))
  }

  const transaction = (
    run: (transaction: EngineSceneStoreTransaction) => void,
    options?: {revision?: string | number},
  ) => {
    const patches: EngineScenePatch[] = []
    let pendingSceneSize: {width: number; height: number} | null = null

    const queuePatch = (patch: Omit<EngineScenePatch, 'revision'>) => {
      patches.push({
        revision: 0,
        ...patch,
      })
    }

    run({
      insertNodes(nodes) {
        if (nodes.length === 0) {
          return
        }
        queuePatch({
          upsertNodes: nodes,
        })
      },
      updateNodes(nodes) {
        if (nodes.length === 0) {
          return
        }
        queuePatch({
          upsertNodes: nodes,
        })
      },
      removeNodeIds(ids) {
        if (ids.length === 0) {
          return
        }
        queuePatch({
          removeNodeIds: ids,
        })
      },
      resizeScene(size) {
        pendingSceneSize = size
      },
    })

    if (patches.length === 0 && !pendingSceneSize) {
      return null
    }

    const revision = options?.revision ?? resolveNextSceneRevision(state.revision)
    const normalizedPatches = patches.map((patch, index) => ({
      ...patch,
      revision: index === patches.length - 1 || (!patches.length && pendingSceneSize)
        ? revision
        : resolveIntermediateRevision(revision, index),
    }))

    if (pendingSceneSize) {
      normalizedPatches.push({
        revision,
        sceneSize: pendingSceneSize,
      })
    }

    return syncSceneArtifacts(applyEngineScenePatchBatch(state, {
      patches: normalizedPatches,
    }))
  }

  return {
    loadScene,
    applyScenePatch,
    applyScenePatchBatch,
    transaction,
    query(bounds) {
      return state.spatialIndex.search({
        minX: bounds.x,
        minY: bounds.y,
        maxX: bounds.x + bounds.width,
        maxY: bounds.y + bounds.height,
      }).map((item) => item.id)
    },
    hitTest(point, tolerance = 0) {
      return hitTestEngineSceneState(state, point, tolerance)
    },
    getNode(nodeId) {
      return state.nodeMap.get(nodeId) ?? null
    },
    getSnapshot() {
      return snapshot
    },
    getMutableState() {
      return state
    },
    getBufferLayout() {
      return bufferLayout
    },
    getDiagnostics() {
      return {
        revision: state.revision,
        nodeCount: state.nodeMap.size,
        indexedNodeCount: state.spatialIndex.search({
          minX: Number.NEGATIVE_INFINITY,
          minY: Number.NEGATIVE_INFINITY,
          maxX: Number.POSITIVE_INFINITY,
          maxY: Number.POSITIVE_INFINITY,
        }).length,
        planVersion: snapshot.metadata?.planVersion ?? 0,
        bufferVersion: snapshot.metadata?.bufferVersion ?? 0,
        width: state.width,
        height: state.height,
      }
    },
  }
}

function resolveNextSceneRevision(current: string | number): string | number {
  if (typeof current === 'number') {
    return current + 1
  }

  return `${current}:next`
}

function resolveIntermediateRevision(baseRevision: string | number, index: number) {
  if (typeof baseRevision === 'number') {
    return baseRevision + index
  }

  return `${baseRevision}:part:${index}`
}
