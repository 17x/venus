import {
  applyAffineMatrixToPoint,
  multiplyAffineMatrices,
  resolveNodeTransform,
  type AffineMatrix,
} from '../shapeTransform/shapeTransform.ts'
import {getBoundingRectFromBezierPoints} from '../../scene/geometry/bezier.ts'
import {
  resolveRoundedRectCornerRadii,
} from '../hitTest/geometry.ts'
import {
  isPathClosed,
  resolvePathOutlinePoints,
} from './geometryPayloadPath.ts'
import {
  resolveTextLineOutlines,
} from './geometryPayloadText.ts'
import {
  resolveEllipseOutlineShape,
} from './geometryPayloadEllipse.ts'
import {
  engineGeometryBoundsToCornerPoints,
  resolveEngineGeometryBoundsFromPoints,
  transformEngineGeometryBounds,
  unionEngineGeometryBounds,
} from './geometryPayloadBounds.ts'
import type { EngineEditorHitTestNode, EngineEditorPoint } from '../hitTest/hitTest.ts'
import type {
  EngineGeometryBounds,
  EngineGeometryOutline,
} from './geometryPayloadTypes.ts'

const MIN_POLYGON_OUTLINE_POINTS = 3
const MIN_PATH_OUTLINE_POINTS = 2
const LINE_SEGMENT_POINT_MIN_COUNT = 2
const LINE_SEGMENT_LAST_POINT_OFFSET = 1
const ROUND_RECT_CORNER_STEPS_HIGH = 24
const ROUND_RECT_CORNER_STEPS_MEDIUM = 16
const QUADRATIC_BLEND_COEFFICIENT = 2
const POINT_EQUALITY_EPSILON = 1e-6
const FULL_ROTATION_DEGREES = 360
const ARC_EPSILON_DEGREES = 1e-3
const HALF_DIVISOR = 2
const RIGHT_ANGLE_DEGREES = 90
const STRAIGHT_ANGLE_DEGREES = 180
const THREE_QUARTER_ROTATION_DEGREES = 270
const ELLIPSE_EXTREMA_ANGLES_DEGREES = [
  0,
  RIGHT_ANGLE_DEGREES,
  STRAIGHT_ANGLE_DEGREES,
  THREE_QUARTER_ROTATION_DEGREES,
  FULL_ROTATION_DEGREES,
]
const DEGREES_TO_RADIANS = Math.PI / STRAIGHT_ANGLE_DEGREES
/**
 * Stores affine 2D matrix used by geometry payload transforms.
 */
export type GeometryMatrix2D = AffineMatrix

/**
 * Resolves transform-aware world bounds for one node.
 * @param node Node whose transformed bounds are requested.
 * @param nodeById Node lookup map for ancestor transform composition.
 * @param worldMatrixCache Cache for memoized node world matrices.
 * @param boundsCache Cache for memoized world bounds.
 * @param resolvingNodeIds Guard set for malformed parent cycles.
 */
export function resolveNodeBounds(
  node: EngineEditorHitTestNode,
  nodeById: Map<string, EngineEditorHitTestNode>,
  worldMatrixCache: Map<string, GeometryMatrix2D>,
  boundsCache = new Map<string, EngineGeometryBounds>(),
  resolvingNodeIds = new Set<string>(),
): EngineGeometryBounds {
  const cached = boundsCache.get(node.id)
  if (cached) {
    return cached
  }

  if (node.type === 'group' && !resolvingNodeIds.has(node.id)) {
    resolvingNodeIds.add(node.id)
    let aggregate: EngineGeometryBounds | null = null
    for (const candidate of nodeById.values()) {
      if (candidate.parentId !== node.id) {
        continue
      }
      const childBounds = resolveNodeBounds(candidate, nodeById, worldMatrixCache, boundsCache, resolvingNodeIds)
      aggregate = aggregate ? unionEngineGeometryBounds(aggregate, childBounds) : childBounds
    }
    resolvingNodeIds.delete(node.id)
    if (aggregate) {
      boundsCache.set(node.id, aggregate)
      return aggregate
    }
  }

  const worldMatrix = resolveNodeWorldMatrix(node, nodeById, worldMatrixCache)
  const bounds = transformEngineGeometryBounds(resolveNodeLocalBounds(node), worldMatrix)
  boundsCache.set(node.id, bounds)
  return bounds
}

