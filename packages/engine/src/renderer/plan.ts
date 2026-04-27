import type {
  EngineRenderFrame,
} from './types.ts'
import type {
  EngineRect,
  EngineRenderableNode,
} from '../scene/types.ts'
import type { EngineSceneBufferLayout } from '../scene/buffer.ts'
import {resolveLeafNodeWorldBounds, toWorldAxisAlignedBounds} from '../scene/worldBounds.ts'

export type EngineWorldMatrix = readonly [number, number, number, number, number, number]

const IDENTITY_MATRIX: EngineWorldMatrix = [1, 0, 0, 0, 1, 0]
const TINY_OBJECT_MAX_SCREEN_EDGE_PX = 0.9
const TINY_OBJECT_OVERVIEW_SCREEN_EDGE_PX = 2.4
const TINY_OBJECT_OVERVIEW_MAX_SCALE = 0.05
const TINY_OBJECT_LOW_SCALE_SCREEN_EDGE_PX = 1.4
const TINY_OBJECT_LOW_SCALE_MAX_SCALE = 0.12
const GROUP_LOD_THUMBNAIL_MAX_SCREEN_AREA_PX2 = 4096

export interface EnginePreparedNode {
  node: EngineRenderableNode
  worldMatrix: EngineWorldMatrix
  worldBounds: EngineRect | null
  culled: boolean
  bucketKey: string
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
  }
}

interface CachedRenderPlanEntry {
  scenePlanVersion: string | number
  nodesRef: readonly EngineRenderableNode[]
  viewportSignature: string
  framePlanSignature: string
  plan: EngineRenderPlan
}

const renderPlanCache = new WeakMap<EngineRenderFrame['scene'], CachedRenderPlanEntry>()

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
    return cached.plan
  }

  const viewportBounds = resolveViewportWorldBounds(frame)
  const bufferLayout = resolveSceneBufferLayout(frame.scene)
  const plan = bufferLayout
    ? prepareEngineRenderPlanFromBuffer(frame, viewportBounds, bufferLayout)
    : prepareEngineRenderPlanFromNodes(frame, viewportBounds)

  renderPlanCache.set(frame.scene, {
    scenePlanVersion: resolveScenePlanVersion(frame.scene),
    nodesRef: frame.scene.nodes,
    viewportSignature,
    framePlanSignature,
    plan,
  })

  return plan
}

function resolveFramePlanSignature(frame: EngineRenderFrame) {
  const candidateIds = frame.context.framePlanCandidateIds
  return `${frame.context.framePlanVersion ?? 'none'}:${candidateIds?.length ?? 0}`
}

function resolveScenePlanVersion(scene: EngineRenderFrame['scene']) {
  return scene.metadata?.planVersion ?? scene.revision
}

function resolveSceneBufferLayout(scene: EngineRenderFrame['scene']) {
  const layout = scene.metadata?.bufferLayout
  if (!layout) {
    return null
  }

  const candidate = layout as EngineSceneBufferLayout
  if (
    typeof candidate.count !== 'number' ||
    !Array.isArray(candidate.nodeIds) ||
    !(candidate.bounds instanceof Float32Array) ||
    !(candidate.transform instanceof Float32Array) ||
    !(candidate.parentIndices instanceof Int32Array) ||
    !(candidate.order instanceof Uint32Array)
  ) {
    return null
  }

  return candidate
}

function resolveViewportSignature(frame: EngineRenderFrame) {
  const viewport = frame.viewport
  // Keep signature explicit to avoid hidden float rounding assumptions.
  return `${viewport.viewportWidth}:${viewport.viewportHeight}:${viewport.scale}:${viewport.offsetX}:${viewport.offsetY}:${viewport.matrix.join(',')}`
}

function resolveBatchKey(node: EngineRenderableNode) {
  if (node.type === 'image') {
    return `image:${node.assetId}`
  }
  return node.type
}

