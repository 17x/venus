import type {
  EngineRenderFrame,
} from '../types/index.ts'
import type { EngineViewportWorldBounds } from '../../core/camera/index.ts'
import type {
  EngineRect,
  EngineRenderableNode,
} from '../../scene/types/types.ts'
import type { EngineSceneBufferLayout } from '../../scene/buffer/buffer.ts'
import {
  attachGroupAggregateBounds,
  buildGroupAggregateWorldBounds,
  hasCollapsedGroupAncestor,
  resolveCollapsedGroupSlots,
  resolveProtectedCollapseGroupSlots,
} from './planGroupLod.ts'
import {
  isPreparedNodeCulled,
  resolveNodeWorldBounds,
  resolveViewportWorldBounds,
} from './planVisibilityCulling.ts'
import {
  resolveFramePlanCandidateIdSet,
  resolveFramePlanSignature,
  resolveSceneBufferLayout,
  resolveScenePlanVersion,
  resolveViewportSignature,
} from './planFrameContext.ts'
export type EngineWorldMatrix = readonly [number, number, number, number, number, number]

const IDENTITY_MATRIX: EngineWorldMatrix = [1, 0, 0, 0, 1, 0]
const PREDICTIVE_CULLING_MIN_CONFIDENCE = 0.2
const PREDICTIVE_CULLING_MAX_OVERSCAN_CSS_PX = 768
const PREDICTIVE_CULLING_LOOKAHEAD_SECONDS = 0.08
const INTERACTIVE_CULLING_OVERSCAN_CSS_PX = 96

export interface EnginePreparedNode {
  node: EngineRenderableNode
  worldMatrix: EngineWorldMatrix
  worldBounds: EngineRect | null
  culled: boolean
  bucketKey: string
  parentIndex: number
}

export interface EngineRenderBatch {
  key: string
  nodeType: EngineRenderableNode['type']
  assetId?: string
  indices: number[]
}

export interface EngineRenderPlan {
  preparedNodes: EnginePreparedNode[]
  drawList: number[]
  batches: EngineRenderBatch[]
  stats: {
    visibleCount: number
    culledCount: number
    collapsedGroupCount: number
    collapsedDescendantCulledCount: number
    geometryCacheHitCount: number
    geometryCacheMissCount: number
    geometryCacheHitRate: number
  }
}

export interface EngineRenderPlanCacheDiagnostics {
  geometryCacheHitCount: number
  geometryCacheMissCount: number
  geometryCacheHitRate: number
}

interface CachedRenderPlanEntry {
  scenePlanVersion: string | number
  nodesRef: readonly EngineRenderableNode[]
  viewportSignature: string
  framePlanSignature: string
  plan: EngineRenderPlan
}

interface EngineFlattenedNodeEntry {
  node: EngineRenderableNode
  parentIndex: number
}

const renderPlanCache = new WeakMap<EngineRenderFrame['scene'], CachedRenderPlanEntry>()
let renderPlanCacheHitCount = 0
let renderPlanCacheMissCount = 0

// Expose one immutable diagnostics snapshot so runtime telemetry can report
// render-plan geometry cache behavior consistently across backends.
/**
 * Returns immutable diagnostics for render-plan cache hit/miss behavior.
 */
export function getEngineRenderPlanCacheDiagnostics(): EngineRenderPlanCacheDiagnostics {
  const total = renderPlanCacheHitCount + renderPlanCacheMissCount
  return {
    geometryCacheHitCount: renderPlanCacheHitCount,
    geometryCacheMissCount: renderPlanCacheMissCount,
    geometryCacheHitRate: total > 0 ? renderPlanCacheHitCount / total : 0,
  }
}

// Build or reuse the render plan and stamp per-frame geometry cache metrics.
/**
 * Handles prepareEngineRenderPlan.
 * @param frame Current render frame.
 */
