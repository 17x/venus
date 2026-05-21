import type { EngineRenderFrame } from '../types/index.ts'
import type { EngineRect, EngineShapeNode } from '../../scene/types/types.ts'

export interface Canvas2DPathCounters {
  trivialPathFastPathCount: number
  contourParseCount: number
}

type PathSimplificationBucket = 0 | typeof SIMPLIFICATION_BUCKET_MEDIUM | typeof SIMPLIFICATION_BUCKET_HIGH
type NonZeroPathSimplificationBucket = Exclude<PathSimplificationBucket, 0>

const HALF_DIVISOR = 2
const FULL_CIRCLE_DEGREES = 360
const FULL_CIRCLE_RADIANS = Math.PI * HALF_DIVISOR
const ELLIPSE_ARC_EPSILON_DEGREES = 1e-3
const SIMPLIFICATION_BUCKET_HIGH = 2
const SIMPLIFICATION_BUCKET_MEDIUM = 1
const SIMPLIFICATION_SCALE_HIGH_THRESHOLD = 0.22
const SIMPLIFICATION_SCALE_MEDIUM_THRESHOLD = 0.45
const ARROWHEAD_MIN_SIZE = 6
const ARROWHEAD_SIZE_MULTIPLIER = 4
const DEGREES_TO_RADIANS_DIVISOR = 180
const OPEN_PATH_MIN_DIRECT_POINTS = 2
const CLOSED_PATH_MIN_DIRECT_POINTS = 4
const CLOSED_POINT_CONTOUR_MIN_POINTS = 4
const VIEWPORT_SCALE_EPSILON = 0.0001
const SIMPLIFICATION_BUCKET_HIGH_MIN_SCREEN_STEP_PX = 6
const SIMPLIFICATION_BUCKET_MEDIUM_MIN_SCREEN_STEP_PX = 3
const MIN_RETAINED_POINTS = 8
const MAX_RETAINED_POINTS = 256
const ENDPOINT_MIN_POINT_COUNT = 2
const ARROW_DIRECTION_EPSILON = 1e-6
const HALF_SIZE_MULTIPLIER = 0.5
const DIAMOND_TIP_MULTIPLIER = 1.8
const CIRCLE_CENTER_OFFSET_MULTIPLIER = 0.75
const CIRCLE_RADIUS_MULTIPLIER = 0.75
const SECOND_POINT_INDEX = 1
const PREVIOUS_ENDPOINT_OFFSET = 2

// Keep Canvas2D geometry helpers isolated so the auxiliary backend stays
// organized without changing WebGL-first renderer ownership.
/**
 * Handles appendShapePath.
 * @param context Rendering context.
 * @param node Target node.
 * @param rect rect parameter.
 * @param pathSimplificationBucket pathSimplificationBucket parameter.
 * @param viewportScale viewportScale parameter.
 * @param counters counters parameter.
 */
export function appendShapePath(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
  pathSimplificationBucket: PathSimplificationBucket,
  viewportScale: number,
  counters: Canvas2DPathCounters,
) {
  if (node.shape === 'ellipse') {
    const cx = rect.x + rect.width / HALF_DIVISOR
    const cy = rect.y + rect.height / HALF_DIVISOR
    const rx = Math.abs(rect.width) / HALF_DIVISOR
    const ry = Math.abs(rect.height) / HALF_DIVISOR
    const start = resolveCanvasEllipseAngleRadians(node.ellipseStartAngle ?? 0)
    const end = resolveCanvasEllipseAngleRadians(node.ellipseEndAngle ?? FULL_CIRCLE_DEGREES)
    const arc = normalizeArcRange(start, end)
    const fullCircle = !hasEllipseArc(node)

    if (fullCircle) {
      context.ellipse(cx, cy, rx, ry, 0, 0, FULL_CIRCLE_RADIANS)
      return true
    }

    context.moveTo(cx, cy)
    context.ellipse(cx, cy, rx, ry, 0, arc.start, arc.end, arc.anticlockwise)
    context.closePath()
    return true
  }

  if (node.shape === 'line') {
    if (Array.isArray(node.points) && node.points.length >= ENDPOINT_MIN_POINT_COUNT) {
      // Line nodes keep absolute anchors; using rect diagonal can flip direction and shift the rendered segment.
      const start = node.points[0]
      const end = node.points[node.points.length - 1]
      context.moveTo(start.x, start.y)
      context.lineTo(end.x, end.y)
      return true
    }

    context.moveTo(rect.x, rect.y)
    context.lineTo(rect.x + rect.width, rect.y + rect.height)
    return true
  }

  if (node.shape === 'polygon') {
    const points = node.points ?? []
    const [head, ...rest] = points
    if (!head) {
      return false
    }
    context.moveTo(head.x, head.y)
    rest.forEach((point) => context.lineTo(point.x, point.y))
    context.closePath()
    return true
  }

  if (node.shape === 'path') {
    return appendPathGeometry(context, node, pathSimplificationBucket, viewportScale, counters)
  }

  const hasCornerRadii = Boolean(
    node.cornerRadii ||
    (typeof node.cornerRadius === 'number' && node.cornerRadius > 0),
  )
  if (hasCornerRadii) {
    appendRectPathWithCornerRadii(
      context,
      rect,
      node.cornerRadii,
      node.cornerRadius,
    )
  } else {
    context.rect(rect.x, rect.y, rect.width, rect.height)
  }
  return true
}

