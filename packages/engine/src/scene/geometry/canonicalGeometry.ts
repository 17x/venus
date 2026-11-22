import type {
  EngineClipShape,
  EnginePoint,
  EngineRect,
  EngineShapeKind,
  EngineShapeNode,
  EngineStrokeAlign,
} from '../types/types.ts'
import {getBoundingRectFromBezierPoints} from './bezier.ts'

export type EngineCanonicalGeometrySource = 'shape' | 'clip'
export type EngineCanonicalGeometryOutlineKind = 'rect' | 'ellipse' | 'line' | 'polygon' | 'path'
export type EngineCanonicalHitTestKind = 'rectangle' | 'ellipse' | 'lineSegment' | 'polygon' | 'star' | 'path'
export type EngineCanonicalRenderKind = EngineShapeKind | 'clip'

export interface EngineCanonicalGeometryOutline {
  kind: EngineCanonicalGeometryOutlineKind
  bounds: EngineRect
  points?: readonly EnginePoint[]
  bezierPoints?: EngineShapeNode['bezierPoints']
  closed: boolean
  arc?: {
    startAngle: number
    endAngle: number
    drawWedgeLine: boolean
  }
}

export interface EngineCanonicalGeometryPayload {
  source: EngineCanonicalGeometrySource
  nodeId: string
  authoredKind: string
  renderKind: EngineCanonicalRenderKind
  hitTestKind: EngineCanonicalHitTestKind
  geometryBounds: EngineRect
  strokeBounds: EngineRect
  handleBounds: EngineRect
  visualBounds: EngineRect
  outline: EngineCanonicalGeometryOutline
  strokeWidth: number
  strokeAlign: EngineStrokeAlign
  pointCount: number
  bezierPointCount: number
  closed: boolean
  cacheKey: string
}

const STROKE_INSET_DIVISOR = 2
const EXPAND_RECT_DOUBLE = 2
const RADIUS_TO_DIAMETER_MULTIPLIER = 2
const FULL_CIRCLE_DEGREES = 360
const LINE_POINT_MIN_COUNT = 2
const DEFAULT_STROKE_ALIGN: EngineStrokeAlign = 'center'
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
  FULL_CIRCLE_DEGREES,
]
const DEGREES_TO_RADIANS = Math.PI / STRAIGHT_ANGLE_DEGREES

/**
 * Resolves canonical, render-agnostic geometry for one engine shape.
 * Authored source fields remain on the node; this payload is derived data for
 * bounds, render, hit-test, overlay, export, and cache invalidation.
 * @param node Target shape node.
 */
export function resolveEngineShapeGeometry(node: EngineShapeNode): EngineCanonicalGeometryPayload {
  const geometryBounds = resolveEngineShapeGeometryBounds(node)
  const strokeWidth = resolveEngineShapeStrokeWidth(node)
  const strokeBounds = expandRect(geometryBounds, strokeWidth / STROKE_INSET_DIVISOR)
  const handleBounds = resolveEngineShapeHandleBounds(node, strokeBounds)
  const visualBounds = resolveVisualBounds(node, strokeBounds)
  const outline = resolveShapeOutline(node, geometryBounds)

  return {
    source: 'shape',
    nodeId: node.id,
    authoredKind: node.shape,
    renderKind: node.shape,
    hitTestKind: resolveShapeHitTestKind(node.shape),
    geometryBounds,
    strokeBounds,
    handleBounds,
    visualBounds,
    outline,
    strokeWidth,
    strokeAlign: node.strokeConfig?.align ?? node.strokeAlign ?? DEFAULT_STROKE_ALIGN,
    pointCount: node.pointCount ?? node.points?.length ?? 0,
    bezierPointCount: node.bezierPointCount ?? node.bezierPoints?.length ?? 0,
    closed: outline.closed,
    cacheKey: createShapeGeometryCacheKey(node),
  }
}

/**
 * Resolves canonical local geometry for one inline clip shape.
 * @param ownerId Node id that owns the inline clip.
 * @param clipShape Inline clip shape.
 */
export function resolveEngineClipGeometry(
  ownerId: string,
  clipShape: EngineClipShape,
): EngineCanonicalGeometryPayload {
  const geometryBounds = clipShape.kind === 'rect'
    ? normalizeRect(clipShape.rect)
    : getBoundingRectFromPoints(clipShape.points)
  const closed = clipShape.kind === 'rect' ? true : clipShape.closed !== false
  const outline: EngineCanonicalGeometryOutline = clipShape.kind === 'rect'
    ? {
      kind: 'rect',
      bounds: geometryBounds,
      closed: true,
    }
    : {
      kind: 'path',
      bounds: geometryBounds,
      points: clipShape.points,
      closed,
    }

  return {
    source: 'clip',
    nodeId: `${ownerId}:clip`,
    authoredKind: clipShape.kind,
    renderKind: 'clip',
    hitTestKind: clipShape.kind === 'rect' ? 'rectangle' : 'path',
    geometryBounds,
    strokeBounds: geometryBounds,
    handleBounds: geometryBounds,
    visualBounds: geometryBounds,
    outline,
    strokeWidth: 0,
    strokeAlign: DEFAULT_STROKE_ALIGN,
    pointCount: clipShape.kind === 'path' ? clipShape.points.length : 0,
    bezierPointCount: 0,
    closed,
    cacheKey: stableGeometryCacheKey({
      source: 'clip',
      ownerId,
      clipShape,
    }),
  }
}