function prepareEngineRenderPlanFromBuffer(
  frame: EngineRenderFrame,
  viewportBounds: {minX: number; minY: number; maxX: number; maxY: number},
  bufferLayout: EngineSceneBufferLayout,
): EngineRenderPlan {
  const flattenedNodes = flattenEngineNodes(frame.scene.nodes)
  if (flattenedNodes.length !== bufferLayout.count) {
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
    const node = flattenedNodes[slot]
    const localMatrix = readBufferMatrix(bufferLayout, slot)
    const parentIndex = bufferLayout.parentIndices[slot]
    const parentWorld = parentIndex >= 0
      ? (worldMatrices[parentIndex] ?? IDENTITY_MATRIX)
      : IDENTITY_MATRIX
    const worldMatrix = parentIndex >= 0
      ? multiplyMatrix(parentWorld, localMatrix)
      : localMatrix
    worldMatrices[slot] = worldMatrix

    const localBounds = readBufferRect(bufferLayout, slot)
    const worldBounds = node.type === 'group'
      ? null
      : toWorldAxisAlignedBounds(localBounds, worldMatrix)
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
    },
  }
}

function prepareEngineRenderPlanFromNodes(
  frame: EngineRenderFrame,
  viewportBounds: {minX: number; minY: number; maxX: number; maxY: number},
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
    },
  }
}

function resolveFramePlanCandidateIdSet(frame: EngineRenderFrame) {
  const candidateIds = frame.context.framePlanCandidateIds
  if (!candidateIds || candidateIds.length === 0) {
    return null
  }

  return new Set(candidateIds)
}

function buildGroupAggregateWorldBounds(
  preparedNodes: readonly EnginePreparedNode[],
  parentIndices: ArrayLike<number>,
) {
  const aggregateBounds: Array<EngineRect | null> = new Array(preparedNodes.length).fill(null)

  for (let slot = preparedNodes.length - 1; slot >= 0; slot -= 1) {
    const prepared = preparedNodes[slot]
    if (!prepared) {
      continue
    }

    const selfBounds = prepared.node.type === 'group'
      ? aggregateBounds[slot]
      : prepared.worldBounds
    if (selfBounds) {
      aggregateBounds[slot] = mergeBounds(aggregateBounds[slot], selfBounds)
      const parentSlot = parentIndices[slot]
      if (parentSlot >= 0) {
        aggregateBounds[parentSlot] = mergeBounds(aggregateBounds[parentSlot], selfBounds)
      }
    }
  }

  return aggregateBounds
}

function attachGroupAggregateBounds(
  preparedNodes: EnginePreparedNode[],
  groupAggregateBounds: ReadonlyArray<EngineRect | null>,
) {
  for (let slot = 0; slot < preparedNodes.length; slot += 1) {
    const prepared = preparedNodes[slot]
    if (!prepared || prepared.node.type !== 'group') {
      continue
    }

    // Group bounds are derived from descendants and used only for group LOD placeholders.
    prepared.worldBounds = groupAggregateBounds[slot]
  }
}

function resolveCollapsedGroupSlots(
  preparedNodes: readonly EnginePreparedNode[],
  groupAggregateBounds: ReadonlyArray<EngineRect | null>,
  protectedGroupSlots: Set<number>,
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
  lodEnabled: boolean,
) {
  const collapsedGroupSlots = new Set<number>()

  for (let slot = 0; slot < preparedNodes.length; slot += 1) {
    const prepared = preparedNodes[slot]
    if (!prepared || prepared.node.type !== 'group') {
      continue
    }

    if (protectedGroupSlots.has(slot)) {
      continue
    }

    if (shouldCollapseGroupSubtree(groupAggregateBounds[slot], viewportScale, renderQuality, lodEnabled)) {
      collapsedGroupSlots.add(slot)
    }
  }

  return collapsedGroupSlots
}

