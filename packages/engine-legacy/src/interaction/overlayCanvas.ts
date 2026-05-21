import type {Mat3, Point2D} from '../math/matrix/matrix.ts'
import {applyMatrixToPoint} from '../math/matrix/matrix.ts'

const HALF_ROTATION_DEGREES = 180
const FULL_ROTATION_DEGREES = 360
const FULL_ROTATION_MULTIPLIER = 2
const FULL_ROTATION_RADIANS = Math.PI * FULL_ROTATION_MULTIPLIER
const ARC_RADIUS_EPSILON = 0.0001
const DEFAULT_ARC_OUTER_RADIUS = 12
const HANDLE_RADIUS_DEFAULT = 4
const CIRCLE_RADIUS_DEFAULT = 3
const MIN_LINE_POINTS = 2
const MIN_POLYGON_POINTS = 3

/**
 * Defines overlay primitive kinds supported by engine-side canvas overlay drawing.
 */
export type EngineOverlayPrimitiveType =
  | 'rect'
  | 'polygon'
  | 'polyline'
  | 'line'
  | 'arc'
  | 'circle'
  | 'handle'
  | 'caret'
  | 'label'
  | 'hit-area'

/**
 * Defines coordinate spaces accepted by engine-side overlay drawing.
 */
export type EngineOverlayCoordinateSpace = 'world' | 'screen'

/**
 * Defines lightweight style contract for engine-side overlay drawing.
 */
export interface EngineOverlayDrawStyle {
  /** Stores optional stroke color. */
  strokeColor?: string
  /** Stores optional stroke width in screen pixels. */
  strokeWidth?: number
  /** Stores optional stroke dash list in screen pixels. */
  strokeDash?: number[]
  /** Stores optional fill color. */
  fillColor?: string
  /** Stores optional global alpha override. */
  fillOpacity?: number
  /** Stores optional z-index ordering key. */
  zIndex?: number
  /** Stores optional point radius for circle/handle primitives. */
  pointRadius?: number
  /** Stores optional arc start angle in degrees. */
  startAngleDegrees?: number
  /** Stores optional arc end angle in degrees. */
  endAngleDegrees?: number
  /** Stores optional arc inner radius. */
  innerRadius?: number
  /** Stores optional arc outer radius. */
  outerRadius?: number
}

/**
 * Defines arc-sector hit-test input shared by selection-handle resolve flow.
 */
export interface EngineOverlayArcSectorHitTestOptions {
  /** Stores pointer position in the same coordinate space as center/radii. */
  point: Point2D
  /** Stores arc center point. */
  center: Point2D
  /** Stores inner radius of sector ring. */
  innerRadius: number
  /** Stores outer radius of sector ring. */
  outerRadius: number
  /** Stores start angle in degrees. */
  startAngleDegrees: number
  /** Stores end angle in degrees. */
  endAngleDegrees: number
}

/**
 * Defines one engine overlay draw node payload.
 */
export interface EngineOverlayDrawNode {
  /** Stores stable overlay node id. */
  id: string
  /** Stores primitive type for drawing dispatch. */
  type: EngineOverlayPrimitiveType
  /** Stores source coordinate space for point projection. */
  coordinate: EngineOverlayCoordinateSpace
  /** Stores primitive points when primitive is point-list based. */
  points?: Point2D[]
  /** Stores optional style payload. */
  style?: EngineOverlayDrawStyle
}

/**
 * Defines draw options for engine-side canvas overlay rendering.
 */
export interface DrawEngineOverlayNodesOptions {
  /** Stores target 2d drawing context. */
  context: CanvasRenderingContext2D
  /** Stores world-to-screen matrix used for world coordinate projection. */
  worldToScreen: Mat3
  /** Stores overlay nodes to draw in one pass. */
  nodes: EngineOverlayDrawNode[]
}

/**
 * Draws one overlay node list into canvas using engine projection helpers.
  * @param options Options object for this operation.
*/
export function drawEngineOverlayNodes(options: DrawEngineOverlayNodesOptions) {
  const sortedNodes = [...options.nodes].sort((left, right) => {
    const leftZ = left.style?.zIndex ?? 0
    const rightZ = right.style?.zIndex ?? 0
    if (leftZ === rightZ) {
      return left.id.localeCompare(right.id)
    }
    return leftZ - rightZ
  })

  sortedNodes.forEach((node) => {
    drawEngineOverlayNode(options.context, options.worldToScreen, node)
  })
}

/**
 * Resolves whether one point falls inside an arc-sector ring.
  * @param options Options object for this operation.
*/
export function isPointInsideEngineOverlayArcSector(
  options: EngineOverlayArcSectorHitTestOptions,
) {
  const dx = options.point.x - options.center.x
  const dy = options.point.y - options.center.y
  const distance = Math.hypot(dx, dy)
  if (distance < options.innerRadius || distance > options.outerRadius) {
    return false
  }

  const angleDegrees = normalizeAngleDegrees((Math.atan2(dy, dx) * HALF_ROTATION_DEGREES) / Math.PI)
  return isAngleInsideArcDegrees(
    angleDegrees,
    options.startAngleDegrees,
    options.endAngleDegrees,
  )
}

