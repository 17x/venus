import { applyAffineMatrixToPoint } from '../shapeTransform/shapeTransform.ts'
import type { EngineEditorHitTestNode, EngineEditorPoint } from '../hitTest/hitTest.ts'
import type {
  EngineGeometryBounds,
} from './geometryPayloadTypes.ts'

const ARC_EPSILON_DEGREES = 1e-3
const ELLIPSE_SEGMENT_COUNT_HIGH = 360
const ELLIPSE_SEGMENT_COUNT_MEDIUM = 192
const HALF_DIVISOR = 2
const FULL_ROTATION_DEGREES = 360
const ARC_SEGMENT_MIN_COUNT = 24
const HALF_ROTATION_DEGREES = 180

/**
 * Stores affine 2D matrix used by geometry payload transforms.
 */
type GeometryMatrix2D = [number, number, number, number, number, number]

/**
 * Resolves ellipse outline shape including arc-sector boundaries when configured.
 * @param node Ellipse node candidate.
 * @param bounds Ellipse bounds in local coordinates.
 * @param matrix World transform matrix for projected contour points.
 * @param outlineLevel Outline detail level controlling arc sampling density.
 */
export function resolveEllipseOutlineShape(
  node: EngineEditorHitTestNode,
  bounds: EngineGeometryBounds,
  matrix: GeometryMatrix2D,
  outlineLevel: 'low' | 'medium' | 'high',
): { points: EngineEditorPoint[]; closed: boolean } {
  if (!hasEllipseArcRange(node)) {
    return {
      points: resolveEllipseOutlinePoints(bounds, matrix, outlineLevel),
      closed: true,
    }
  }

  const arcPoints = resolveEllipseArcPoints(node, bounds, outlineLevel)
  const center = {
    x: (bounds.minX + bounds.maxX) / HALF_DIVISOR,
    y: (bounds.minY + bounds.maxY) / HALF_DIVISOR,
  }

  return {
    points: resolveTransformedPoints([
      center,
      ...arcPoints,
      center,
    ], matrix),
    closed: true,
  }
}

/**
 * Resolves ellipse contour outline points with transform matrix applied.
 * @param bounds Ellipse bounds in local coordinates.
 * @param matrix World transform matrix for projected contour points.
 * @param outlineLevel Outline detail level controlling ellipse sampling density.
 */
function resolveEllipseOutlinePoints(
  bounds: EngineGeometryBounds,
  matrix: GeometryMatrix2D,
  outlineLevel: 'low' | 'medium' | 'high',
): EngineEditorPoint[] {
  const segmentCount = outlineLevel === 'high' ? ELLIPSE_SEGMENT_COUNT_HIGH : ELLIPSE_SEGMENT_COUNT_MEDIUM
  const centerX = (bounds.minX + bounds.maxX) / HALF_DIVISOR
  const centerY = (bounds.minY + bounds.maxY) / HALF_DIVISOR
  const radiusX = Math.abs(bounds.maxX - bounds.minX) / HALF_DIVISOR
  const radiusY = Math.abs(bounds.maxY - bounds.minY) / HALF_DIVISOR
  const points: EngineEditorPoint[] = []

  for (let segment = 0; segment < segmentCount; segment += 1) {
    const theta = (Math.PI * HALF_DIVISOR * segment) / segmentCount
    points.push({
      x: centerX + Math.cos(theta) * radiusX,
      y: centerY + Math.sin(theta) * radiusY,
    })
  }

  return resolveTransformedPoints(points, matrix)
}

/**
 * Resolves whether an ellipse node uses arc-sector geometry.
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
 * Resolves sampled points along the configured ellipse arc sweep.
 * @param node Ellipse node candidate.
 * @param bounds Ellipse bounds in local coordinates.
 * @param outlineLevel Outline detail level controlling arc sampling density.
 */
function resolveEllipseArcPoints(
  node: EngineEditorHitTestNode,
  bounds: EngineGeometryBounds,
  outlineLevel: 'low' | 'medium' | 'high',
): EngineEditorPoint[] {
  const startDegrees = normalizeAngleDegrees(node.ellipseStartAngle ?? 0)
  const endDegrees = normalizeAngleDegrees(node.ellipseEndAngle ?? FULL_ROTATION_DEGREES)
  const sweepDegrees = resolveArcSweepDegrees(startDegrees, endDegrees)
  const segmentCount = Math.max(
    ARC_SEGMENT_MIN_COUNT,
    Math.round((outlineLevel === 'high' ? ELLIPSE_SEGMENT_COUNT_HIGH : ELLIPSE_SEGMENT_COUNT_MEDIUM) * (sweepDegrees / FULL_ROTATION_DEGREES)),
  )

  const centerX = (bounds.minX + bounds.maxX) / HALF_DIVISOR
  const centerY = (bounds.minY + bounds.maxY) / HALF_DIVISOR
  const radiusX = Math.abs(bounds.maxX - bounds.minX) / HALF_DIVISOR
  const radiusY = Math.abs(bounds.maxY - bounds.minY) / HALF_DIVISOR
  const points: EngineEditorPoint[] = []

  for (let step = 0; step <= segmentCount; step += 1) {
    const t = step / segmentCount
    const angleDegrees = startDegrees + sweepDegrees * t
    const angleRadians = (angleDegrees * Math.PI) / HALF_ROTATION_DEGREES
    points.push({
      x: centerX + Math.cos(angleRadians) * radiusX,
      // Keep arc orientation aligned with hit-test/editor arc-angle semantics.
      y: centerY - Math.sin(angleRadians) * radiusY,
    })
  }

  return points
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
 * Resolves positive arc sweep degrees from normalized start/end angles.
 * @param startDegrees Normalized arc start angle in degrees.
 * @param endDegrees Normalized arc end angle in degrees.
 */
function resolveArcSweepDegrees(startDegrees: number, endDegrees: number): number {
  const rawSweep = endDegrees - startDegrees
  const normalizedSweep = ((rawSweep % FULL_ROTATION_DEGREES) + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
  return normalizedSweep === 0 ? FULL_ROTATION_DEGREES : normalizedSweep
}

/**
 * Normalizes degree values to the [0, 360) range.
 * @param value Raw angle value in degrees.
 */
function normalizeAngleDegrees(value: number): number {
  let normalized = value % FULL_ROTATION_DEGREES
  if (normalized < 0) {
    normalized += FULL_ROTATION_DEGREES
  }
  return normalized
}