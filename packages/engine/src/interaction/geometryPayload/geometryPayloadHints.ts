import { resolveNodeTransform } from '../shapeTransform/shapeTransform.ts'
import type { EngineEditorHitTestNode, EngineEditorPoint } from '../hitTest/hitTest.ts'
import { resolvePathAnchors } from './geometryPayloadPath.ts'
import type { EngineGeometryHint } from './geometryPayloadTypes.ts'

const LINE_SEGMENT_ENDPOINT_INDEX = 1
const PATH_MIN_ANCHOR_COUNT = 2
const PATH_SEGMENT_OFFSET = 1
const MIDPOINT_DIVISOR = 2
const ANCHOR_PRIORITY_TOLERANCE_MULTIPLIER = 1.25
const SEGMENT_LENGTH_EPSILON = 1e-8

/**
 * Resolves hover hints for line/path anchor interactions.
 * @param node Shape node being inspected for pointer hints.
 * @param pointer Pointer position in world coordinates.
 * @param tolerance Hit tolerance used for hint eligibility.
 */
export function resolveHintsForNode(
  node: EngineEditorHitTestNode,
  pointer: EngineEditorPoint,
  tolerance: number,
): EngineGeometryHint[] {
  const hints: EngineGeometryHint[] = []

  if (node.type === 'lineSegment') {
    const [m0, m1, m2, m3, m4, m5] = resolveNodeTransform(node).matrix
    const linePoints = resolveLineSegmentPoints(node)
    const from = {
      x: m0 * linePoints[0].x + m2 * linePoints[0].y + m4,
      y: m1 * linePoints[0].x + m3 * linePoints[0].y + m5,
    }
    const to = {
      x: m0 * linePoints[LINE_SEGMENT_ENDPOINT_INDEX].x + m2 * linePoints[LINE_SEGMENT_ENDPOINT_INDEX].y + m4,
      y: m1 * linePoints[LINE_SEGMENT_ENDPOINT_INDEX].x + m3 * linePoints[LINE_SEGMENT_ENDPOINT_INDEX].y + m5,
    }
    const segmentDistance = resolveDistanceToSegment(pointer, from, to)
    if (segmentDistance <= tolerance) {
      hints.push({
        kind: 'hover-line',
        label: 'hover on a line',
        point: midpoint(from, to),
        segmentIndex: 0,
      })
    }
    return hints
  }

  if (node.type !== 'path') {
    return hints
  }

  const anchors = resolvePathAnchors(node)
  if (anchors.length === 0) {
    return hints
  }

  // Anchor hint has priority over segment hint to keep direct-edit affordance stable.
  const nearestAnchor = resolveNearestAnchor(pointer, anchors)
  if (nearestAnchor && nearestAnchor.distance <= tolerance * ANCHOR_PRIORITY_TOLERANCE_MULTIPLIER) {
    hints.push({
      kind: 'hover-anchor',
      label: 'hover on a anchor',
      point: nearestAnchor.point,
      anchorIndex: nearestAnchor.index,
    })
    return hints
  }

  const nearestSegment = resolveNearestPathSegment(pointer, anchors)
  if (nearestSegment && nearestSegment.distance <= tolerance) {
    hints.push({
      kind: 'hover-line',
      label: 'hover on a line',
      point: midpoint(nearestSegment.from, nearestSegment.to),
      segmentIndex: nearestSegment.index,
    })
  }

  return hints
}

/**
 * Resolves nearest path anchor and distance for pointer hinting.
 * @param pointer Pointer position in world coordinates.
 * @param anchors Path anchor points transformed to world coordinates.
 */
function resolveNearestAnchor(pointer: EngineEditorPoint, anchors: EngineEditorPoint[]) {
  let resolvedIndex = -1
  let resolvedDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < anchors.length; index += 1) {
    const candidateDistance = Math.hypot(pointer.x - anchors[index].x, pointer.y - anchors[index].y)
    if (candidateDistance >= resolvedDistance) {
      continue
    }

    resolvedDistance = candidateDistance
    resolvedIndex = index
  }

  if (resolvedIndex < 0) {
    return null
  }

  return {
    index: resolvedIndex,
    point: anchors[resolvedIndex],
    distance: resolvedDistance,
  }
}

/**
 * Resolves nearest path segment and distance for pointer hinting.
 * @param pointer Pointer position in world coordinates.
 * @param anchors Path anchor points transformed to world coordinates.
 */
function resolveNearestPathSegment(pointer: EngineEditorPoint, anchors: EngineEditorPoint[]) {
  if (anchors.length < PATH_MIN_ANCHOR_COUNT) {
    return null
  }

  let resolvedIndex = -1
  let resolvedDistance = Number.POSITIVE_INFINITY
  let resolvedFrom: EngineEditorPoint | null = null
  let resolvedTo: EngineEditorPoint | null = null

  for (let index = 0; index < anchors.length - PATH_SEGMENT_OFFSET; index += 1) {
    const from = anchors[index]
    const to = anchors[index + PATH_SEGMENT_OFFSET]
    const candidateDistance = resolveDistanceToSegment(pointer, from, to)
    if (candidateDistance >= resolvedDistance) {
      continue
    }

    resolvedDistance = candidateDistance
    resolvedIndex = index
    resolvedFrom = from
    resolvedTo = to
  }

  if (resolvedIndex < 0 || !resolvedFrom || !resolvedTo) {
    return null
  }

  return {
    index: resolvedIndex,
    from: resolvedFrom,
    to: resolvedTo,
    distance: resolvedDistance,
  }
}

/**
 * Resolves midpoint for guide marker placement.
 * @param from Segment start point.
 * @param to Segment end point.
 */
function midpoint(from: EngineEditorPoint, to: EngineEditorPoint): EngineEditorPoint {
  return {
    x: (from.x + to.x) / MIDPOINT_DIVISOR,
    y: (from.y + to.y) / MIDPOINT_DIVISOR,
  }
}

/**
 * Resolves point-to-segment distance for line/path hint detection.
 * @param point Pointer position being measured.
 * @param from Segment start point.
 * @param to Segment end point.
 */
function resolveDistanceToSegment(
  point: EngineEditorPoint,
  from: EngineEditorPoint,
  to: EngineEditorPoint,
): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const squaredLength = dx * dx + dy * dy
  if (squaredLength <= SEGMENT_LENGTH_EPSILON) {
    return Math.hypot(point.x - from.x, point.y - from.y)
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / squaredLength),
  )
  const projectionX = from.x + t * dx
  const projectionY = from.y + t * dy
  return Math.hypot(point.x - projectionX, point.y - projectionY)
}

/**
 * Resolves optional line-segment endpoints from node geometry.
 * @param node Line-segment-capable node candidate.
 */
function resolveLineSegmentPoints(node: EngineEditorHitTestNode): [EngineEditorPoint, EngineEditorPoint] {
  if (Array.isArray(node.points) && node.points.length >= PATH_MIN_ANCHOR_COUNT) {
    return [
      {x: node.points[0].x, y: node.points[0].y},
      {
        x: node.points[node.points.length - PATH_SEGMENT_OFFSET].x,
        y: node.points[node.points.length - PATH_SEGMENT_OFFSET].y,
      },
    ]
  }

  return [
    {x: node.x, y: node.y},
    {x: node.x + node.width, y: node.y + node.height},
  ]
}