// Reuse the same simplification policy in Canvas2D so the auxiliary backend
// mirrors interaction-time geometry cost controls without owning render policy.
/**
 * Handles resolvePathSimplificationBucket.
 * @param frame Current render frame.
 */
export function resolvePathSimplificationBucket(
  frame: EngineRenderFrame,
): PathSimplificationBucket {
  const scale = Math.max(0, Math.abs(frame.viewport.scale))
  if (frame.context.quality === 'interactive' || scale <= SIMPLIFICATION_SCALE_HIGH_THRESHOLD) {
    return SIMPLIFICATION_BUCKET_HIGH
  }
  if (scale <= SIMPLIFICATION_SCALE_MEDIUM_THRESHOLD) {
    return SIMPLIFICATION_BUCKET_MEDIUM
  }
  return 0
}

// Keep arrowhead raster logic adjacent to path helpers because it depends on
// the same endpoint extraction rules as line and path drawing.
/**
 * Handles drawShapeArrowheads.
 * @param context Rendering context.
 * @param node Target node.
 * @param strokeColor strokeColor parameter.
 * @param strokeWidth strokeWidth parameter.
 * @param rect rect parameter.
 */
export function drawShapeArrowheads(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  strokeColor: string,
  strokeWidth: number,
  rect: {x: number; y: number; width: number; height: number},
) {
  if (node.shape !== 'line' && node.shape !== 'path') {
    return
  }
  if (node.closed) {
    return
  }

  const segment = resolveShapeEndpointSegment(node, rect)
  if (!segment) {
    return
  }

  const size = Math.max(ARROWHEAD_MIN_SIZE, strokeWidth * ARROWHEAD_SIZE_MULTIPLIER)
  if (node.strokeStartArrowhead && node.strokeStartArrowhead !== 'none') {
    drawArrowhead(context, node.strokeStartArrowhead, {
      x: segment.start.x,
      y: segment.start.y,
      dx: segment.start.x - segment.next.x,
      dy: segment.start.y - segment.next.y,
      size,
      color: strokeColor,
      strokeWidth,
    })
  }
  if (node.strokeEndArrowhead && node.strokeEndArrowhead !== 'none') {
    drawArrowhead(context, node.strokeEndArrowhead, {
      x: segment.end.x,
      y: segment.end.y,
      dx: segment.end.x - segment.previous.x,
      dy: segment.end.y - segment.previous.y,
      size,
      color: strokeColor,
      strokeWidth,
    })
  }
}

// Keep rounded-rect path construction reusable for both node drawing and clip
// shapes so Canvas2D does not duplicate geometry building logic.
/**
 * Handles appendRoundedRectPath.
 * @param context Rendering context.
 * @param rect rect parameter.
 * @param radius radius parameter.
 */
export function appendRoundedRectPath(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rect: EngineRect,
  radius: number,
) {
  appendRectPathWithCornerRadii(context, rect, undefined, radius)
}

/**
 * Handles appendRectPathWithCornerRadii.
 * @param context Rendering context.
 * @param rect rect parameter.
 * @param cornerRadii cornerRadii parameter.
 * @param uniformRadius uniformRadius parameter.
 */