/**
 * Resolves world-space source bounds before this node's own rotation is applied.
 * @param node Node whose source bounds are requested.
 * @param nodeById Node lookup map for ancestor transform composition.
 * @param worldMatrixCache Cache for memoized node world matrices.
 * @param boundsCache Cache for memoized source bounds.
 */
export function resolveNodeSourceBounds(
  node: EngineEditorHitTestNode,
  nodeById: Map<string, EngineEditorHitTestNode>,
  worldMatrixCache: Map<string, GeometryMatrix2D>,
  boundsCache = new Map<string, EngineGeometryBounds>(),
): EngineGeometryBounds {
  const cached = boundsCache.get(node.id)
  if (cached) {
    return cached
  }

  if (node.type === 'group') {
    const groupBounds = resolveNodeBounds(node, nodeById, worldMatrixCache)
    boundsCache.set(node.id, groupBounds)
    return groupBounds
  }

  const parentMatrix = resolveNodeParentWorldMatrix(node, nodeById, worldMatrixCache)
  const bounds = transformEngineGeometryBounds(resolveNodeLocalBounds(node), parentMatrix)
  boundsCache.set(node.id, bounds)
  return bounds
}
/**
 * Resolves node outline geometry with level-aware fallback policy.
 * @param node Node whose outline should be resolved.
 * @param bounds Precomputed world bounds for the node.
 * @param outlineLevel Outline detail level hint.
 * @param nodeById Node lookup map for transform composition.
 * @param worldMatrixCache Cache for memoized node world matrices.
 */
export function resolveOutlineForNode(
  node: EngineEditorHitTestNode,
  bounds: EngineGeometryBounds,
  outlineLevel: 'low' | 'medium' | 'high',
  nodeById: Map<string, EngineEditorHitTestNode>,
  worldMatrixCache: Map<string, GeometryMatrix2D>,
): EngineGeometryOutline {
  const resolvedTransform = resolveNodeTransform(node)
  const worldMatrix = resolveNodeWorldMatrix(node, nodeById, worldMatrixCache)

  if (outlineLevel === 'low') {
    return {
      kind: 'bounds',
      bounds,
      closed: true,
    }
  }

  if (node.type === 'group') {
    return {
      kind: 'bounds',
      bounds,
      closed: true,
    }
  }

  if (node.type === 'lineSegment') {
    const linePoints = resolveLineSegmentPoints(node, worldMatrix)
    return {
      kind: 'polyline',
      points: linePoints,
      closed: false,
    }
  }

  if (
    node.type === 'rectangle' ||
    node.type === 'frame' ||
    node.type === 'image' ||
    node.type === 'text'
  ) {
    const isRoundedRectLike = (
      (node.type === 'rectangle' || node.type === 'frame') &&
      hasRoundedRectCorners(node, resolvedTransform.bounds)
    )
    return {
      kind: 'polyline',
      points: isRoundedRectLike
        ? resolveRoundedRectOutlinePoints(node, resolvedTransform.bounds, worldMatrix, outlineLevel)
        : resolveRectOutlinePoints(resolvedTransform.bounds, worldMatrix),
      closed: true,
    }
  }

  if (node.type === 'ellipse') {
    const ellipseOutline = resolveEllipseOutlineShape(node, resolvedTransform.bounds, worldMatrix, outlineLevel)
    return {
      kind: 'polyline',
      points: ellipseOutline.points,
      closed: ellipseOutline.closed,
    }
  }

  if ((node.type === 'polygon' || node.type === 'star') && node.points && node.points.length >= MIN_POLYGON_OUTLINE_POINTS) {
    return {
      kind: 'polyline',
      points: resolveTransformedPoints(node.points, worldMatrix),
      closed: true,
    }
  }

  if (node.type === 'path') {
    const sampledPathPoints = resolvePathOutlinePoints(node, outlineLevel)
    if (sampledPathPoints && sampledPathPoints.length >= MIN_PATH_OUTLINE_POINTS) {
      return {
        kind: 'polyline',
        points: resolveTransformedPoints(sampledPathPoints, worldMatrix),
        closed: isPathClosed(node),
      }
    }
  }

  return {
    kind: 'bounds',
    bounds,
    closed: true,
  }
}
/**
 * Resolves additional detail outlines for shapes that need richer edge payloads.
 * @param node Node whose detail outlines are requested.
 * @param outlineLevel Outline detail level hint.
 * @param nodeById Node lookup map for transform composition.
 * @param worldMatrixCache Cache for memoized node world matrices.
 */
