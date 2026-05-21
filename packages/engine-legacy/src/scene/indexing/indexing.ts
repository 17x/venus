import {createEngineSpatialIndex, type EngineSpatialIndex, type EngineSpatialItem} from '../spatial/index.ts'
import type {EngineNodeId, EngineRect, EngineRenderableNode} from '../types/types.ts'
import {resolveLeafNodeWorldBounds} from '../worldBounds/worldBounds.ts'
import type { EngineMat3Affine2D } from '../../math/dimension/types.ts'

/**
 * Uses the shared affine matrix compatibility contract during staged 2D/3D migration.
 */
type Matrix2D = EngineMat3Affine2D

const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 0, 1, 0]

export interface EngineSceneSpatialMeta {
  nodeType: EngineRenderableNode['type']
}

/**
 * Declares options for scene spatial index creation.
 */
export interface CreateEngineSceneSpatialIndexOptions {
  /** Declares which spatial dimension mode the scene index should use. */
  dimension?: '2d' | '3d'
}

/**
 * Creates spatial index instance for scene-node bounds queries.
 * @param options Scene spatial index options.
 */
export function createEngineSceneSpatialIndex(
  options: CreateEngineSceneSpatialIndexOptions = {},
) {
  return createEngineSpatialIndex<EngineSceneSpatialMeta>({
    dimension: options.dimension,
  })
}

/**
 * Handles createEngineSceneNodeMap.
 * @param nodes nodes parameter.
 */
export function createEngineSceneNodeMap(nodes: readonly EngineRenderableNode[]) {
  const nodeMap = new Map<EngineNodeId, EngineRenderableNode>()
  indexEngineSceneNodes(nodes, nodeMap)
  return nodeMap
}

/**
 * Handles loadEngineSceneSpatialIndex.
 * @param index Index value.
 * @param nodes nodes parameter.
 */
export function loadEngineSceneSpatialIndex(
  index: EngineSpatialIndex<EngineSceneSpatialMeta>,
  nodes: readonly EngineRenderableNode[],
) {
  index.clear()
  const items: Array<EngineSpatialItem<EngineSceneSpatialMeta>> = []
  collectEngineSpatialItems(nodes, items)
  index.load(items)
}

/**
 * Handles removeEngineSceneNodeSubtree.
 * @param node Target node.
 * @param nodeMap nodeMap parameter.
 * @param spatialIndex spatialIndex parameter.
 */
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

/**
 * Handles upsertEngineSceneNodeSubtree.
 * @param node Target node.
 * @param nodeMap nodeMap parameter.
 * @param spatialIndex spatialIndex parameter.
 */
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

/**
 * Handles indexEngineSceneNodes.
 * @param nodes nodes parameter.
 * @param nodeMap nodeMap parameter.
 */
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

/**
 * Handles collectEngineSpatialItems.
 * @param nodes nodes parameter.
 * @param items items parameter.
 * @param parentMatrix parentMatrix parameter.
 */
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

/**
 * Handles walkEngineNodeSubtree.
 * @param node Target node.
 * @param visit visit parameter.
 */
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

/**
 * Handles resolveNodeWorldBounds.
 * @param node Target node.
 * @param worldMatrix worldMatrix parameter.
 */
function resolveNodeWorldBounds(
  node: EngineRenderableNode,
  worldMatrix: Matrix2D,
): EngineRect | null {
  switch (node.type) {
    case 'image':
    case 'text':
    case 'shape':
      return resolveLeafNodeWorldBounds(node, worldMatrix)
    case 'group':
      return resolveGroupWorldBounds(node.children, worldMatrix)
    default:
      return null
  }
}

/**
 * Handles resolveGroupWorldBounds.
 * @param nodes nodes parameter.
 * @param parentMatrix parentMatrix parameter.
 */
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

/**
 * Handles unionRect.
 * @param left left parameter.
 * @param right right parameter.
 */
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

/**
 * Handles multiplyMatrix.
 * @param left left parameter.
 * @param right right parameter.
 */
function multiplyMatrix(left: Matrix2D, right: Matrix2D): Matrix2D {
  const [leftA, leftB, leftC, leftD, leftE, leftF] = left
  const [rightA, rightB, rightC, rightD, rightE, rightF] = right

  return [
    leftA * rightA + leftB * rightD,
    leftA * rightB + leftB * rightE,
    leftA * rightC + leftB * rightF + leftC,
    leftD * rightA + leftE * rightD,
    leftD * rightB + leftE * rightE,
    leftD * rightC + leftE * rightF + leftF,
  ]
}