export function appendRectPathWithCornerRadii(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rect: EngineRect,
  cornerRadii?: {
    topLeft?: number
    topRight?: number
    bottomRight?: number
    bottomLeft?: number
  },
  uniformRadius?: number,
) {
  const width = Math.abs(rect.width)
  const height = Math.abs(rect.height)
  const left = Math.min(rect.x, rect.x + rect.width)
  const top = Math.min(rect.y, rect.y + rect.height)
  const right = left + width
  const bottom = top + height
  const resolved = normalizeCornerRadii({
    topLeft: cornerRadii?.topLeft ?? uniformRadius ?? 0,
    topRight: cornerRadii?.topRight ?? uniformRadius ?? 0,
    bottomRight: cornerRadii?.bottomRight ?? uniformRadius ?? 0,
    bottomLeft: cornerRadii?.bottomLeft ?? uniformRadius ?? 0,
  }, width, height)

  context.moveTo(left + resolved.topLeft, top)
  context.lineTo(right - resolved.topRight, top)
  context.quadraticCurveTo(right, top, right, top + resolved.topRight)
  context.lineTo(right, bottom - resolved.bottomRight)
  context.quadraticCurveTo(right, bottom, right - resolved.bottomRight, bottom)
  context.lineTo(left + resolved.bottomLeft, bottom)
  context.quadraticCurveTo(left, bottom, left, bottom - resolved.bottomLeft)
  context.lineTo(left, top + resolved.topLeft)
  context.quadraticCurveTo(left, top, left + resolved.topLeft, top)
  context.closePath()
}

// Share ellipse arc helpers with the thin Canvas2D draw orchestrator so arc
// rendering stays consistent after moving geometry helpers into this module.
/**
 * Handles hasEllipseArc.
 * @param node Target node.
 */
export function hasEllipseArc(node: EngineShapeNode) {
  if (node.shape !== 'ellipse') {
    return false
  }
  const start = node.ellipseStartAngle
  const end = node.ellipseEndAngle
  if (typeof start !== 'number' || typeof end !== 'number') {
    return false
  }
  const sweep = Math.abs(end - start) % FULL_CIRCLE_DEGREES
  return sweep > ELLIPSE_ARC_EPSILON_DEGREES && sweep < FULL_CIRCLE_DEGREES - ELLIPSE_ARC_EPSILON_DEGREES
}

/**
 * Handles normalizeArcRange.
 * @param start start parameter.
 * @param end end parameter.
 */
export function normalizeArcRange(start: number, end: number) {
  const tau = FULL_CIRCLE_RADIANS
  let delta = end - start
  while (delta <= -tau) {
    delta += tau
  }
  while (delta > tau) {
    delta -= tau
  }
  return {
    start,
    end: start + delta,
    anticlockwise: delta < 0,
  }
}

/**
 * Handles toRadians.
 * @param deg deg parameter.
 */
export function toRadians(deg: number) {
  return (deg * Math.PI) / DEGREES_TO_RADIANS_DIVISOR
}

// Convert shared ellipse angle semantics (+90deg upward) into Canvas2D arc parameter space.
/**
 * Handles resolveCanvasEllipseAngleRadians.
 * @param semanticDegrees semanticDegrees parameter.
 */
export function resolveCanvasEllipseAngleRadians(semanticDegrees: number) {
  return toRadians(-semanticDegrees)
}

/**
 * Handles appendPathGeometry.
 * @param context Rendering context.
 * @param node Target node.
 * @param pathSimplificationBucket pathSimplificationBucket parameter.
 * @param viewportScale viewportScale parameter.
 * @param counters counters parameter.
 */