export function resolveDetailOutlinesForNode(
  node: EngineEditorHitTestNode,
  outlineLevel: 'low' | 'medium' | 'high',
  nodeById: Map<string, EngineEditorHitTestNode>,
  worldMatrixCache: Map<string, GeometryMatrix2D>,
): EngineGeometryOutline[] {
  if (outlineLevel === 'low') {
    return []
  }

  if (node.type !== 'text') {
    return []
  }

  const resolvedTransform = resolveNodeTransform(node)
  const worldMatrix = resolveNodeWorldMatrix(node, nodeById, worldMatrixCache)
  return resolveTextLineOutlines(node, resolvedTransform.bounds, worldMatrix)
}
/**
 * Resolves optional line-segment endpoints from node geometry.
 * @param node Line-segment-capable node candidate.
 * @param matrix World transform matrix for projected endpoints.
 */
function resolveLineSegmentPoints(
  node: EngineEditorHitTestNode,
  matrix: GeometryMatrix2D,
): EngineEditorPoint[] {
  if (Array.isArray(node.points) && node.points.length >= LINE_SEGMENT_POINT_MIN_COUNT) {
    return resolveTransformedPoints([
      {x: node.points[0].x, y: node.points[0].y},
      {x: node.points[node.points.length - LINE_SEGMENT_LAST_POINT_OFFSET].x, y: node.points[node.points.length - LINE_SEGMENT_LAST_POINT_OFFSET].y},
    ], matrix)
  }

  return resolveTransformedPoints([
    {x: node.x, y: node.y},
    {x: node.x + node.width, y: node.y + node.height},
  ], matrix)
}

/**
 * Resolves rectangle-like outline points with transform matrix applied.
 * @param bounds Rectangle bounds in local coordinates.
 * @param matrix World transform matrix for projected outline points.
 */
function resolveRectOutlinePoints(
  bounds: EngineGeometryBounds,
  matrix: GeometryMatrix2D,
): EngineEditorPoint[] {
  return resolveTransformedPoints(engineGeometryBoundsToCornerPoints(bounds), matrix)
}

/**
 * Resolves rounded-rectangle contour points with per-corner radii sampling.
 * @param node Rectangle-like node candidate.
 * @param bounds Rectangle bounds in local coordinates.
 * @param matrix World transform matrix for projected contour points.
 * @param outlineLevel Outline detail level controlling corner sampling density.
 */
