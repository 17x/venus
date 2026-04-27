import type { EnginePoint, EngineRenderableNode } from './types.ts'
import type { MutableEngineSceneState } from './patch.ts'

export interface EngineHitTestResult {
  index: number
  nodeId: string
  nodeType: EngineRenderableNode['type']
  hitType: 'shape-body'
  score: number
  zOrder: number
  hitPoint: EnginePoint
}

export interface EngineHitExecutionSummary {
  hits: EngineHitTestResult[]
  exactCheckCount: number
}

type Matrix2D = readonly [number, number, number, number, number, number]
const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 0, 1, 0]

export function hitTestEngineSceneState(
  state: MutableEngineSceneState,
  point: EnginePoint,
  tolerance = 0,
): EngineHitTestResult | null {
  const results = hitTestEngineSceneStateAll(state, point, tolerance)
  return results[0] ?? null
}

export function hitTestEngineSceneStateAll(
  state: MutableEngineSceneState,
  point: EnginePoint,
  tolerance = 0,
): EngineHitTestResult[] {
  return hitTestEngineSceneStateAllWithSummary(state, point, tolerance).hits
}

export function hitTestEngineSceneStateAllWithSummary(
  state: MutableEngineSceneState,
  point: EnginePoint,
  tolerance = 0,
): EngineHitExecutionSummary {
  const candidateIdSet = resolveHitCandidateIdSet(state, point, tolerance)
  if (candidateIdSet && candidateIdSet.size === 0) {
    return {
      hits: [],
      exactCheckCount: 0,
    }
  }

  const totalNodeCount = countSceneNodes(state.nodes)
  const hits: EngineHitTestResult[] = []
  let traversalIndex = totalNodeCount
  let exactCheckCount = 0

  // Walk the scene in reverse paint order and prune subtrees that have no
  // coarse point candidates so hit execution does not rebuild a full flattened
  // scene for every pointer query.
  const visitReverse = (
    nodes: readonly EngineRenderableNode[],
    parentMatrix: Matrix2D,
  ) => {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index]
      const worldMatrix = multiplyMatrix(parentMatrix, node.transform?.matrix ?? IDENTITY_MATRIX)

      if (node.type === 'group') {
        if (!candidateIdSet || candidateIdSet.has(node.id)) {
          visitReverse(node.children, worldMatrix)
        }
      }

      traversalIndex -= 1
      const flattenedIndex = traversalIndex

      if (candidateIdSet && !candidateIdSet.has(node.id)) {
        continue
      }

      exactCheckCount += 1
      if (!isPointInsideNode(point, node, worldMatrix, tolerance)) {
        continue
      }

      hits.push({
        index: flattenedIndex,
        nodeId: node.id,
        nodeType: node.type,
        hitType: 'shape-body',
        score: totalNodeCount - flattenedIndex,
        zOrder: flattenedIndex,
        hitPoint: point,
      })
    }
  }

  visitReverse(state.nodes, IDENTITY_MATRIX)

  return {
    hits,
    exactCheckCount,
  }
}

// Reuse the engine spatial index as a coarse shortlist so hit execution can
// skip exact geometry checks for nodes that do not intersect the point region.
function resolveHitCandidateIdSet(
  state: MutableEngineSceneState,
  point: EnginePoint,
  tolerance: number,
) {
  const radius = Math.max(0, tolerance)
  const candidateIds = state.spatialIndex.search({
    minX: point.x - radius,
    minY: point.y - radius,
    maxX: point.x + radius,
    maxY: point.y + radius,
  }).map((item) => item.id)

  return new Set(candidateIds)
}

function isPointInsideNode(
  point: EnginePoint,
  node: EngineRenderableNode,
  worldMatrix: Matrix2D,
  tolerance: number,
): boolean {
  const localPoint = projectPointToLocalSpace(point, worldMatrix)
  if (!localPoint) {
    return false
  }

  switch (node.type) {
    case 'image':
      return isPointInsideRect(
        localPoint,
        node.x,
        node.y,
        node.width,
        node.height,
        tolerance,
      )
    case 'text': {
      const width = node.width ?? estimateTextWidth(node)
      const lineHeight = node.style.lineHeight ?? node.style.fontSize * 1.2
      const height = node.height ?? lineHeight
      return isPointInsideRect(
        localPoint,
        node.x,
        node.y,
        width,
        height,
        tolerance,
      )
    }
    case 'group':
      return false
    case 'shape':
      return isPointInsideRect(
        localPoint,
        node.x,
        node.y,
        node.width,
        node.height,
        tolerance,
      )
    default:
      return false
  }
}

function isPointInsideRect(
  point: EnginePoint,
  x: number,
  y: number,
  width: number,
  height: number,
  tolerance: number,
): boolean {
  const right = x + width
  const bottom = y + height
  return (
    point.x >= x - tolerance &&
    point.x <= right + tolerance &&
    point.y >= y - tolerance &&
    point.y <= bottom + tolerance
  )
}

function estimateTextWidth(node: Extract<EngineRenderableNode, { type: 'text' }>) {
  if (node.runs && node.runs.length > 0) {
    let length = 0
    for (const run of node.runs) {
      length += run.text.length
    }
    return length * node.style.fontSize * 0.6
  }

  const text = node.text ?? ''
  return text.length * node.style.fontSize * 0.6
}

// Count flattened nodes without allocating the flattened array so hit scoring
// and z-order can stay compatible with the previous traversal contract.
function countSceneNodes(nodes: readonly EngineRenderableNode[]) {
  let count = 0

  for (const node of nodes) {
    count += 1
    if (node.type === 'group') {
      count += countSceneNodes(node.children)
    }
  }

  return count
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

function projectPointToLocalSpace(point: EnginePoint, worldMatrix: Matrix2D): EnginePoint | null {
  const inverse = invertMatrix(worldMatrix)
  if (!inverse) {
    return null
  }

  return {
    x: inverse[0] * point.x + inverse[1] * point.y + inverse[2],
    y: inverse[3] * point.x + inverse[4] * point.y + inverse[5],
  }
}

function invertMatrix(matrix: Matrix2D): Matrix2D | null {
  const determinant = matrix[0] * matrix[4] - matrix[1] * matrix[3]
  if (Math.abs(determinant) < 1e-8) {
    return null
  }

  const inv = 1 / determinant
  return [
    matrix[4] * inv,
    -matrix[1] * inv,
    (matrix[1] * matrix[5] - matrix[4] * matrix[2]) * inv,
    -matrix[3] * inv,
    matrix[0] * inv,
    (matrix[3] * matrix[2] - matrix[0] * matrix[5]) * inv,
  ]
}