function appendPathGeometry(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  pathSimplificationBucket: PathSimplificationBucket,
  viewportScale: number,
  counters: Canvas2DPathCounters,
) {
  const bezierPoints = node.bezierPoints ?? []
  const points = node.points ?? []
  const bezierPointCount = node.bezierPointCount ?? bezierPoints.length
  const pointCount = node.pointCount ?? points.length
  const pointContours = bezierPointCount === 0 && node.closed && pointCount > CLOSED_PATH_MIN_DIRECT_POINTS - 1
    ? resolveClosedPointContours(points, counters)
    : []

  if (pathSimplificationBucket > 0) {
    const sourcePointCount = bezierPointCount > 0 ? bezierPointCount : pointCount
    const minimumDirectPointCount = node.closed ? CLOSED_PATH_MIN_DIRECT_POINTS : OPEN_PATH_MIN_DIRECT_POINTS

    // Low-complexity paths do not benefit from projected-density simplification.
    // Use worker-precomputed counts when available so interaction-time path prep
    // can skip extra contour/simplification work for trivial geometry.
    if (sourcePointCount <= minimumDirectPointCount && pointContours.length <= 1) {
      counters.trivialPathFastPathCount += 1
      return appendPathGeometry(context, node, 0, viewportScale, counters)
    }

    const sourcePoints = bezierPointCount > 0
      ? bezierPoints.map((point) => point.anchor)
      : points

    if (pointContours.length > 1) {
      pointContours.forEach((contour) => {
        const simplified = simplifyPathPointsForBucket(
          contour,
          pathSimplificationBucket as NonZeroPathSimplificationBucket,
          true,
          viewportScale,
        )
        const [head, ...rest] = simplified
        if (!head) {
          return
        }
        context.moveTo(head.x, head.y)
        rest.forEach((point) => context.lineTo(point.x, point.y))
        context.closePath()
      })
      return true
    }

    const simplifiedPoints = simplifyPathPointsForBucket(
      sourcePoints,
      pathSimplificationBucket as NonZeroPathSimplificationBucket,
      Boolean(node.closed),
      viewportScale,
    )
    const [head, ...rest] = simplifiedPoints
    if (!head) {
      return false
    }

    context.moveTo(head.x, head.y)
    rest.forEach((point) => context.lineTo(point.x, point.y))
    if (node.closed) {
      context.closePath()
    }
    return true
  }

  if (pointContours.length > 1) {
    pointContours.forEach((contour) => {
      const [head, ...rest] = contour
      if (!head) {
        return
      }

      context.moveTo(head.x, head.y)
      rest.forEach((point) => context.lineTo(point.x, point.y))
      context.closePath()
    })
    return true
  }

  if (bezierPoints.length > 0) {
    const [head, ...rest] = bezierPoints
    context.moveTo(head.anchor.x, head.anchor.y)
    let previous = head
    rest.forEach((current) => {
      context.bezierCurveTo(
        previous.cp2?.x ?? previous.anchor.x,
        previous.cp2?.y ?? previous.anchor.y,
        current.cp1?.x ?? current.anchor.x,
        current.cp1?.y ?? current.anchor.y,
        current.anchor.x,
        current.anchor.y,
      )
      previous = current
    })
    if (node.closed) {
      context.closePath()
    }
    return true
  }

  const [head, ...rest] = points
  if (!head) {
    return false
  }

  context.moveTo(head.x, head.y)
  rest.forEach((point) => context.lineTo(point.x, point.y))
  if (node.closed) {
    context.closePath()
  }
  return true
}

/**
 * Handles resolveClosedPointContours.
 * @param points points parameter.
 * @param counters counters parameter.
 */
function resolveClosedPointContours(
  points: readonly {x: number; y: number}[],
  counters?: Pick<Canvas2DPathCounters, 'contourParseCount'>,
) {
  if (counters) {
    counters.contourParseCount += 1
  }

  const contours: Array<Array<{x: number; y: number}>> = []
  let cursor = 0

  while (cursor < points.length) {
    const start = points[cursor]
    if (!start) {
      break
    }

    const contour: Array<{x: number; y: number}> = [start]
    let closedIndex = -1

    for (let index = cursor + 1; index < points.length; index += 1) {
      const point = points[index]
      if (!point) {
        continue
      }
      contour.push(point)
      if (point.x === start.x && point.y === start.y && contour.length >= CLOSED_POINT_CONTOUR_MIN_POINTS) {
        closedIndex = index
        break
      }
    }

    if (closedIndex < 0) {
      break
    }

    contours.push(contour)
    cursor = closedIndex + 1
  }

  return contours
}

/**
 * Handles simplifyPathPointsForBucket.
 * @param points points parameter.
 * @param bucket bucket parameter.
 * @param closed closed parameter.
 * @param viewportScale viewportScale parameter.
 */