function resolveRoundedRectOutlinePoints(
  node: EngineEditorHitTestNode,
  bounds: EngineGeometryBounds,
  matrix: GeometryMatrix2D,
  outlineLevel: 'low' | 'medium' | 'high',
): EngineEditorPoint[] {
  const radii = resolveRoundedRectCornerRadii(node, {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
  })
  const cornerStepCount = outlineLevel === 'high' ? ROUND_RECT_CORNER_STEPS_HIGH : ROUND_RECT_CORNER_STEPS_MEDIUM
  const points: EngineEditorPoint[] = []

  // Follow renderer quadratic-corner path semantics so hover and base chrome stay identical.
  const left = bounds.minX
  const top = bounds.minY
  const right = bounds.maxX
  const bottom = bounds.maxY

  points.push({x: left + radii.topLeft, y: top})
  points.push({x: right - radii.topRight, y: top})
  appendQuadraticCurvePoints(
    points,
    {x: right, y: top},
    {x: right, y: top + radii.topRight},
    cornerStepCount,
  )

  points.push({x: right, y: bottom - radii.bottomRight})
  appendQuadraticCurvePoints(
    points,
    {x: right, y: bottom},
    {x: right - radii.bottomRight, y: bottom},
    cornerStepCount,
  )

  points.push({x: left + radii.bottomLeft, y: bottom})
  appendQuadraticCurvePoints(
    points,
    {x: left, y: bottom},
    {x: left, y: bottom - radii.bottomLeft},
    cornerStepCount,
  )

  points.push({x: left, y: top + radii.topLeft})
  appendQuadraticCurvePoints(
    points,
    {x: left, y: top},
    {x: left + radii.topLeft, y: top},
    cornerStepCount,
  )

  return resolveTransformedPoints(points, matrix)
}

/**
 * Resolves transformed points for one geometry contour under node matrix.
 * @param points Source points in local coordinates.
 * @param matrix Affine matrix used to project points into world coordinates.
 */
function resolveTransformedPoints(
  points: readonly EngineEditorPoint[],
  matrix: GeometryMatrix2D,
): EngineEditorPoint[] {
  return points.map((point) => applyAffineMatrixToPoint(matrix, point))
}

/**
 * Resolves local-to-world matrix including ancestor group transforms.
 * @param node Node whose world matrix is requested.
 * @param nodeById Node lookup map for ancestor traversal.
 * @param cache Cache for memoized node world matrices.
 */
function resolveNodeWorldMatrix(
  node: EngineEditorHitTestNode,
  nodeById: Map<string, EngineEditorHitTestNode>,
  cache: Map<string, GeometryMatrix2D>,
): GeometryMatrix2D {
  const cached = cache.get(node.id)
  if (cached) {
    return cached
  }

  const localMatrix = resolveNodeLocalMatrix(node)
  const parentId = node.parentId
  if (!parentId) {
    cache.set(node.id, localMatrix)
    return localMatrix
  }

  const parent = nodeById.get(parentId)
  if (!parent) {
    cache.set(node.id, localMatrix)
    return localMatrix
  }

  const world = multiplyAffineMatrices(resolveNodeWorldMatrix(parent, nodeById, cache), localMatrix)
  cache.set(node.id, world)
  return world
}

/**
 * Resolves an ancestor-only world matrix, excluding the node's own rotation.
 * @param node Node whose parent matrix is requested.
 * @param nodeById Node lookup map for ancestor traversal.
 * @param cache Cache for memoized node world matrices.
 */
function resolveNodeParentWorldMatrix(
  node: EngineEditorHitTestNode,
  nodeById: Map<string, EngineEditorHitTestNode>,
  cache: Map<string, GeometryMatrix2D>,
): GeometryMatrix2D {
  if (!node.parentId) {
    return [1, 0, 0, 1, 0, 0]
  }

  const parent = nodeById.get(node.parentId)
  return parent ? resolveNodeWorldMatrix(parent, nodeById, cache) : [1, 0, 0, 1, 0, 0]
}

/**
 * Resolves one node local matrix from its own rotate/flip transform state.
 * @param node Node whose local transform matrix is requested.
 */
function resolveNodeLocalMatrix(node: EngineEditorHitTestNode): GeometryMatrix2D {
  return resolveNodeTransform(node).matrix
}

/**
 * Resolves local geometry bounds from authored shape data before world projection.
 * @param node Node whose local geometry bounds are requested.
 */