/**
 * Draws one overlay node according to primitive type.
  * @param context Rendering context.
 * @param worldToScreen worldToScreen parameter.
 * @param node Target node.
*/
function drawEngineOverlayNode(
  context: CanvasRenderingContext2D,
  worldToScreen: Mat3,
  node: EngineOverlayDrawNode,
) {
  const points = (node.points ?? []).map((point) => (
    node.coordinate === 'world'
      ? applyMatrixToPoint(worldToScreen, point)
      : point
  ))

  if (points.length === 0) {
    return
  }

  const strokeColor = node.style?.strokeColor
  const strokeWidth = node.style?.strokeWidth ?? 1
  const fillColor = node.style?.fillColor
  const fillOpacity = node.style?.fillOpacity ?? 1

  context.save()
  context.globalAlpha = fillOpacity
  if (Array.isArray(node.style?.strokeDash) && node.style.strokeDash.length > 0) {
    context.setLineDash(node.style.strokeDash)
  } else {
    context.setLineDash([])
  }
  context.lineWidth = strokeWidth
  context.lineJoin = 'round'
  context.lineCap = 'round'

  if (node.type === 'line' && points.length >= MIN_LINE_POINTS) {
    context.beginPath()
    context.moveTo(points[0].x, points[0].y)
    context.lineTo(points[1].x, points[1].y)
    if (strokeColor) {
      context.strokeStyle = strokeColor
      context.stroke()
    }
    context.restore()
    return
  }

  if (node.type === 'arc' && points.length >= 1) {
    const center = points[0]
    const outerRadius = Math.max(ARC_RADIUS_EPSILON, node.style?.outerRadius ?? node.style?.pointRadius ?? DEFAULT_ARC_OUTER_RADIUS)
    const innerRadius = Math.max(0, Math.min(outerRadius, node.style?.innerRadius ?? 0))
    const startAngleDegrees = node.style?.startAngleDegrees ?? 0
    const endAngleDegrees = node.style?.endAngleDegrees ?? FULL_ROTATION_DEGREES
    const startRadians = (startAngleDegrees * Math.PI) / HALF_ROTATION_DEGREES
    const endRadians = (endAngleDegrees * Math.PI) / HALF_ROTATION_DEGREES

    context.beginPath()
    context.arc(center.x, center.y, outerRadius, startRadians, endRadians)
    if (innerRadius > ARC_RADIUS_EPSILON) {
      context.arc(center.x, center.y, innerRadius, endRadians, startRadians, true)
    } else {
      context.lineTo(center.x, center.y)
    }
    context.closePath()

    if (fillColor) {
      context.fillStyle = fillColor
      context.fill()
    }
    if (strokeColor) {
      context.strokeStyle = strokeColor
      context.stroke()
    }

    context.restore()
    return
  }

  if (node.type === 'polyline' && points.length >= MIN_LINE_POINTS) {
    context.beginPath()
    context.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y)
    }
    if (fillColor) {
      context.fillStyle = fillColor
      context.fill()
    }
    if (strokeColor) {
      context.strokeStyle = strokeColor
      context.stroke()
    }
    context.restore()
    return
  }

  if (node.type === 'polygon' && points.length >= MIN_POLYGON_POINTS) {
    context.beginPath()
    context.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y)
    }
    context.closePath()
    if (fillColor) {
      context.fillStyle = fillColor
      context.fill()
    }
    if (strokeColor) {
      context.strokeStyle = strokeColor
      context.stroke()
    }
    context.restore()
    return
  }

  if ((node.type === 'handle' || node.type === 'circle') && points.length >= 1) {
    const radius = node.style?.pointRadius ?? (node.type === 'handle' ? HANDLE_RADIUS_DEFAULT : CIRCLE_RADIUS_DEFAULT)
    context.beginPath()
    context.arc(points[0].x, points[0].y, radius, 0, FULL_ROTATION_RADIANS)
    if (fillColor) {
      context.fillStyle = fillColor
      context.fill()
    }
    if (strokeColor) {
      context.strokeStyle = strokeColor
      context.stroke()
    }
    context.restore()
    return
  }

  if (node.type === 'rect' && points.length >= MIN_LINE_POINTS) {
    const minX = Math.min(points[0].x, points[1].x)
    const minY = Math.min(points[0].y, points[1].y)
    const width = Math.abs(points[1].x - points[0].x)
    const height = Math.abs(points[1].y - points[0].y)
    if (fillColor) {
      context.fillStyle = fillColor
      context.fillRect(minX, minY, width, height)
    }
    if (strokeColor) {
      context.strokeStyle = strokeColor
      context.strokeRect(minX, minY, width, height)
    }
  }

  context.restore()
}

/**
 * Normalizes angle into [0, 360) for stable wrap-around comparisons.
  * @param value value parameter.
*/
function normalizeAngleDegrees(value: number) {
  let normalized = value % FULL_ROTATION_DEGREES
  if (normalized < 0) {
    normalized += FULL_ROTATION_DEGREES
  }
  return normalized
}

/**
 * Resolves whether an angle is inside a possibly wrapped arc range.
  * @param angle angle parameter.
 * @param startAngle startAngle parameter.
 * @param endAngle endAngle parameter.
*/
function isAngleInsideArcDegrees(angle: number, startAngle: number, endAngle: number) {
  const normalizedAngle = normalizeAngleDegrees(angle)
  const normalizedStart = normalizeAngleDegrees(startAngle)
  const normalizedEnd = normalizeAngleDegrees(endAngle)

  if (normalizedStart <= normalizedEnd) {
    return normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd
  }

  // Wrapped arcs cross 360->0, so either side of the split is valid.
  return normalizedAngle >= normalizedStart || normalizedAngle <= normalizedEnd
}