function simplifyPathPointsForBucket(
  points: readonly {x: number; y: number}[],
  bucket: NonZeroPathSimplificationBucket,
  closed: boolean,
  viewportScale: number,
) {
  if (points.length <= OPEN_PATH_MIN_DIRECT_POINTS) {
    return [...points]
  }

  // Keep point density roughly constant in screen-space so low-zoom interaction
  // work scales down with projected path complexity, not raw anchor count.
  const absScale = Math.max(VIEWPORT_SCALE_EPSILON, Math.abs(viewportScale))
  const minScreenStepPx = bucket === SIMPLIFICATION_BUCKET_HIGH
    ? SIMPLIFICATION_BUCKET_HIGH_MIN_SCREEN_STEP_PX
    : SIMPLIFICATION_BUCKET_MEDIUM_MIN_SCREEN_STEP_PX
  const minWorldStep = minScreenStepPx / absScale
  const minWorldStepSquared = minWorldStep * minWorldStep
  const simplified: Array<{x: number; y: number}> = [points[0]]

  let polylineLength = 0
  let previousPoint = points[0]
  let lastKeptPoint = points[0]
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const segmentX = point.x - previousPoint.x
    const segmentY = point.y - previousPoint.y
    polylineLength += Math.hypot(segmentX, segmentY)
    previousPoint = point

    const dx = point.x - lastKeptPoint.x
    const dy = point.y - lastKeptPoint.y
    if ((dx * dx) + (dy * dy) >= minWorldStepSquared) {
      simplified.push(point)
      lastKeptPoint = point
    }
  }

  const last = points[points.length - 1]
  polylineLength += Math.hypot(last.x - previousPoint.x, last.y - previousPoint.y)

  // Cap retained points by projected path length so very dense paths still
  // downsample deterministically at far zoom levels.
  const projectedLength = polylineLength * absScale
  const maxRetainedPoints = Math.max(
    MIN_RETAINED_POINTS,
    Math.min(MAX_RETAINED_POINTS, Math.ceil(projectedLength / minScreenStepPx) + SIMPLIFICATION_BUCKET_MEDIUM),
  )
  if (simplified.length > maxRetainedPoints) {
    const downsampled: Array<{x: number; y: number}> = [simplified[0]]
    const step = (simplified.length - 1) / Math.max(1, maxRetainedPoints - 1)
    for (let index = 1; index < maxRetainedPoints - 1; index += 1) {
      downsampled.push(simplified[Math.round(step * index)])
    }
    simplified.length = 0
    simplified.push(...downsampled)
  }

  if (!closed || last.x !== points[0].x || last.y !== points[0].y) {
    simplified.push(last)
  }

  return simplified
}

/**
 * Handles resolveShapeEndpointSegment.
 * @param node Target node.
 * @param rect rect parameter.
 */
function resolveShapeEndpointSegment(
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
) {
  if (node.shape === 'line') {
    if (Array.isArray(node.points) && node.points.length >= ENDPOINT_MIN_POINT_COUNT) {
      const start = node.points[0]
      const end = node.points[node.points.length - 1]
      return {
        start,
        next: end,
        previous: start,
        end,
      }
    }

    const start = {x: rect.x, y: rect.y}
    const end = {x: rect.x + rect.width, y: rect.y + rect.height}
    return {
      start,
      next: end,
      previous: start,
      end,
    }
  }

  const bezierPointCount = node.bezierPointCount ?? node.bezierPoints?.length ?? 0
  if (bezierPointCount >= ENDPOINT_MIN_POINT_COUNT && node.bezierPoints) {
    const first = node.bezierPoints[0]
    const second = node.bezierPoints[SECOND_POINT_INDEX]
    const previous = node.bezierPoints[bezierPointCount - PREVIOUS_ENDPOINT_OFFSET]
    const last = node.bezierPoints[bezierPointCount - 1]

    if (!first || !second || !previous || !last) {
      return null
    }

    return {
      start: first.anchor,
      next: second.anchor,
      previous: previous.anchor,
      end: last.anchor,
    }
  }

  const pointCount = node.pointCount ?? node.points?.length ?? 0
  const points = node.points ?? []
  if (pointCount < ENDPOINT_MIN_POINT_COUNT) {
    return null
  }

  return {
    start: points[0],
    next: points[SECOND_POINT_INDEX],
    previous: points[pointCount - PREVIOUS_ENDPOINT_OFFSET],
    end: points[pointCount - 1],
  }
}