export function prepareEngineRenderPlan(frame: EngineRenderFrame): EngineRenderPlan {
  // Reuse plan when scene revision + node list + viewport are unchanged.
  // This avoids rebuilding traversal/culling/batch lists on duplicate frames.
  const viewportSignature = resolveViewportSignature(frame)
  const framePlanSignature = resolveFramePlanSignature(frame)
  const cached = renderPlanCache.get(frame.scene)
  if (
    cached &&
    cached.scenePlanVersion === resolveScenePlanVersion(frame.scene) &&
    cached.nodesRef === frame.scene.nodes &&
    cached.viewportSignature === viewportSignature &&
    cached.framePlanSignature === framePlanSignature
  ) {
    renderPlanCacheHitCount += 1
    const cacheSnapshot = getEngineRenderPlanCacheDiagnostics()
    cached.plan.stats.geometryCacheHitCount = 1
    cached.plan.stats.geometryCacheMissCount = 0
    cached.plan.stats.geometryCacheHitRate = cacheSnapshot.geometryCacheHitRate
    return cached.plan
  }

  const viewportBounds = resolveViewportWorldBounds(frame, {
    overscanCssPx: resolveRenderPlanOverscanCssPx(frame),
  })
  const bufferLayout = resolveSceneBufferLayout(frame.scene)
  const plan = bufferLayout
    ? prepareEngineRenderPlanFromBuffer(frame, viewportBounds, bufferLayout)
    : prepareEngineRenderPlanFromNodes(frame, viewportBounds)
  renderPlanCacheMissCount += 1
  const cacheSnapshot = getEngineRenderPlanCacheDiagnostics()
  plan.stats.geometryCacheHitCount = 0
  plan.stats.geometryCacheMissCount = 1
  plan.stats.geometryCacheHitRate = cacheSnapshot.geometryCacheHitRate

  renderPlanCache.set(frame.scene, {
    scenePlanVersion: resolveScenePlanVersion(frame.scene),
    nodesRef: frame.scene.nodes,
    viewportSignature,
    framePlanSignature,
    plan,
  })

  return plan
}

/**
 * Handles resolveBatchKey.
 * @param node Target node.
 */
function resolveBatchKey(node: EngineRenderableNode) {
  if (node.type === 'image') {
    return `image:${node.assetId}`
  }
  return node.type
}

/**
 * Flattens render nodes with parent slots so buffer traversal can validate
 * structure while still resolving geometry from the current scene objects.
 * @param nodes Scene root nodes.
 * @param parentIndex Parent prepared index.
 * @param out Output entry list.
 */
function flattenEngineNodeEntries(
  nodes: readonly EngineRenderableNode[],
  parentIndex = -1,
  out: EngineFlattenedNodeEntry[] = [],
): EngineFlattenedNodeEntry[] {
  nodes.forEach((node) => {
    const nodeIndex = out.push({node, parentIndex}) - 1
    if (node.type === 'group') {
      flattenEngineNodeEntries(node.children, nodeIndex, out)
    }
  })

  return out
}

/**
 * Validates that the typed scene buffer still describes the current node tree.
 * Geometry and transforms are intentionally not trusted here; render planning
 * resolves them from scene nodes so interaction, hit-test, overlay, and render
 * all share the same canonical source after edits.
 * @param bufferLayout Scene buffer layout metadata.
 * @param entries Current flattened scene entries.
 */
function isBufferLayoutAlignedWithEntries(
  bufferLayout: EngineSceneBufferLayout,
  entries: readonly EngineFlattenedNodeEntry[],
) {
  if (entries.length !== bufferLayout.count) {
    return false
  }

  for (let slot = 0; slot < entries.length; slot += 1) {
    const entry = entries[slot]
    if (
      bufferLayout.nodeIds[slot] !== entry.node.id ||
      bufferLayout.parentIndices[slot] !== entry.parentIndex ||
      bufferLayout.order[slot] !== slot
    ) {
      return false
    }
  }

  return true
}

