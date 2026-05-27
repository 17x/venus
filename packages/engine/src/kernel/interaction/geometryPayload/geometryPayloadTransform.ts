import {
  applyAffineMatrixToPoint,
  resolveNodeTransform,
} from '../shapeTransform.ts'
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
import type { EngineEditorHitTestNode, EngineEditorPoint } from '../hitTest.ts'
import type {
  EngineGeometryBounds,
  EngineGeometryOutline,
} from './geometryPayloadTypes.ts'

const IDENTITY_GEOMETRY_MATRIX: GeometryMatrix2D = [1, 0, 0, 0, 1, 0]
const MIN_POLYGON_OUTLINE_POINTS = 3
const MIN_PATH_OUTLINE_POINTS = 2
const LINE_SEGMENT_POINT_MIN_COUNT = 2
const LINE_SEGMENT_LAST_POINT_OFFSET = 1
const ROUND_RECT_CORNER_STEPS_HIGH = 24
const ROUND_RECT_CORNER_STEPS_MEDIUM = 16
const QUADRATIC_BLEND_COEFFICIENT = 2
const POINT_EQUALITY_EPSILON = 1e-6
/**
 * Stores affine 2D matrix used by geometry payload transforms.
 */
export type GeometryMatrix2D = [number, number, number, number, number, number]

/**
 * Resolves transform-aware world bounds for one node.
 * @param node Node whose transformed bounds are requested.
 * @param nodeById Node lookup map for ancestor transform composition.
 * @param worldMatrixCache Cache for memoized node world matrices.
 */
export function resolveNodeBounds(
  node: EngineEditorHitTestNode,
  nodeById: Map<string, EngineEditorHitTestNode>,
  worldMatrixCache: Map<string, GeometryMatrix2D>,
): EngineGeometryBounds {
  const resolvedTransform = resolveNodeTransform(node)
  const worldMatrix = resolveNodeWorldMatrix(node, nodeById, worldMatrixCache)
  const corners = [
    {x: resolvedTransform.bounds.minX, y: resolvedTransform.bounds.minY},
    {x: resolvedTransform.bounds.maxX, y: resolvedTransform.bounds.minY},
    {x: resolvedTransform.bounds.maxX, y: resolvedTransform.bounds.maxY},
    {x: resolvedTransform.bounds.minX, y: resolvedTransform.bounds.maxY},
  ].map((point) => applyAffineMatrixToPoint(worldMatrix, point))

  const xs = corners.map((point) => point.x)
  const ys = corners.map((point) => point.y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
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
    node.type === 'text' ||
    node.type === 'group'
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
      points: node.points.map((point) => ({x: point.x, y: point.y})),
      closed: true,
    }
  }

  if (node.type === 'path') {
    const sampledPathPoints = resolvePathOutlinePoints(node, outlineLevel)
    if (sampledPathPoints && sampledPathPoints.length >= MIN_PATH_OUTLINE_POINTS) {
      return {
        kind: 'polyline',
        points: sampledPathPoints,
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
      {
        x: node.points[node.points.length - LINE_SEGMENT_LAST_POINT_OFFSET].x,
        y: node.points[node.points.length - LINE_SEGMENT_LAST_POINT_OFFSET].y,
      },
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
  return resolveTransformedPoints([
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
  ], matrix)
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

  const world = multiplyGeometryMatrices(resolveNodeWorldMatrix(parent, nodeById, cache), localMatrix)
  cache.set(node.id, world)
  return world
}

/**
 * Resolves one node local matrix from its own rotate/flip transform state.
 * @param node Node whose local transform matrix is requested.
 */
function resolveNodeLocalMatrix(node: EngineEditorHitTestNode): GeometryMatrix2D {
  const resolved = resolveNodeTransform(node)
  const [m00, m01, m02, m10, m11, m12] = resolved.matrix
  return [
    m00,
    m01,
    m02,
    m10,
    m11,
    m12,
  ]
}

/**
 * Multiplies affine matrices so child geometry composes with ancestor transforms.
 * @param left Parent world matrix.
 * @param right Child local matrix.
 */
function multiplyGeometryMatrices(left: GeometryMatrix2D, right: GeometryMatrix2D): GeometryMatrix2D {
  if (left === IDENTITY_GEOMETRY_MATRIX) {
    return right
  }
  if (right === IDENTITY_GEOMETRY_MATRIX) {
    return left
  }
  const [l00, l01, l02, l10, l11, l12] = left
  const [r00, r01, r02, r10, r11, r12] = right
  return [
    l00 * r00 + l01 * r10,
    l00 * r01 + l01 * r11,
    l00 * r02 + l01 * r12 + l02,
    l10 * r00 + l11 * r10,
    l10 * r01 + l11 * r11,
    l10 * r02 + l11 * r12 + l12,
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
