import {createEngineSpatialIndex, type EngineSpatialIndex, type EngineSpatialItem} from '../spatial/index.ts'
import type {EngineNodeId, EngineRect, EngineRenderableNode} from './types.ts'

type Matrix2D = readonly [number, number, number, number, number, number]

const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 0, 1, 0]

export interface EngineSceneSpatialMeta {
  nodeType: EngineRenderableNode['type']
}

export function createEngineSceneSpatialIndex() {
  return createEngineSpatialIndex<EngineSceneSpatialMeta>()
}

export function createEngineSceneNodeMap(nodes: readonly EngineRenderableNode[]) {
  const nodeMap = new Map<EngineNodeId, EngineRenderableNode>()
  indexEngineSceneNodes(nodes, nodeMap)
  return nodeMap
}

export function loadEngineSceneSpatialIndex(
  index: EngineSpatialIndex<EngineSceneSpatialMeta>,
  nodes: readonly EngineRenderableNode[],
) {
  index.clear()
  const items: Array<EngineSpatialItem<EngineSceneSpatialMeta>> = []
  collectEngineSpatialItems(nodes, items)
  index.load(items)
}

export function removeEngineSceneNodeSubtree(
  node: EngineRenderableNode,
  nodeMap: Map<EngineNodeId, EngineRenderableNode>,
  spatialIndex: EngineSpatialIndex<EngineSceneSpatialMeta>,
) {
  walkEngineNodeSubtree(node, (entry) => {
    nodeMap.delete(entry.id)
    spatialIndex.remove(entry.id)
  })
}

export function upsertEngineSceneNodeSubtree(
  node: EngineRenderableNode,
  nodeMap: Map<EngineNodeId, EngineRenderableNode>,
  spatialIndex: EngineSpatialIndex<EngineSceneSpatialMeta>,
) {
  const items: Array<EngineSpatialItem<EngineSceneSpatialMeta>> = []

  walkEngineNodeSubtree(node, (entry) => {
    nodeMap.set(entry.id, entry)
  })
  collectEngineSpatialItems([node], items)
  items.forEach((item) => {
    spatialIndex.update(item)
  })
}

function indexEngineSceneNodes(
  nodes: readonly EngineRenderableNode[],
  nodeMap: Map<EngineNodeId, EngineRenderableNode>,
) {
  nodes.forEach((node) => {
    walkEngineNodeSubtree(node, (entry) => {
      nodeMap.set(entry.id, entry)
    })
  })
}

function collectEngineSpatialItems(
  nodes: readonly EngineRenderableNode[],
  items: Array<EngineSpatialItem<EngineSceneSpatialMeta>>,
  parentMatrix: Matrix2D = IDENTITY_MATRIX,
) {
  nodes.forEach((node) => {
    const worldMatrix = multiplyMatrix(parentMatrix, node.transform?.matrix ?? IDENTITY_MATRIX)
    const bounds = resolveNodeWorldBounds(node, worldMatrix)
    if (bounds) {
      items.push({
        id: node.id,
        minX: bounds.x,
        minY: bounds.y,
        maxX: bounds.x + bounds.width,
        maxY: bounds.y + bounds.height,
        meta: {
          nodeType: node.type,
        },
      })
    }

    if (node.type === 'group') {
      collectEngineSpatialItems(node.children, items, worldMatrix)
    }
  })
}

function walkEngineNodeSubtree(
  node: EngineRenderableNode,
  visit: (node: EngineRenderableNode) => void,
) {
  visit(node)
  if (node.type !== 'group') {
    return
  }

  node.children.forEach((child) => {
    walkEngineNodeSubtree(child, visit)
  })
}

function resolveNodeWorldBounds(
  node: EngineRenderableNode,
  worldMatrix: Matrix2D,
): EngineRect | null {
  switch (node.type) {
    case 'image':
      return transformRectBounds(node.x, node.y, node.width, node.height, worldMatrix)
    case 'text': {
      const width = node.width ?? estimateTextWidth(node)
      const lineHeight = node.style.lineHeight ?? node.style.fontSize * 1.2
      const height = node.height ?? lineHeight
      return transformRectBounds(node.x, node.y, width, height, worldMatrix)
    }
    case 'shape':
      return transformRectBounds(node.x, node.y, node.width, node.height, worldMatrix)
    case 'group':
      return resolveGroupWorldBounds(node.children, worldMatrix)
    default:
      return null
  }
}

function resolveGroupWorldBounds(
  nodes: readonly EngineRenderableNode[],
  parentMatrix: Matrix2D,
): EngineRect | null {
  let union: EngineRect | null = null

  nodes.forEach((node) => {
    const worldMatrix = multiplyMatrix(parentMatrix, node.transform?.matrix ?? IDENTITY_MATRIX)
    const bounds = resolveNodeWorldBounds(node, worldMatrix)
    if (!bounds) {
      return
    }

    union = union
      ? unionRect(union, bounds)
      : bounds
  })

  return union
}

function transformRectBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  matrix: Matrix2D,
): EngineRect {
  const corners = [
    applyMatrix(matrix, {x, y}),
    applyMatrix(matrix, {x: x + width, y}),
    applyMatrix(matrix, {x, y: y + height}),
    applyMatrix(matrix, {x: x + width, y: y + height}),
  ]
  const minX = Math.min(...corners.map((point) => point.x))
  const maxX = Math.max(...corners.map((point) => point.x))
  const minY = Math.min(...corners.map((point) => point.y))
  const maxY = Math.max(...corners.map((point) => point.y))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function estimateTextWidth(node: Extract<EngineRenderableNode, {type: 'text'}>) {
  if (node.runs && node.runs.length > 0) {
    let length = 0
    node.runs.forEach((run) => {
      length += run.text.length
    })
    return length * node.style.fontSize * 0.6
  }

  return (node.text ?? '').length * node.style.fontSize * 0.6
}

function unionRect(left: EngineRect, right: EngineRect): EngineRect {
  const minX = Math.min(left.x, right.x)
  const minY = Math.min(left.y, right.y)
  const maxX = Math.max(left.x + left.width, right.x + right.width)
  const maxY = Math.max(left.y + left.height, right.y + right.height)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function multiplyMatrix(left: Matrix2D, right: Matrix2D): Matrix2D {
  return [
    left[0] * right[0] + left[1] * right[3],
    left[0] * right[1] + left[1] * right[4],
    left[0] * right[2] + left[1] * right[5] + left[2],
    left[3] * right[0] + left[4] * right[3],
    left[3] * right[1] + left[4] * right[4],
    left[3] * right[2] + left[4] * right[5] + left[5],
  ]
}

function applyMatrix(matrix: Matrix2D, point: {x: number; y: number}) {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}
