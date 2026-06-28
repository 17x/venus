import { getNormalizedBoundsFromBox } from '@venus/lib/geometry'
import {
  isPointInsideBounds,
  isPointInsideEllipse,
  isPointInsidePolygon,
  isPointInsideRoundedRect,
  isPointNearEllipseEdge,
  isPointNearLineSegment,
  isPointNearPolygonEdge,
  isPointNearRectEdge,
  isPointNearRoundedRectEdge,
  resolveRoundedRectCornerRadii,
} from './geometry.ts'
import { resolveShapeHitPointer } from './matrix/matrix.ts'
import {
  isClosedPathShape,
  isPathFillHit,
  isPathStrokeHit,
  sampleBezierPathPolygon,
} from './path.ts'
import {
  hasEllipseArcHitRange,
  isPointInsideEllipseArcSector,
  isPointNearEllipseArcSectorEdge,
  resolveBezierSegmentsPerCurveFromTolerance,
} from './hitTestEllipseArc.ts'

const CLIP_DEFAULT_TOLERANCE = 1.5
const MIN_POLYGON_VERTEX_COUNT = 3
const MIN_PATH_FILL_POINT_COUNT = 2

export type EngineEditorNodeType =
  | 'frame'
  | 'group'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'lineSegment'
  | 'path'
  | 'text'
  | 'image'

export interface EngineEditorPoint {
  x: number
  y: number
}

export interface EngineEditorBezierPoint {
  anchor: EngineEditorPoint
  cp1?: EngineEditorPoint | null
  cp2?: EngineEditorPoint | null
}

export interface EngineEditorHitTestNode {
  id: string
  type: EngineEditorNodeType
  parentId?: string | null
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
  clipPathId?: string
  fill?: {enabled?: boolean}
  stroke?: {enabled?: boolean}
  cornerRadius?: number
  cornerRadii?: {
    topLeft?: number
    topRight?: number
    bottomRight?: number
    bottomLeft?: number
  }
  points?: EngineEditorPoint[]
  bezierPoints?: EngineEditorBezierPoint[]
  closed?: boolean
  // Stores optional ellipse arc start angle in degrees.
  ellipseStartAngle?: number
  // Stores optional ellipse arc end angle in degrees.
  ellipseEndAngle?: number
  // Stores optional plain-text content for text-edge outline approximation.
  text?: string
  // Stores optional rich text runs used by text-edge outline approximation.
  textRuns?: Array<{
    // Stores run start offset in the text payload.
    start: number
    // Stores run end offset in the text payload.
    end: number
    // Stores optional typography controls for line-box estimation.
    style?: {
      // Stores font size for line-width/height approximation.
      fontSize?: number
      // Stores line-height override for stacked line-box layout.
      lineHeight?: number
      // Stores horizontal text alignment for line-box positioning.
      textAlign?: 'left' | 'center' | 'right'
      // Stores vertical text alignment for line-box positioning.
      verticalAlign?: 'top' | 'middle' | 'bottom'
    }
  }>
  schema?: {sourceFeatureKinds?: string[]}
}

export interface EngineShapeHitTestOptions {
  allowFrameSelection?: boolean
  tolerance?: number
  strictStrokeHitTest?: boolean
  shapeById?: Map<string, EngineEditorHitTestNode>
}

export interface EngineClipHitTestOptions {
  tolerance?: number
  shapeById?: Map<string, EngineEditorHitTestNode>
}

const DEFAULT_HIT_TOLERANCE = 6
/**
 * Handles isPointInsideEngineClipShape.
 * @param pointer Pointer position.
 * @param clipSource clipSource parameter.
 * @param options Options object for this operation.
 */