/**
 * Handles drawArrowhead.
 * @param context Rendering context.
 * @param kind kind parameter.
 * @param options Options object for this operation.
 */
function drawArrowhead(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  kind: NonNullable<EngineShapeNode['strokeStartArrowhead']>,
  options: {
    x: number
    y: number
    dx: number
    dy: number
    size: number
    color: string
    strokeWidth: number
  },
) {
  const length = Math.hypot(options.dx, options.dy)
  if (length <= ARROW_DIRECTION_EPSILON) {
    return
  }
  const ux = options.dx / length
  const uy = options.dy / length
  const nx = -uy
  const ny = ux
  const size = options.size
  const half = size * HALF_SIZE_MULTIPLIER
  const backX = options.x + ux * size
  const backY = options.y + uy * size
  const leftX = backX + nx * half
  const leftY = backY + ny * half
  const rightX = backX - nx * half
  const rightY = backY - ny * half

  context.save()
  context.fillStyle = options.color
  context.strokeStyle = options.color
  context.lineWidth = Math.max(1, options.strokeWidth)
  context.beginPath()

  if (kind === 'triangle') {
    context.moveTo(options.x, options.y)
    context.lineTo(leftX, leftY)
    context.lineTo(rightX, rightY)
    context.closePath()
    context.fill()
    context.restore()
    return
  }

  if (kind === 'diamond') {
    const tipBackX = options.x + ux * size * DIAMOND_TIP_MULTIPLIER
    const tipBackY = options.y + uy * size * DIAMOND_TIP_MULTIPLIER
    context.moveTo(options.x, options.y)
    context.lineTo(leftX, leftY)
    context.lineTo(tipBackX, tipBackY)
    context.lineTo(rightX, rightY)
    context.closePath()
    context.fill()
    context.restore()
    return
  }

  if (kind === 'circle') {
    context.arc(
      options.x + ux * size * CIRCLE_CENTER_OFFSET_MULTIPLIER,
      options.y + uy * size * CIRCLE_CENTER_OFFSET_MULTIPLIER,
      half * CIRCLE_RADIUS_MULTIPLIER,
      0,
      FULL_CIRCLE_RADIANS,
    )
    context.fill()
    context.restore()
    return
  }

  // `bar` fallback: draw a perpendicular cap line.
  context.moveTo(leftX, leftY)
  context.lineTo(rightX, rightY)
  context.stroke()
  context.restore()
}

/**
 * Handles normalizeCornerRadii.
 * @param radii radii parameter.
 * @param width Width value.
 * @param height Height value.
 */
function normalizeCornerRadii(
  radii: {
    topLeft: number
    topRight: number
    bottomRight: number
    bottomLeft: number
  },
  width: number,
  height: number,
) {
  const maxRadius = Math.min(width, height) / HALF_DIVISOR
  let topLeft = clampRadius(radii.topLeft, maxRadius)
  let topRight = clampRadius(radii.topRight, maxRadius)
  let bottomRight = clampRadius(radii.bottomRight, maxRadius)
  let bottomLeft = clampRadius(radii.bottomLeft, maxRadius)

  // Keep radii pairs inside their edge lengths.
  const topScale = topLeft + topRight > width ? width / (topLeft + topRight) : 1
  const bottomScale = bottomLeft + bottomRight > width ? width / (bottomLeft + bottomRight) : 1
  const leftScale = topLeft + bottomLeft > height ? height / (topLeft + bottomLeft) : 1
  const rightScale = topRight + bottomRight > height ? height / (topRight + bottomRight) : 1
  const scale = Math.min(topScale, bottomScale, leftScale, rightScale)

  if (scale < 1) {
    topLeft *= scale
    topRight *= scale
    bottomRight *= scale
    bottomLeft *= scale
  }

  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  }
}

/**
 * Handles clampRadius.
 * @param value value parameter.
 * @param maxRadius maxRadius parameter.
 */
function clampRadius(value: number, maxRadius: number) {
  return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, maxRadius))
}