function resolveNodeLocalBounds(node: EngineEditorHitTestNode): EngineGeometryBounds {
  if (node.type === 'ellipse') {
    return resolveEllipseLocalVisibleBounds(node)
  }

  if (node.type === 'lineSegment') {
    const linePoints = resolveLineSegmentLocalPoints(node)
    const lineBounds = resolveEngineGeometryBoundsFromPoints(linePoints)
    if (lineBounds) {
      return lineBounds
    }
  }

  if (node.type === 'polygon' || node.type === 'star') {
    const pointBounds = node.points ? resolveEngineGeometryBoundsFromPoints(node.points) : null
    if (pointBounds) {
      return pointBounds
    }
  }

  if (node.type === 'path') {
    if (node.bezierPoints && node.bezierPoints.length > 0) {
      const bezierBounds = getBoundingRectFromBezierPoints(node.bezierPoints)
      return {
        minX: bezierBounds.x,
        minY: bezierBounds.y,
        maxX: bezierBounds.x + bezierBounds.width,
        maxY: bezierBounds.y + bezierBounds.height,
      }
    }

    const pointBounds = node.points ? resolveEngineGeometryBoundsFromPoints(node.points) : null
    if (pointBounds) {
      return pointBounds
    }
  }

  return resolveNodeTransform(node).bounds
}

/**
 * Resolves ellipse visible bounds, using arc sector AABB for partial arcs.
 * @param node Ellipse node candidate.
 */
function resolveEllipseLocalVisibleBounds(node: EngineEditorHitTestNode): EngineGeometryBounds {
  const bounds = resolveNodeTransform(node).bounds
  if (!hasEllipseArcRange(node)) {
    return bounds
  }

  const center = {
    x: (bounds.minX + bounds.maxX) / HALF_DIVISOR,
    y: (bounds.minY + bounds.maxY) / HALF_DIVISOR,
  }
  const radiusX = Math.abs(bounds.maxX - bounds.minX) / HALF_DIVISOR
  const radiusY = Math.abs(bounds.maxY - bounds.minY) / HALF_DIVISOR
  const startDegrees = normalizeAngleDegrees(node.ellipseStartAngle ?? 0)
  const sweepDegrees = resolveArcSweepDegrees(startDegrees, normalizeAngleDegrees(node.ellipseEndAngle ?? FULL_ROTATION_DEGREES))
  const candidateAngles = [
    startDegrees,
    startDegrees + sweepDegrees,
    ...ELLIPSE_EXTREMA_ANGLES_DEGREES.filter((angle) => isAngleInsideArcSweep(angle, startDegrees, sweepDegrees)),
  ]
  const points = candidateAngles.map((angleDegrees) => {
    const radians = angleDegrees * DEGREES_TO_RADIANS
    return {
      x: center.x + Math.cos(radians) * radiusX,
      y: center.y - Math.sin(radians) * radiusY,
    }
  })
  if (node.ellipseDrawWedgeLine) {
    points.push(center)
  }

  return resolveEngineGeometryBoundsFromPoints(points) ?? bounds
}

/**
 * Resolves whether an ellipse node uses partial arc geometry.
 * @param node Ellipse node candidate.
 */
function hasEllipseArcRange(node: EngineEditorHitTestNode): boolean {
  if (typeof node.ellipseStartAngle !== 'number' || typeof node.ellipseEndAngle !== 'number') {
    return false
  }

  const sweep = Math.abs(node.ellipseEndAngle - node.ellipseStartAngle) % FULL_ROTATION_DEGREES
  return sweep > ARC_EPSILON_DEGREES && sweep < FULL_ROTATION_DEGREES - ARC_EPSILON_DEGREES
}

/**
 * Resolves whether one semantic angle lies inside a positive arc sweep.
 * @param angleDegrees Candidate semantic angle.
 * @param startDegrees Arc start angle.
 * @param sweepDegrees Positive arc sweep.
 */