/**
 * Resolves local geometry bounds without stroke/effects.
 * @param node Target shape node.
 */
export function resolveEngineShapeGeometryBounds(node: EngineShapeNode): EngineRect {
  if (node.shape === 'ellipse' && node.ellipseGeometry) {
    const {cx, cy, rx, ry} = node.ellipseGeometry
    const ellipseBounds = normalizeRect({
      x: cx - rx,
      y: cy - ry,
      width: rx * RADIUS_TO_DIAMETER_MULTIPLIER,
      height: ry * RADIUS_TO_DIAMETER_MULTIPLIER,
    })
    return resolveEllipseVisibleBounds(node, ellipseBounds)
  }

  if (node.shape === 'ellipse') {
    return resolveEllipseVisibleBounds(node, normalizeRect({
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width ?? 0,
      height: node.height ?? 0,
    }))
  }

  if (node.bezierPoints && node.bezierPoints.length > 0) {
    return normalizeRect(getBoundingRectFromBezierPoints(node.bezierPoints))
  }

  if (node.points && node.points.length > 0) {
    return getBoundingRectFromPoints(node.points)
  }

  return normalizeRect({
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 0,
    height: node.height ?? 0,
  })
}

/**
 * Resolves visible ellipse bounds, using sector AABB for authored arcs.
 * @param node Ellipse node.
 * @param fullBounds Full ellipse render bounds.
 */
function resolveEllipseVisibleBounds(
  node: EngineShapeNode,
  fullBounds: EngineRect,
): EngineRect {
  if (!hasEllipseArcRange(node)) {
    return fullBounds
  }

  const points = resolveEllipseArcBoundsPoints(node, fullBounds)
  return getBoundingRectFromPoints(points)
}

/**
 * Resolves whether an ellipse node uses a partial arc sweep.
 * @param node Ellipse node.
 */
function hasEllipseArcRange(node: EngineShapeNode): boolean {
  if (typeof node.ellipseStartAngle !== 'number' || typeof node.ellipseEndAngle !== 'number') {
    return false
  }

  const sweep = Math.abs(node.ellipseEndAngle - node.ellipseStartAngle) % FULL_CIRCLE_DEGREES
  return sweep > ARC_EPSILON_DEGREES && sweep < FULL_CIRCLE_DEGREES - ARC_EPSILON_DEGREES
}

/**
 * Resolves sampled extrema-defining points for an ellipse arc AABB.
 * @param node Ellipse arc node.
 * @param bounds Full ellipse render bounds.
 */
function resolveEllipseArcBoundsPoints(
  node: EngineShapeNode,
  bounds: EngineRect,
): EnginePoint[] {
  const startDegrees = normalizeAngleDegrees(node.ellipseStartAngle ?? 0)
  const sweepDegrees = resolveArcSweepDegrees(startDegrees, normalizeAngleDegrees(node.ellipseEndAngle ?? FULL_CIRCLE_DEGREES))
  const candidates = [
    startDegrees,
    startDegrees + sweepDegrees,
    ...ELLIPSE_EXTREMA_ANGLES_DEGREES.filter((angle) => isAngleInsideArcSweep(angle, startDegrees, sweepDegrees)),
  ]
  const center = {
    x: bounds.x + bounds.width / HALF_DIVISOR,
    y: bounds.y + bounds.height / HALF_DIVISOR,
  }
  const radiusX = Math.abs(bounds.width) / HALF_DIVISOR
  const radiusY = Math.abs(bounds.height) / HALF_DIVISOR
  const points = candidates.map((angleDegrees) => {
    const radians = angleDegrees * DEGREES_TO_RADIANS
    return {
      x: center.x + Math.cos(radians) * radiusX,
      y: center.y - Math.sin(radians) * radiusY,
    }
  })

  if (node.ellipseDrawWedgeLine) {
    points.push(center)
  }

  return points
}

/**
 * Resolves whether one semantic angle lies within a positive arc sweep.
 * @param angleDegrees Candidate semantic angle.
 * @param startDegrees Arc start angle.
 * @param sweepDegrees Positive arc sweep.
 */
