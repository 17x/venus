import type { EngineShapeNode } from '../types/types.ts'

const MIN_PATH_CLOSED_POINT_COUNT = 3
const PATH_CLOSED_DISTANCE_EPSILON = 1e-3

/**
 * Resolves whether a shape path should be treated as closed.
  * @param node Target node.
*/
export function isGeometryPathClosed(node: EngineShapeNode) {
  if (typeof node.closed === 'boolean') {
    return node.closed
  }

  if (node.bezierPoints && node.bezierPoints.length >= MIN_PATH_CLOSED_POINT_COUNT) {
    const head = node.bezierPoints[0]?.anchor
    const tail = node.bezierPoints[node.bezierPoints.length - 1]?.anchor
    if (!head || !tail) {
      return false
    }

    return Math.hypot(head.x - tail.x, head.y - tail.y) <= PATH_CLOSED_DISTANCE_EPSILON
  }

  if (node.points && node.points.length >= MIN_PATH_CLOSED_POINT_COUNT) {
    const head = node.points[0]
    const tail = node.points[node.points.length - 1]
    if (!head || !tail) {
      return false
    }

    return Math.hypot(head.x - tail.x, head.y - tail.y) <= PATH_CLOSED_DISTANCE_EPSILON
  }

  return false
}
