import { sampleBezierPathPolygon } from '@venus/lib/geometry'

import type { EngineEditorHitTestNode, EngineEditorPoint } from '../hitTest/hitTest.ts'

const PATH_BEZIER_MIN_POINT_COUNT = 2
const PATH_BEZIER_SEGMENT_SAMPLES_HIGH = 24
const PATH_BEZIER_SEGMENT_SAMPLES_DEFAULT = 12
const PATH_CLOSED_MIN_ANCHOR_COUNT = 3
const PATH_CLOSED_DISTANCE_EPSILON = 1e-3

/**
 * Resolves path outline points using node points/bezier sampling.
 * @param node Path-capable node candidate.
 * @param outlineLevel Detail level controlling bezier sampling density.
 */
export function resolvePathOutlinePoints(
  node: EngineEditorHitTestNode,
  outlineLevel: 'low' | 'medium' | 'high',
): EngineEditorPoint[] | null {
  if (Array.isArray(node.bezierPoints) && node.bezierPoints.length >= PATH_BEZIER_MIN_POINT_COUNT) {
    const segmentSampleCount = outlineLevel === 'high' ? PATH_BEZIER_SEGMENT_SAMPLES_HIGH : PATH_BEZIER_SEGMENT_SAMPLES_DEFAULT
    return sampleBezierPathPolygon(node.bezierPoints, segmentSampleCount) as EngineEditorPoint[]
  }

  if (Array.isArray(node.points) && node.points.length >= PATH_BEZIER_MIN_POINT_COUNT) {
    return node.points.map((point) => ({x: point.x, y: point.y}))
  }

  return null
}

/**
 * Resolves path anchor list from either bezier or plain point data.
 * @param node Path-capable node candidate.
 */
export function resolvePathAnchors(node: EngineEditorHitTestNode): EngineEditorPoint[] {
  if (Array.isArray(node.bezierPoints) && node.bezierPoints.length > 0) {
    return node.bezierPoints.map((point) => ({x: point.anchor.x, y: point.anchor.y}))
  }

  if (Array.isArray(node.points) && node.points.length > 0) {
    return node.points.map((point) => ({x: point.x, y: point.y}))
  }

  return []
}

/**
 * Resolves whether path should be treated as closed from endpoint proximity.
 * @param node Path-capable node candidate.
 */
export function isPathClosed(node: EngineEditorHitTestNode): boolean {
  const anchors = resolvePathAnchors(node)
  if (anchors.length < PATH_CLOSED_MIN_ANCHOR_COUNT) {
    return false
  }

  const first = anchors[0]
  const last = anchors[anchors.length - 1]
  return Math.hypot(first.x - last.x, first.y - last.y) <= PATH_CLOSED_DISTANCE_EPSILON
}

/**
 * Adds closed-path hint for path hit-testing without mutating source nodes.
 * @param shape Shape candidate that may represent a path.
 */
export function withResolvedPathHints<TShape extends EngineEditorHitTestNode>(shape: TShape): TShape & {closed?: boolean} {
  if (shape.type !== 'path') {
    return shape
  }

  return {
    ...shape,
    closed: isPathClosed(shape),
  }
}