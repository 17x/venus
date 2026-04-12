import type {
  EngineRenderFrame,
} from './types.ts'
import type {
  EngineRect,
  EngineRenderableNode,
} from '../scene/types.ts'
import type { EngineSceneBufferLayout } from '../scene/buffer.ts'

export type EngineWorldMatrix = readonly [number, number, number, number, number, number]

const IDENTITY_MATRIX: EngineWorldMatrix = [1, 0, 0, 0, 1, 0]

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
  }
}

interface CachedRenderPlanEntry {
  scenePlanVersion: string | number
  nodesRef: readonly EngineRenderableNode[]
  viewportSignature: string
  plan: EngineRenderPlan
}

const renderPlanCache = new WeakMap<EngineRenderFrame['scene'], CachedRenderPlanEntry>()

export function prepareEngineRenderPlan(frame: EngineRenderFrame): EngineRenderPlan {
  // Reuse plan when scene revision + node list + viewport are unchanged.
  // This avoids rebuilding traversal/culling/batch lists on duplicate frames.
  const viewportSignature = resolveViewportSignature(frame)
  const cached = renderPlanCache.get(frame.scene)
  if (
    cached &&
    cached.scenePlanVersion === resolveScenePlanVersion(frame.scene) &&
    cached.nodesRef === frame.scene.nodes &&
    cached.viewportSignature === viewportSignature
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
    plan,
  })

  return plan
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

  let visibleCount = 0
  let culledCount = 0

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
      : isWorldBoundsCulled(worldBounds, viewportBounds)

    preparedNodes[slot] = {
      node,
      worldMatrix,
      worldBounds,
      culled,
      bucketKey: resolveBatchKey(node),
    }

    if (node.type !== 'group') {
      if (culled) {
        culledCount += 1
      } else {
        visibleCount += 1
      }
    }
  }

  for (let order = 0; order < bufferLayout.count; order += 1) {
    const slot = bufferLayout.order[order]
    if (slot < 0 || slot >= preparedNodes.length) {
      continue
    }

    const prepared = preparedNodes[slot]
    if (!prepared || prepared.node.type === 'group' || prepared.culled) {
      continue
    }

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

  let visibleCount = 0
  let culledCount = 0

  const visit = (
    nodes: readonly EngineRenderableNode[],
    parentWorldMatrix: EngineWorldMatrix,
  ) => {
    for (const node of nodes) {
      const worldMatrix = multiplyMatrix(parentWorldMatrix, node.transform?.matrix ?? IDENTITY_MATRIX)
      const worldBounds = resolveNodeWorldBounds(node, worldMatrix)
      const culled = node.type === 'group'
        ? false
        : isWorldBoundsCulled(worldBounds, viewportBounds)

      const preparedIndex = preparedNodes.push({
        node,
        worldMatrix,
        worldBounds,
        culled,
        bucketKey: resolveBatchKey(node),
      }) - 1

      if (node.type === 'group') {
        visit(node.children, worldMatrix)
        continue
      }

      if (culled) {
        culledCount += 1
        continue
      }

      visibleCount += 1
      drawList.push(preparedIndex)
      const batchKey = resolveBatchKey(node)
      const existing = batchMap.get(batchKey)
      if (existing) {
        existing.indices.push(preparedIndex)
        continue
      }

      batchMap.set(batchKey, {
        key: batchKey,
        nodeType: node.type,
        assetId: node.type === 'image' ? node.assetId : undefined,
        indices: [preparedIndex],
      })
    }
  }

  visit(frame.scene.nodes, IDENTITY_MATRIX)

  return {
    preparedNodes,
    drawList,
    batches: Array.from(batchMap.values()),
    stats: {
      visibleCount,
      culledCount,
    },
  }
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
    case 'text': {
      const estimatedWidth = node.width ?? estimateTextWidth(node)
      const estimatedHeight = node.height ?? Math.max(node.style.fontSize, node.style.lineHeight ?? node.style.fontSize)
      return toWorldAxisAlignedBounds({
        x: node.x,
        y: node.y,
        width: estimatedWidth,
        height: estimatedHeight,
      }, worldMatrix)
    }
    case 'image':
      return toWorldAxisAlignedBounds({
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      }, worldMatrix)
    case 'shape':
      return toWorldAxisAlignedBounds({
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      }, worldMatrix)
    case 'group':
      return null
    default:
      return null
  }
}

function estimateTextWidth(node: Extract<EngineRenderableNode, {type: 'text'}>) {
  if (node.runs && node.runs.length > 0) {
    return node.runs.reduce((width, run) => width + run.text.length * (run.style?.fontSize ?? node.style.fontSize) * 0.6, 0)
  }

  return (node.text ?? '').length * node.style.fontSize * 0.6
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

function applyMatrixToPoint(
  matrix: EngineWorldMatrix,
  point: {x: number; y: number},
) {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}

function toWorldAxisAlignedBounds(
  rect: EngineRect,
  worldMatrix: EngineWorldMatrix,
): EngineRect {
  const p1 = applyMatrixToPoint(worldMatrix, {x: rect.x, y: rect.y})
  const p2 = applyMatrixToPoint(worldMatrix, {x: rect.x + rect.width, y: rect.y})
  const p3 = applyMatrixToPoint(worldMatrix, {x: rect.x, y: rect.y + rect.height})
  const p4 = applyMatrixToPoint(worldMatrix, {x: rect.x + rect.width, y: rect.y + rect.height})

  const minX = Math.min(p1.x, p2.x, p3.x, p4.x)
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x)
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y)
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