export function isPointInsideEngineClipShape(
  pointer: EngineEditorPoint,
  clipSource: EngineEditorHitTestNode,
  options?: EngineClipHitTestOptions,
) {
  const tolerance = options?.tolerance ?? CLIP_DEFAULT_TOLERANCE
  const testPointer = resolveShapeHitPointer(pointer, clipSource, options?.shapeById)

  if (clipSource.type === 'rectangle' || clipSource.type === 'frame' || clipSource.type === 'group') {
    const bounds = getNormalizedBoundsFromBox(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    const cornerRadii = resolveRoundedRectCornerRadii(clipSource, bounds)
    const hasRoundedCorners = cornerRadii.topLeft > 0 || cornerRadii.topRight > 0 || cornerRadii.bottomRight > 0 || cornerRadii.bottomLeft > 0
    return hasRoundedCorners
      ? isPointInsideRoundedRect(testPointer, bounds, cornerRadii)
      : isPointInsideBounds(testPointer, bounds)
  }

  if (clipSource.type === 'ellipse') {
    const bounds = getNormalizedBoundsFromBox(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    // Keep clip hit consistent with render path when ellipse uses arc sectors.
    if (hasEllipseArcHitRange(clipSource)) {
      return isPointInsideEllipseArcSector(testPointer, bounds, clipSource)
    }

    return isPointInsideEllipse(testPointer, bounds)
  }

  if (clipSource.type === 'polygon' || clipSource.type === 'star') {
    const points = clipSource.points
    if (!points || points.length < MIN_POLYGON_VERTEX_COUNT) {
      return false
    }
    return isPointInsidePolygon(testPointer, points) || isPointNearPolygonEdge(testPointer, points, tolerance)
  }

  if (clipSource.type === 'path') {
    if (clipSource.bezierPoints && clipSource.bezierPoints.length > 1) {
      const polygon = sampleBezierPathPolygon(
        clipSource.bezierPoints,
        resolveBezierSegmentsPerCurveFromTolerance(tolerance, 'fill'),
      )
      if (polygon.length < MIN_POLYGON_VERTEX_COUNT) {
        return false
      }
      return isPointInsidePolygon(testPointer, polygon) || isPointNearPolygonEdge(testPointer, polygon, tolerance)
    }

    if (clipSource.points && clipSource.points.length > MIN_PATH_FILL_POINT_COUNT) {
      return isPointInsidePolygon(testPointer, clipSource.points) || isPointNearPolygonEdge(testPointer, clipSource.points, tolerance)
    }
  }

  return false
}

/**
 * Handles isPointInsideEngineShapeHitArea.
 * @param pointer Pointer position.
 * @param shape shape parameter.
 * @param options Options object for this operation.
 */
export function isPointInsideEngineShapeHitArea(
  pointer: EngineEditorPoint,
  shape: EngineEditorHitTestNode,
  options?: EngineShapeHitTestOptions,
) {
  if (shape.type === 'group') {
    return false
  }
  if (shape.type === 'frame' && options?.allowFrameSelection === false) {
    return false
  }

  const tolerance = options?.tolerance ?? DEFAULT_HIT_TOLERANCE
  const strictStrokeHitTest = options?.strictStrokeHitTest ?? false
  const testPointer = resolveShapeHitPointer(pointer, shape, options?.shapeById)

  if (shape.type === 'image' || shape.type === 'text') {
    return isPointInsideBounds(testPointer, getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height))
  }

  if (shape.type === 'lineSegment') {
    if (!hasShapeStrokeHitArea(shape)) {
      return false
    }

    return isPointNearLineSegment(testPointer, {
      x1: shape.x,
      y1: shape.y,
      x2: shape.x + shape.width,
      y2: shape.y + shape.height,
    }, tolerance)
  }

  if (shape.type === 'rectangle' || shape.type === 'frame') {
    const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
    const cornerRadii = resolveRoundedRectCornerRadii(shape, bounds)
    const hasRoundedCorners = cornerRadii.topLeft > 0 || cornerRadii.topRight > 0 || cornerRadii.bottomRight > 0 || cornerRadii.bottomLeft > 0
    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const hasFillArea = hasShapeFillHitArea(shape)
    const fillHit = hasFillArea && (
      hasRoundedCorners
        ? isPointInsideRoundedRect(testPointer, bounds, cornerRadii)
        : isPointInsideBounds(testPointer, bounds)
    )
    const strokeOnly = strictStrokeHitTest && hasStrokeArea
    return (
      (hasStrokeArea && (
        hasRoundedCorners
          ? isPointNearRoundedRectEdge(testPointer, bounds, cornerRadii, tolerance)
          : isPointNearRectEdge(testPointer, bounds, tolerance)
      )) ||
      (!strokeOnly && fillHit)
    )
  }

  if (shape.type === 'ellipse') {
    const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const strokeOnly = strictStrokeHitTest && hasStrokeArea

    if (hasEllipseArcHitRange(shape)) {
      return (
        (hasStrokeArea && isPointNearEllipseArcSectorEdge(testPointer, bounds, shape, tolerance)) ||
        (!strokeOnly && hasShapeFillHitArea(shape) && isPointInsideEllipseArcSector(testPointer, bounds, shape))
      )
    }

    return (
      (hasStrokeArea && isPointNearEllipseEdge(testPointer, bounds, tolerance)) ||
      (!strokeOnly && hasShapeFillHitArea(shape) && isPointInsideEllipse(testPointer, bounds))
    )
  }

  if (shape.type === 'polygon' || shape.type === 'star') {
    const points = shape.points
    if (!points || points.length < MIN_POLYGON_VERTEX_COUNT) {
      return false
    }

    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const strokeOnly = strictStrokeHitTest && hasStrokeArea
    return (
      (hasStrokeArea && isPointNearPolygonEdge(testPointer, points, tolerance)) ||
      (!strokeOnly && hasShapeFillHitArea(shape) && isPointInsidePolygon(testPointer, points))
    )
  }

  if (shape.type === 'path') {
    const coarseBounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
    // Skip expensive path segment/polygon checks when pointer is clearly outside expanded bounds.
    if (!isPointInsideExpandedBounds(testPointer, coarseBounds, tolerance)) {
      return false
    }

    const closedShape = isClosedPathShape(shape)
    const hasStrokeArea = hasShapeStrokeHitArea(shape)
    const strokeOnly = strictStrokeHitTest && hasStrokeArea
    if (hasStrokeArea && isPathStrokeHit(testPointer, shape, tolerance, closedShape)) {
      return true
    }
    return !strokeOnly && hasShapeFillHitArea(shape, closedShape) && isPathFillHit(testPointer, shape, tolerance, closedShape)
  }

  return false
}

// Resolve pointer-vs-bounds coarse check with tolerance expansion.
/**
 * Handles isPointInsideExpandedBounds.
 * @param pointer Pointer position.
 * @param bounds Bounds data.
 * @param tolerance tolerance parameter.
 */
function isPointInsideExpandedBounds(
  pointer: EngineEditorPoint,
  bounds: ReturnType<typeof getNormalizedBoundsFromBox>,
  tolerance: number,
) {
  const expanded = {
    minX: bounds.minX - tolerance,
    minY: bounds.minY - tolerance,
    maxX: bounds.maxX + tolerance,
    maxY: bounds.maxY + tolerance,
  }
  return isPointInsideBounds(pointer, expanded)
}

/**
 * Handles hasShapeFillHitArea.
 * @param shape shape parameter.
 * @param closedPathHint closedPathHint parameter.
 */
function hasShapeFillHitArea(shape: EngineEditorHitTestNode, closedPathHint?: boolean) {
  if (shape.type === 'image' || shape.type === 'text') {
    return true
  }
  if (shape.type === 'group' || shape.type === 'lineSegment') {
    return false
  }
  if (shape.fill?.enabled === false) {
    return false
  }
  if (shape.fill) {
    return true
  }

  const featureKinds = shape.schema?.sourceFeatureKinds ?? []
  if (featureKinds.some((kind) => String(kind).toUpperCase() === 'FILL')) {
    return true
  }

  return shape.type === 'path' && (closedPathHint ?? isClosedPathShape(shape))
}

/**
 * Handles hasShapeStrokeHitArea.
 * @param shape shape parameter.
 */
function hasShapeStrokeHitArea(shape: EngineEditorHitTestNode) {
  if (shape.type === 'image' || shape.type === 'text' || shape.type === 'group') {
    return false
  }
  if (shape.stroke?.enabled === false) {
    return false
  }
  if (shape.stroke) {
    return true
  }

  return (
    shape.type === 'rectangle' ||
    shape.type === 'frame' ||
    shape.type === 'ellipse' ||
    shape.type === 'polygon' ||
    shape.type === 'star' ||
    shape.type === 'lineSegment' ||
    shape.type === 'path'
  )
}