function resolveProtectedCollapseGroupSlots(
  preparedNodes: readonly EnginePreparedNode[],
  parentIndices: ArrayLike<number>,
  protectedNodeIds: readonly string[] | undefined,
) {
  const protectedGroupSlots = new Set<number>()
  if (!protectedNodeIds || protectedNodeIds.length === 0) {
    return protectedGroupSlots
  }

  const protectedNodeIdSet = new Set(protectedNodeIds)

  for (let slot = 0; slot < preparedNodes.length; slot += 1) {
    const prepared = preparedNodes[slot]
    if (!prepared || !protectedNodeIdSet.has(prepared.node.id)) {
      continue
    }

    if (prepared.node.type === 'group') {
      protectedGroupSlots.add(slot)
    }

    let parentSlot = parentIndices[slot]
    while (parentSlot >= 0) {
      const parentPrepared = preparedNodes[parentSlot]
      if (parentPrepared?.node.type === 'group') {
        protectedGroupSlots.add(parentSlot)
      }
      parentSlot = parentIndices[parentSlot]
    }
  }

  return protectedGroupSlots
}

function shouldCollapseGroupSubtree(
  groupBounds: EngineRect | null,
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
  lodEnabled: boolean,
) {
  if (!lodEnabled) {
    return false
  }

  if (!groupBounds) {
    return false
  }

  const absScale = Math.max(0, Math.abs(viewportScale))
  const screenWidth = Math.abs(groupBounds.width) * absScale
  const screenHeight = Math.abs(groupBounds.height) * absScale
  const screenArea = screenWidth * screenHeight

  if (renderQuality === 'interactive') {
    // Keep interaction collapse aggressive to preserve panning/zooming frame budget.
    return screenArea <= GROUP_LOD_THUMBNAIL_MAX_SCREEN_AREA_PX2
  }

  // Settled frames still collapse low-screen-area groups into thumbnail mode.
  return screenArea <= GROUP_LOD_THUMBNAIL_MAX_SCREEN_AREA_PX2
}

function hasCollapsedGroupAncestor(
  slot: number,
  parentIndices: ArrayLike<number>,
  collapsedGroupSlotSet: Set<number>,
) {
  let parentSlot = parentIndices[slot]
  while (parentSlot >= 0) {
    if (collapsedGroupSlotSet.has(parentSlot)) {
      return true
    }
    parentSlot = parentIndices[parentSlot]
  }
  return false
}