function isAngleInsideArcSweep(
  angleDegrees: number,
  startDegrees: number,
  sweepDegrees: number,
): boolean {
  const offset = ((angleDegrees - startDegrees) % FULL_CIRCLE_DEGREES + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES
  return offset > 0 && offset < sweepDegrees
}

/**
 * Resolves positive arc sweep from normalized semantic start/end angles.
 * @param startDegrees Normalized start angle.
 * @param endDegrees Normalized end angle.
 */
function resolveArcSweepDegrees(startDegrees: number, endDegrees: number): number {
  const rawSweep = endDegrees - startDegrees
  const normalizedSweep = ((rawSweep % FULL_CIRCLE_DEGREES) + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES
  return normalizedSweep === 0 ? FULL_CIRCLE_DEGREES : normalizedSweep
}

/**
 * Normalizes semantic angle degrees into [0, 360).
 * @param value Raw angle value.
 */
function normalizeAngleDegrees(value: number): number {
  const normalized = value % FULL_CIRCLE_DEGREES
  return normalized < 0 ? normalized + FULL_CIRCLE_DEGREES : normalized
}

/**
 * Resolves stroke-aware local bounds used for culling, indexing, and marquee.
 * @param node Target shape node.
 */
export function resolveEngineShapeStrokeBounds(node: EngineShapeNode): EngineRect {
  return resolveEngineShapeGeometry(node).strokeBounds
}

/**
 * Resolves the effective shape stroke width from structured or legacy fields.
 * @param node Target shape node.
 */
export function resolveEngineShapeStrokeWidth(node: EngineShapeNode): number {
  return Math.max(0, node.strokeConfig?.width ?? node.strokeWidth ?? 0)
}

/**
 * Resolves local outline descriptor for one shape.
 * @param node Target shape node.
 * @param bounds Geometry bounds before stroke/effects.
 */
function resolveShapeOutline(
  node: EngineShapeNode,
  bounds: EngineRect,
): EngineCanonicalGeometryOutline {
  switch (node.shape) {
    case 'ellipse':
      return {
        kind: 'ellipse',
        bounds: resolveEllipseRenderBounds(node, bounds),
        closed: true,
        arc: {
          startAngle: node.ellipseStartAngle ?? 0,
          endAngle: node.ellipseEndAngle ?? FULL_CIRCLE_DEGREES,
          drawWedgeLine: node.ellipseDrawWedgeLine ?? false,
        },
      }
    case 'line':
      return {
        kind: 'line',
        bounds,
        points: resolveLinePoints(node),
        closed: false,
      }
    case 'polygon':
    case 'star':
      return {
        kind: 'polygon',
        bounds,
        points: node.points ?? [],
        closed: true,
      }
    case 'path':
      return {
        kind: 'path',
        bounds,
        points: node.points,
        bezierPoints: node.bezierPoints,
        closed: node.closed ?? false,
      }
    case 'rect':
    default:
      return {
        kind: 'rect',
        bounds,
        closed: true,
      }
  }
}

/**
 * Resolves full ellipse render bounds for outline/render metadata.
 * @param node Ellipse node.
 * @param fallback Fallback bounds for malformed ellipse fields.
 */
function resolveEllipseRenderBounds(
  node: EngineShapeNode,
  fallback: EngineRect,
): EngineRect {
  if (node.ellipseGeometry) {
    const {cx, cy, rx, ry} = node.ellipseGeometry
    return normalizeRect({
      x: cx - rx,
      y: cy - ry,
      width: rx * RADIUS_TO_DIAMETER_MULTIPLIER,
      height: ry * RADIUS_TO_DIAMETER_MULTIPLIER,
    })
  }

  if (typeof node.x === 'number' || typeof node.y === 'number' || typeof node.width === 'number' || typeof node.height === 'number') {
    return normalizeRect({
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width ?? 0,
      height: node.height ?? 0,
    })
  }

  return fallback
}

/**
 * Maps engine shape kind to the shared exact hit-test kind.
 * @param shape Shape kind.
 */
function resolveShapeHitTestKind(shape: EngineShapeKind): EngineCanonicalHitTestKind {
  switch (shape) {
    case 'rect':
      return 'rectangle'
    case 'ellipse':
      return 'ellipse'
    case 'line':
      return 'lineSegment'
    case 'polygon':
      return 'polygon'
    case 'star':
      return 'star'
    case 'path':
      return 'path'
    default:
      return 'rectangle'
  }
}

/**
 * Resolves line endpoints from points or fallback diagonal bounds.
 * @param node Target line node.
 */
function resolveLinePoints(node: EngineShapeNode): readonly EnginePoint[] {
  if (node.points && node.points.length >= LINE_POINT_MIN_COUNT) {
    return [node.points[0], node.points[node.points.length - 1]]
  }

  return [
    {x: node.x ?? 0, y: node.y ?? 0},
    {x: (node.x ?? 0) + (node.width ?? 0), y: (node.y ?? 0) + (node.height ?? 0)},
  ]
}

/**
 * Resolves handle-inclusive bounds for point and bezier geometry.
 * @param node Target shape node.
 * @param fallback Stroke bounds used by non-point shapes.
 */
function resolveEngineShapeHandleBounds(
  node: EngineShapeNode,
  fallback: EngineRect,
): EngineRect {
  const points: EnginePoint[] = []
  if (node.points) {
    points.push(...node.points)
  }
  if (node.bezierPoints) {
    for (const point of node.bezierPoints) {
      points.push(point.anchor)
      if (point.cp1) {
        points.push(point.cp1)
      }
      if (point.cp2) {
        points.push(point.cp2)
      }
    }
  }

  return points.length > 0
    ? unionRectBounds(fallback, getBoundingRectFromPoints(points))
    : fallback
}

/**
 * Resolves visual bounds by expanding stroke bounds for blur and shadow effects.
 * @param node Target shape node.
 * @param strokeBounds Stroke-aware bounds.
 */
function resolveVisualBounds(node: EngineShapeNode, strokeBounds: EngineRect): EngineRect {
  const shadow = node.visual?.shadow ?? node.shadow
  const blur = node.visual?.layerBlur?.amount ?? node.layerBlur?.amount ?? 0
  let bounds = expandRect(strokeBounds, Math.max(0, blur))

  if (shadow) {
    const shadowBlur = Math.max(0, shadow.blur ?? 0)
    const offsetX = shadow.offsetX ?? 0
    const offsetY = shadow.offsetY ?? 0
    bounds = unionRectBounds(bounds, expandRect({
      x: strokeBounds.x + offsetX,
      y: strokeBounds.y + offsetY,
      width: strokeBounds.width,
      height: strokeBounds.height,
    }, shadowBlur))
  }

  return bounds
}

/**
 * Resolves a local bounding rectangle from a point list.
 * @param points Source points.
 */
function getBoundingRectFromPoints(points: readonly EnginePoint[]): EngineRect {
  if (points.length === 0) {
    return {x: 0, y: 0, width: 0, height: 0}
  }

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Expands a rectangle by an inset on every side.
 * @param rect Source rectangle.
 * @param inset Expansion amount.
 */
function expandRect(rect: EngineRect, inset: number): EngineRect {
  if (inset <= 0) {
    return rect
  }

  return {
    x: rect.x - inset,
    y: rect.y - inset,
    width: rect.width + inset * EXPAND_RECT_DOUBLE,
    height: rect.height + inset * EXPAND_RECT_DOUBLE,
  }
}

/**
 * Normalizes negative-width or negative-height rectangles.
 * @param rect Source rectangle.
 */
function normalizeRect(rect: EngineRect): EngineRect {
  const minX = Math.min(rect.x, rect.x + rect.width)
  const minY = Math.min(rect.y, rect.y + rect.height)
  const maxX = Math.max(rect.x, rect.x + rect.width)
  const maxY = Math.max(rect.y, rect.y + rect.height)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Returns the union of two local rectangles.
 * @param left First rectangle.
 * @param right Second rectangle.
 */
function unionRectBounds(left: EngineRect, right: EngineRect): EngineRect {
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
 * Builds a deterministic cache key from geometry-affecting shape fields.
 * @param node Target shape node.
 */
function createShapeGeometryCacheKey(node: EngineShapeNode): string {
  return stableGeometryCacheKey({
    source: 'shape',
    id: node.id,
    shape: node.shape,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    ellipseGeometry: node.ellipseGeometry,
    cornerRadius: node.cornerRadius,
    cornerRadii: node.cornerRadii,
    ellipseStartAngle: node.ellipseStartAngle,
    ellipseEndAngle: node.ellipseEndAngle,
    ellipseDrawWedgeLine: node.ellipseDrawWedgeLine,
    points: node.points,
    bezierPoints: node.bezierPoints,
    anchorPoints: node.anchorPoints,
    closed: node.closed,
    strokeWidth: resolveEngineShapeStrokeWidth(node),
    strokeAlign: node.strokeConfig?.align ?? node.strokeAlign,
    strokeCap: node.strokeConfig?.cap ?? node.strokeCap,
    strokeJoin: node.strokeConfig?.join ?? node.strokeJoin,
    clip: node.clip,
  })
}

/**
 * Serializes structured geometry data into a stable cache-key fragment.
 * @param value Structured value.
 */
function stableGeometryCacheKey(value: unknown): string {
  return JSON.stringify(value)
}
