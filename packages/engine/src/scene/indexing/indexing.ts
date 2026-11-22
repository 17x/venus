import {createEngineSpatialIndex, type EngineSpatialIndex, type EngineSpatialItem} from '../spatial/index.ts'
import type {EngineNodeId, EngineRenderableNode} from '../types/types.ts'
import {resolveRenderableNodeWorldBounds} from '../worldBounds/worldBounds.ts'

type Matrix2D = readonly [number, number, number, number, number, number]

const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 0, 1, 0]

export interface EngineSceneSpatialMeta {
  nodeType: EngineRenderableNode['type']
}

/**
 * Creates spatial index instance for scene-node bounds queries.
 */
export function createEngineSceneSpatialIndex() {
  return createEngineSpatialIndex<EngineSceneSpatialMeta>()
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
    const bounds = resolveRenderableNodeWorldBounds(node, worldMatrix)
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