function isAngleInsideArcSweep(
  angleDegrees: number,
  startDegrees: number,
  sweepDegrees: number,
): boolean {
  const offset = ((angleDegrees - startDegrees) % FULL_ROTATION_DEGREES + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
  return offset > 0 && offset < sweepDegrees
}

/**
 * Resolves positive sweep degrees from normalized semantic start/end angles.
 * @param startDegrees Normalized start angle.
 * @param endDegrees Normalized end angle.
 */
function resolveArcSweepDegrees(startDegrees: number, endDegrees: number): number {
  const rawSweep = endDegrees - startDegrees
  const normalizedSweep = ((rawSweep % FULL_ROTATION_DEGREES) + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
  return normalizedSweep === 0 ? FULL_ROTATION_DEGREES : normalizedSweep
}

/**
 * Normalizes semantic angle degrees into [0, 360).
 * @param value Raw angle value.
 */
function normalizeAngleDegrees(value: number): number {
  const normalized = value % FULL_ROTATION_DEGREES
  return normalized < 0 ? normalized + FULL_ROTATION_DEGREES : normalized
}

/**
 * Resolves line endpoints using renderer-compatible point priority.
 * @param node Line segment candidate.
 */
function resolveLineSegmentLocalPoints(node: EngineEditorHitTestNode): EngineEditorPoint[] {
  if (Array.isArray(node.points) && node.points.length >= LINE_SEGMENT_POINT_MIN_COUNT) {
    return [
      {x: node.points[0].x, y: node.points[0].y},
      {x: node.points[node.points.length - LINE_SEGMENT_LAST_POINT_OFFSET].x, y: node.points[node.points.length - LINE_SEGMENT_LAST_POINT_OFFSET].y},
    ]
  }

  return [
    {x: node.x, y: node.y},
    {x: node.x + node.width, y: node.y + node.height},
  ]
}

/**
 * Resolves whether rectangle-like node has non-zero corner radii.
 * @param node Rectangle-like node candidate.
 * @param bounds Rectangle bounds used for radius normalization.
 */
function hasRoundedRectCorners(node: EngineEditorHitTestNode, bounds: EngineGeometryBounds): boolean {
  const radii = resolveRoundedRectCornerRadii(node, {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
  })
  return radii.topLeft > 0 || radii.topRight > 0 || radii.bottomRight > 0 || radii.bottomLeft > 0
}

/**
 * Appends sampled quadratic-curve points while avoiding duplicate joins.
 * @param out Output point list being appended in-place.
 * @param control Quadratic control point.
 * @param end Quadratic end point.
 * @param stepCount Number of subdivision steps.
 */
function appendQuadraticCurvePoints(
  out: EngineEditorPoint[],
  control: EngineEditorPoint,
  end: EngineEditorPoint,
  stepCount: number,
): void {
  const start = out[out.length - 1]
  if (!start) {
    if (!isSamePoint(out[out.length - 1], end)) {
      out.push(end)
    }
    return
  }

  // Start from step=1 because step=0 equals current point already in `out`.
  for (let step = 1; step <= stepCount; step += 1) {
    const t = step / stepCount
    const oneMinusT = 1 - t
    const nextPoint = {
      x: oneMinusT * oneMinusT * start.x + QUADRATIC_BLEND_COEFFICIENT * oneMinusT * t * control.x + t * t * end.x,
      y: oneMinusT * oneMinusT * start.y + QUADRATIC_BLEND_COEFFICIENT * oneMinusT * t * control.y + t * t * end.y,
    }
    if (!isSamePoint(out[out.length - 1], nextPoint)) {
      out.push(nextPoint)
    }
  }
}

/**
 * Resolves approximate point equality for contour deduplication.
 * @param left Previous point candidate.
 * @param right Current point candidate.
 */
function isSamePoint(left: EngineEditorPoint | undefined, right: EngineEditorPoint): boolean {
  if (!left) {
    return false
  }
  return Math.hypot(left.x - right.x, left.y - right.y) <= POINT_EQUALITY_EPSILON
}