function mergeBounds(current: EngineRect | null, next: EngineRect) {
  if (!current) {
    return {
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height,
    }
  }

  const minX = Math.min(current.x, next.x)
  const minY = Math.min(current.y, next.y)
  const maxX = Math.max(current.x + current.width, next.x + next.width)
  const maxY = Math.max(current.y + current.height, next.y + next.height)
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

// Combine viewport bounds culling with the coarse frame-plan shortlist so the
// render path can skip obviously irrelevant nodes before batching work.
function isPreparedNodeCulled(
  nodeId: string,
  worldBounds: EngineRect | null,
  viewportBounds: {minX: number; minY: number; maxX: number; maxY: number},
  framePlanCandidateIdSet: Set<string> | null,
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
  lodEnabled: boolean,
) {
  if (framePlanCandidateIdSet && !framePlanCandidateIdSet.has(nodeId)) {
    return true
  }

  if (isTinyRenderableBounds(worldBounds, viewportScale, renderQuality, lodEnabled)) {
    return true
  }

  return isWorldBoundsCulled(worldBounds, viewportBounds)
}

// Skip extremely tiny objects when zoomed out or in interactive quality.
// This keeps draw-list pressure bounded on dense scenes where sub-pixel nodes
// are not perceptible to users.
function isTinyRenderableBounds(
  worldBounds: EngineRect | null,
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
  lodEnabled: boolean,
) {
  if (!lodEnabled) {
    return false
  }

  if (!worldBounds) {
    return false
  }

  if (renderQuality !== 'interactive' && viewportScale > 0.35) {
    return false
  }

  const absScale = Math.max(0, Math.abs(viewportScale))
  const screenWidth = Math.abs(worldBounds.width) * absScale
  const screenHeight = Math.abs(worldBounds.height) * absScale
  const tinyObjectThreshold = resolveTinyObjectScreenEdgeThreshold(
    absScale,
    renderQuality,
  )
  return (
    screenWidth <= tinyObjectThreshold &&
    screenHeight <= tinyObjectThreshold
  )
}

function resolveTinyObjectScreenEdgeThreshold(
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
) {
  if (renderQuality === 'interactive') {
    // Extremely zoomed-out overview passes still push tens of thousands of
    // sub-perceptual nodes through packet rendering unless we raise the tiny
    // cutoff beyond the default sub-pixel threshold.
    if (viewportScale <= TINY_OBJECT_OVERVIEW_MAX_SCALE) {
      return TINY_OBJECT_OVERVIEW_SCREEN_EDGE_PX
    }

    if (viewportScale <= TINY_OBJECT_LOW_SCALE_MAX_SCALE) {
      return TINY_OBJECT_LOW_SCALE_SCREEN_EDGE_PX
    }
  }

  return TINY_OBJECT_MAX_SCREEN_EDGE_PX
}

function resolveViewportWorldBounds(frame: EngineRenderFrame) {
  // Viewport matrix is world->screen: sx = scale * wx + offsetX.
  // Therefore visible world min is computed from screen origin (0, 0):
  // wx = (0 - offsetX) / scale.
  const safeScale = frame.viewport.scale === 0 ? 1 : frame.viewport.scale
  const minX = -frame.viewport.offsetX / safeScale
  const minY = -frame.viewport.offsetY / safeScale
  const maxX = minX + frame.viewport.viewportWidth / safeScale
  const maxY = minY + frame.viewport.viewportHeight / safeScale
  return {minX, minY, maxX, maxY}
}

function flattenEngineNodes(nodes: readonly EngineRenderableNode[]) {
  const flattened: EngineRenderableNode[] = []
  const walk = (entries: readonly EngineRenderableNode[]) => {
    entries.forEach((node) => {
      flattened.push(node)
      if (node.type === 'group') {
        walk(node.children)
      }
    })
  }
  walk(nodes)
  return flattened
}

function readBufferRect(layout: EngineSceneBufferLayout, slot: number): EngineRect {
  const offset = slot * 4
  return {
    x: layout.bounds[offset],
    y: layout.bounds[offset + 1],
    width: layout.bounds[offset + 2],
    height: layout.bounds[offset + 3],
  }
}

function readBufferMatrix(layout: EngineSceneBufferLayout, slot: number): EngineWorldMatrix {
  const offset = slot * 6
  return [
    layout.transform[offset],
    layout.transform[offset + 1],
    layout.transform[offset + 2],
    layout.transform[offset + 3],
    layout.transform[offset + 4],
    layout.transform[offset + 5],
  ]
}

function isWorldBoundsCulled(
  bounds: EngineRect | null,
  viewportBounds: {minX: number; minY: number; maxX: number; maxY: number},
) {
  if (!bounds) {
    return false
  }

  return (
    bounds.x + bounds.width < viewportBounds.minX ||
    bounds.y + bounds.height < viewportBounds.minY ||
    bounds.x > viewportBounds.maxX ||
    bounds.y > viewportBounds.maxY
  )
}

function resolveNodeWorldBounds(
  node: EngineRenderableNode,
  worldMatrix: EngineWorldMatrix,
): EngineRect | null {
  switch (node.type) {
    case 'text':
    case 'image':
    case 'shape':
      return resolveLeafNodeWorldBounds(node, worldMatrix)
    case 'group':
      return null
    default:
      return null
  }
}

export function multiplyMatrix(
  left: EngineWorldMatrix,
  right: EngineWorldMatrix,
): EngineWorldMatrix {
  return [
    left[0] * right[0] + left[1] * right[3],
    left[0] * right[1] + left[1] * right[4],
    left[0] * right[2] + left[1] * right[5] + left[2],
    left[3] * right[0] + left[4] * right[3],
    left[3] * right[1] + left[4] * right[4],
    left[3] * right[2] + left[4] * right[5] + left[5],
  ]
}


