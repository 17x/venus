import type {
  EngineRenderFrame,
} from './types.ts'
import type {
  EngineRect,
  EngineRenderableNode,
} from '../scene/types.ts'

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

export function prepareEngineRenderPlan(frame: EngineRenderFrame): EngineRenderPlan {
  const preparedNodes: EnginePreparedNode[] = []
  const drawList: number[] = []
  const batchMap = new Map<string, EngineRenderBatch>()

  let visibleCount = 0
  let culledCount = 0

  const viewportBounds = resolveViewportWorldBounds(frame)

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

function resolveBatchKey(node: EngineRenderableNode) {
  if (node.type === 'image') {
    return `image:${node.assetId}`
  }
  return node.type
}

function resolveViewportWorldBounds(frame: EngineRenderFrame) {
  const minX = frame.viewport.offsetX
  const minY = frame.viewport.offsetY
  const maxX = minX + frame.viewport.viewportWidth / frame.viewport.scale
  const maxY = minY + frame.viewport.viewportHeight / frame.viewport.scale
  return {minX, minY, maxX, maxY}
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