/**
 * Handles prepareEngineRenderPlanFromBuffer.
 * @param frame Current render frame.
 * @param viewportBounds viewportBounds parameter.
 * @param bufferLayout bufferLayout parameter.
 */
function prepareEngineRenderPlanFromBuffer(
  frame: EngineRenderFrame,
  viewportBounds: EngineViewportWorldBounds,
  bufferLayout: EngineSceneBufferLayout,
): EngineRenderPlan {
  const flattenedEntries = flattenEngineNodeEntries(frame.scene.nodes)
  if (!isBufferLayoutAlignedWithEntries(bufferLayout, flattenedEntries)) {
    // Buffer/layout mismatch means store and scene snapshot drifted. Fallback
    // to object traversal to preserve correctness.
    return prepareEngineRenderPlanFromNodes(frame, viewportBounds)
  }

  const preparedNodes: EnginePreparedNode[] = new Array(bufferLayout.count)
  const drawList: number[] = []
  const batchMap = new Map<string, EngineRenderBatch>()
  const worldMatrices: EngineWorldMatrix[] = new Array(bufferLayout.count)
  const framePlanCandidateIdSet = resolveFramePlanCandidateIdSet(frame)

  for (let slot = 0; slot < bufferLayout.count; slot += 1) {
    const entry = flattenedEntries[slot]
    const node = entry.node
    const localMatrix = node.transform?.matrix ?? IDENTITY_MATRIX
    const parentIndex = entry.parentIndex
    const parentWorld = parentIndex >= 0
      ? (worldMatrices[parentIndex] ?? IDENTITY_MATRIX)
      : IDENTITY_MATRIX
    const worldMatrix = parentIndex >= 0
      ? multiplyMatrix(parentWorld, localMatrix)
      : localMatrix
    worldMatrices[slot] = worldMatrix

    const worldBounds = node.type === 'group'
      ? null
      : resolveNodeWorldBounds(node, worldMatrix)
    const culled = node.type === 'group'
      ? false
      : isPreparedNodeCulled(
        node.id,
        worldBounds,
        viewportBounds,
        framePlanCandidateIdSet,
        frame.viewport.scale,
        frame.context.quality,
        frame.context.lodEnabled ?? true,
      )

    preparedNodes[slot] = {
      node,
      worldMatrix,
      worldBounds,
      culled,
      bucketKey: resolveBatchKey(node),
      parentIndex,
    }

  }

  const groupAggregateBounds = buildGroupAggregateWorldBounds(
    preparedNodes,
    bufferLayout.parentIndices,
  )
  const protectedCollapseGroupSlots = resolveProtectedCollapseGroupSlots(
    preparedNodes,
    bufferLayout.parentIndices,
    frame.context.protectedNodeIds,
  )
  const collapsedGroupSlotSet = resolveCollapsedGroupSlots(
    preparedNodes,
    groupAggregateBounds,
    protectedCollapseGroupSlots,
    frame.viewport.scale,
    frame.context.quality,
    frame.context.lodEnabled ?? true,
  )
  // Attach aggregate bounds so collapsed groups can render as thumbnail placeholders.
  attachGroupAggregateBounds(preparedNodes, groupAggregateBounds)
  const collapsedGroupCount = collapsedGroupSlotSet.size

  let visibleCount = 0
  let culledCount = 0
  let collapsedDescendantCulledCount = 0

  for (let order = 0; order < bufferLayout.count; order += 1) {
    const slot = bufferLayout.order[order]
    if (slot < 0 || slot >= preparedNodes.length) {
      continue
    }

    const prepared = preparedNodes[slot]
    if (!prepared) {
      continue
    }

    if (prepared.node.type === 'group') {
      if (!collapsedGroupSlotSet.has(slot) || !prepared.worldBounds) {
        continue
      }

      // Submit collapsed groups as lightweight placeholder packets.
      visibleCount += 1
      drawList.push(slot)
      const existing = batchMap.get(prepared.bucketKey)
      if (existing) {
        existing.indices.push(slot)
        continue
      }

      batchMap.set(prepared.bucketKey, {
        key: prepared.bucketKey,
        nodeType: prepared.node.type,
        assetId: undefined,
        indices: [slot],
      })
      continue
    }

    if (
      prepared.culled ||
      hasCollapsedGroupAncestor(slot, bufferLayout.parentIndices, collapsedGroupSlotSet)
    ) {
      culledCount += 1
      if (!prepared.culled) {
        collapsedDescendantCulledCount += 1
      }
      continue
    }

    visibleCount += 1
    drawList.push(slot)
    const batchKey = prepared.bucketKey
    const existing = batchMap.get(batchKey)
    if (existing) {
      existing.indices.push(slot)
      continue
    }

    batchMap.set(batchKey, {
      key: batchKey,
      nodeType: prepared.node.type,
      assetId: prepared.node.type === 'image' ? prepared.node.assetId : undefined,
      indices: [slot],
    })
  }

  return {
    preparedNodes,
    drawList,
    batches: Array.from(batchMap.values()),
    stats: {
      visibleCount,
      culledCount,
      collapsedGroupCount,
      collapsedDescendantCulledCount,
      geometryCacheHitCount: 0,
      geometryCacheMissCount: 0,
      geometryCacheHitRate: 0,
    },
  }
}

