import {
  hitTestEngineSceneState,
  hitTestEngineSceneStateAll,
  hitTestEngineSceneStateAllWithSummary,
  type EngineHitExecutionOptions,
  type EngineHitExecutionSummary,
  type EngineHitTestResult,
} from '../hitTest/hitTest.ts'
import {
  applyEngineScenePatch,
  applyEngineScenePatchBatch,
  createMutableEngineSceneState,
  type EngineScenePatch,
  type EngineScenePatchApplyResult,
  type EngineScenePatchBatch,
  type MutableEngineSceneState,
} from '../patch/patch.ts'
import type {
  EngineNodeId,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
} from '../types/types.ts'
import {
  createEngineSceneBufferLayout,
  type EngineSceneBufferLayout,
  syncEngineSceneBufferLayout,
  writeSceneToBufferLayout,
} from '../buffer/buffer.ts'

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
  queryCandidates(bounds: EngineRect): EngineNodeId[]
  queryPointCandidates(point: {x: number; y: number}, tolerance?: number): EngineNodeId[]
  query(bounds: EngineRect): EngineNodeId[]
  hitTest(
    point: {x: number; y: number},
    tolerance?: number,
    options?: EngineHitExecutionOptions,
  ): EngineHitTestResult | null
  hitTestAll(
    point: {x: number; y: number},
    tolerance?: number,
    options?: EngineHitExecutionOptions,
  ): EngineHitTestResult[]
  hitTestAllWithSummary(
    point: {x: number; y: number},
    tolerance?: number,
    options?: EngineHitExecutionOptions,
  ): EngineHitExecutionSummary
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
  * @param options Options object for this operation.
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

  // Keep snapshot metadata and buffer layout synchronized with mutable scene state.
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

  // Replace scene content in one patch so indexes, buffers, and metadata advance together.
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

  // Apply one incremental patch and immediately synchronize render-side artifacts.
  const applyScenePatch = (patch: EngineScenePatch) => {
    return syncSceneArtifacts(applyEngineScenePatch(state, patch))
  }

  // Apply batched patches as one write transaction for better consistency and throughput.
  const applyScenePatchBatch = (batch: EngineScenePatchBatch) => {
    return syncSceneArtifacts(applyEngineScenePatchBatch(state, batch))
  }

  // Queue high-level document edits and commit as a deterministic patch batch.
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
            /**
       * Handles insertNodes.
       * @param nodes nodes parameter.
       */
insertNodes(nodes) {
        if (nodes.length === 0) {
          return
        }
        queuePatch({
          upsertNodes: nodes,
        })
      },
            /**
       * Handles updateNodes.
       * @param nodes nodes parameter.
       */
updateNodes(nodes) {
        if (nodes.length === 0) {
          return
        }
        queuePatch({
          upsertNodes: nodes,
        })
      },
            /**
       * Handles removeNodeIds.
       * @param ids ids parameter.
       */
removeNodeIds(ids) {
        if (ids.length === 0) {
          return
        }
        queuePatch({
          removeNodeIds: ids,
        })
      },
            /**
       * Handles resizeScene.
       * @param size size parameter.
       */
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
    // Expose coarse bounds queries explicitly so render and interaction
    // planners can share the same candidate gathering surface.
        /**
     * Handles queryCandidates.
     * @param bounds Bounds data.
     */
queryCandidates(bounds) {
      return state.spatialIndex.search({
        minX: bounds.x,
        minY: bounds.y,
        maxX: bounds.x + bounds.width,
        maxY: bounds.y + bounds.height,
      }).map((item) => item.id)
    },
    // Point queries remain bbox-based at this layer so exact refinement stays
    // in the hit-test pipeline instead of leaking into the spatial index.
        /**
     * Handles queryPointCandidates.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     */
queryPointCandidates(point, tolerance = 0) {
      const radius = Math.max(0, tolerance)
      return state.spatialIndex.search({
        minX: point.x - radius,
        minY: point.y - radius,
        maxX: point.x + radius,
        maxY: point.y + radius,
      }).map((item) => item.id)
    },
        /**
     * Handles query.
     * @param bounds Bounds data.
     */
query(bounds) {
      return this.queryCandidates(bounds)
    },
        /**
     * Handles hitTest.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     * @param options Options object for this operation.
     */
hitTest(point, tolerance = 0, options) {
      return hitTestEngineSceneState(state, point, tolerance, options)
    },
        /**
     * Handles hitTestAll.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     * @param options Options object for this operation.
     */
hitTestAll(point, tolerance = 0, options) {
      return hitTestEngineSceneStateAll(state, point, tolerance, options)
    },
        /**
     * Handles hitTestAllWithSummary.
     * @param point point parameter.
     * @param tolerance tolerance parameter.
     * @param options Options object for this operation.
     */
hitTestAllWithSummary(point, tolerance = 0, options) {
      return hitTestEngineSceneStateAllWithSummary(state, point, tolerance, options)
    },
        /**
     * Handles getNode.
     * @param nodeId nodeId parameter.
     */
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
        // Keep diagnostics reads cheap: full-index scans here would run on
        // frame-time debug polling paths and can tank FPS on small scenes too.
        indexedNodeCount: state.nodeMap.size,
        planVersion: snapshot.metadata?.planVersion ?? 0,
        bufferVersion: snapshot.metadata?.bufferVersion ?? 0,
        width: state.width,
        height: state.height,
      }
    },
  }
}

// Resolve next revision token while supporting both numeric and string revision schemes.
/**
 * Handles resolveNextSceneRevision.
 * @param current current parameter.
 */
function resolveNextSceneRevision(current: string | number): string | number {
  if (typeof current === 'number') {
    return current + 1
  }

  return `${current}:next`
}

// Build stable intermediate revision tokens for multi-patch transactions.
/**
 * Handles resolveIntermediateRevision.
 * @param baseRevision baseRevision parameter.
 * @param index Index value.
 */
function resolveIntermediateRevision(baseRevision: string | number, index: number) {
  if (typeof baseRevision === 'number') {
    return baseRevision + index
  }

  return `${baseRevision}:part:${index}`
}