/**
 * Handles prepareEngineRenderPlanFromNodes.
 * @param frame Current render frame.
 * @param viewportBounds viewportBounds parameter.
 */
function prepareEngineRenderPlanFromNodes(
  frame: EngineRenderFrame,
  viewportBounds: EngineViewportWorldBounds,
): EngineRenderPlan {
  const preparedNodes: EnginePreparedNode[] = []
  const drawList: number[] = []
  const batchMap = new Map<string, EngineRenderBatch>()
  const framePlanCandidateIdSet = resolveFramePlanCandidateIdSet(frame)
  const parentIndices: number[] = []

  const visit = (
    nodes: readonly EngineRenderableNode[],
    parentWorldMatrix: EngineWorldMatrix,
    parentPreparedIndex: number,
  ) => {
    for (const node of nodes) {
      const worldMatrix = multiplyMatrix(parentWorldMatrix, node.transform?.matrix ?? IDENTITY_MATRIX)
      if (node.type === 'group' && framePlanCandidateIdSet && !framePlanCandidateIdSet.has(node.id)) {
        continue
      }

      const worldBounds = resolveNodeWorldBounds(node, worldMatrix)
      const culled = node.type === 'group'
        ? false
        : isPreparedNodeCulled(
          node.id,
          worldBounds,
          viewportBounds,
          framePlanCandidateIdSet,
          frame.viewport.scale,
          frame.context.quality,
          frame.context.lodEnabled ?? true,
        )

      const preparedIndex = preparedNodes.push({
        node,
        worldMatrix,
        worldBounds,
        culled,
        bucketKey: resolveBatchKey(node),
        parentIndex: parentPreparedIndex,
      }) - 1
      parentIndices[preparedIndex] = parentPreparedIndex

      if (node.type === 'group') {
        visit(node.children, worldMatrix, preparedIndex)
        continue
      }
    }
  }

  visit(frame.scene.nodes, IDENTITY_MATRIX, -1)

  const groupAggregateBounds = buildGroupAggregateWorldBounds(
    preparedNodes,
    parentIndices,
  )
  const protectedCollapseGroupSlots = resolveProtectedCollapseGroupSlots(
    preparedNodes,
    parentIndices,
    frame.context.protectedNodeIds,
  )
  const collapsedGroupSlotSet = resolveCollapsedGroupSlots(
    preparedNodes,
    groupAggregateBounds,
    protectedCollapseGroupSlots,
    frame.viewport.scale,
    frame.context.quality,
    frame.context.lodEnabled ?? true,
  )
  // Attach aggregate bounds so collapsed groups can render as thumbnail placeholders.
  attachGroupAggregateBounds(preparedNodes, groupAggregateBounds)
  const collapsedGroupCount = collapsedGroupSlotSet.size

  let visibleCount = 0
  let culledCount = 0
  let collapsedDescendantCulledCount = 0

  for (let preparedIndex = 0; preparedIndex < preparedNodes.length; preparedIndex += 1) {
    const prepared = preparedNodes[preparedIndex]
    if (!prepared) {
      continue
    }

    if (prepared.node.type === 'group') {
      if (!collapsedGroupSlotSet.has(preparedIndex) || !prepared.worldBounds) {
        continue
      }

      // Submit collapsed groups as lightweight placeholder packets.
      visibleCount += 1
      drawList.push(preparedIndex)
      const existing = batchMap.get(prepared.bucketKey)
      if (existing) {
        existing.indices.push(preparedIndex)
        continue
      }

      batchMap.set(prepared.bucketKey, {
        key: prepared.bucketKey,
        nodeType: prepared.node.type,
        assetId: undefined,
        indices: [preparedIndex],
      })
      continue
    }

    if (
      prepared.culled ||
      hasCollapsedGroupAncestor(preparedIndex, parentIndices, collapsedGroupSlotSet)
    ) {
      culledCount += 1
      if (!prepared.culled) {
        collapsedDescendantCulledCount += 1
      }
      continue
    }

    visibleCount += 1
    drawList.push(preparedIndex)
    const batchKey = prepared.bucketKey
    const existing = batchMap.get(batchKey)
    if (existing) {
      existing.indices.push(preparedIndex)
      continue
    }

    batchMap.set(batchKey, {
      key: batchKey,
      nodeType: prepared.node.type,
      assetId: prepared.node.type === 'image' ? prepared.node.assetId : undefined,
      indices: [preparedIndex],
    })
  }

  return {
    preparedNodes,
    drawList,
    batches: Array.from(batchMap.values()),
    stats: {
      visibleCount,
      culledCount,
      collapsedGroupCount,
      collapsedDescendantCulledCount,
      geometryCacheHitCount: 0,
      geometryCacheMissCount: 0,
      geometryCacheHitRate: 0,
    },
  }
}

/**
 * Resolves extra culling coverage for pan/drag frames without lowering render fidelity.
 * @param frame Current render frame.
 */
export function resolveRenderPlanOverscanCssPx(frame: EngineRenderFrame): number {
  const predictor = frame.context.interactionPredictor
  const interactiveFloor = frame.context.quality === 'interactive'
    ? INTERACTIVE_CULLING_OVERSCAN_CSS_PX
    : 0
  if (!predictor || predictor.confidence < PREDICTIVE_CULLING_MIN_CONFIDENCE) {
    return interactiveFloor
  }

  const predictedTravel = predictor.speedPxPerSec * PREDICTIVE_CULLING_LOOKAHEAD_SECONDS
  return Math.min(
    PREDICTIVE_CULLING_MAX_OVERSCAN_CSS_PX,
    Math.max(interactiveFloor, Math.round(predictedTravel * predictor.confidence)),
  )
}

/**
 * Handles multiplyMatrix.
 * @param left left parameter.
 * @param right right parameter.
 */
export function multiplyMatrix(
  left: EngineWorldMatrix,
  right: EngineWorldMatrix,
): EngineWorldMatrix {
  const [l00, l01, l02, l10, l11, l12] = left
  const [r00, r01, r02, r10, r11, r12] = right
  return [
    l00 * r00 + l01 * r10,
    l00 * r01 + l01 * r11,
    l00 * r02 + l01 * r12 + l02,
    l10 * r00 + l11 * r10,
    l10 * r01 + l11 * r11,
    l10 * r02 + l11 * r12 + l12,
  ]
}
