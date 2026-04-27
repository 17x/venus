import type { EngineRenderFrame } from '../types.ts'
import type { EngineRect, EngineShapeNode } from '../../scene/types.ts'

export interface Canvas2DPathCounters {
  trivialPathFastPathCount: number
  contourParseCount: number
}

// Keep Canvas2D geometry helpers isolated so the auxiliary backend stays
// organized without changing WebGL-first renderer ownership.
export function appendShapePath(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
  pathSimplificationBucket: 0 | 1 | 2,
  viewportScale: number,
  counters: Canvas2DPathCounters,
) {
  if (node.shape === 'ellipse') {
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const rx = Math.abs(rect.width) / 2
    const ry = Math.abs(rect.height) / 2
    const start = toRadians(node.ellipseStartAngle ?? 0)
    const end = toRadians(node.ellipseEndAngle ?? 360)
    const arc = normalizeArcRange(start, end)
    const fullCircle = !hasEllipseArc(node)

    if (fullCircle) {
      context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      return true
    }

    context.moveTo(cx, cy)
    context.ellipse(cx, cy, rx, ry, 0, arc.start, arc.end, arc.anticlockwise)
    context.closePath()
    return true
  }

  if (node.shape === 'line') {
    if (Array.isArray(node.points) && node.points.length >= 2) {
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
export function resolvePathSimplificationBucket(
  frame: EngineRenderFrame,
): 0 | 1 | 2 {
  const scale = Math.max(0, Math.abs(frame.viewport.scale))
  if (frame.context.quality === 'interactive' || scale <= 0.22) {
    return 2
  }
  if (scale <= 0.45) {
    return 1
  }
  return 0
}

// Keep arrowhead raster logic adjacent to path helpers because it depends on
// the same endpoint extraction rules as line and path drawing.
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

  const size = Math.max(6, strokeWidth * 4)
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
export function appendRoundedRectPath(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rect: EngineRect,
  radius: number,
) {
  appendRectPathWithCornerRadii(context, rect, undefined, radius)
}

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
export function hasEllipseArc(node: EngineShapeNode) {
  if (node.shape !== 'ellipse') {
    return false
  }
  const start = node.ellipseStartAngle
  const end = node.ellipseEndAngle
  if (typeof start !== 'number' || typeof end !== 'number') {
    return false
  }
  const sweep = Math.abs(end - start) % 360
  return sweep > 1e-3 && sweep < 360 - 1e-3
}

export function normalizeArcRange(start: number, end: number) {
  const tau = Math.PI * 2
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

export function toRadians(deg: number) {
  return (deg * Math.PI) / 180
}

function appendPathGeometry(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  pathSimplificationBucket: 0 | 1 | 2,
  viewportScale: number,
  counters: Canvas2DPathCounters,
) {
  const bezierPoints = node.bezierPoints ?? []
  const points = node.points ?? []
  const bezierPointCount = node.bezierPointCount ?? bezierPoints.length
  const pointCount = node.pointCount ?? points.length
  const pointContours = bezierPointCount === 0 && node.closed && pointCount > 3
    ? resolveClosedPointContours(points, counters)
    : []

  if (pathSimplificationBucket > 0) {
    const sourcePointCount = bezierPointCount > 0 ? bezierPointCount : pointCount
    const minimumDirectPointCount = node.closed ? 4 : 2

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
          pathSimplificationBucket as 1 | 2,
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
      pathSimplificationBucket as 1 | 2,
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
      if (point.x === start.x && point.y === start.y && contour.length >= 4) {
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

function simplifyPathPointsForBucket(
  points: readonly {x: number; y: number}[],
  bucket: 1 | 2,
  closed: boolean,
  viewportScale: number,
) {
  if (points.length <= 2) {
    return [...points]
  }

  // Keep point density roughly constant in screen-space so low-zoom interaction
  // work scales down with projected path complexity, not raw anchor count.
  const absScale = Math.max(0.0001, Math.abs(viewportScale))
  const minScreenStepPx = bucket === 2 ? 6 : 3
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
  const maxRetainedPoints = Math.max(8, Math.min(256, Math.ceil(projectedLength / minScreenStepPx) + 1))
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

function resolveShapeEndpointSegment(
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
) {
  if (node.shape === 'line') {
    if (Array.isArray(node.points) && node.points.length >= 2) {
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
  if (bezierPointCount >= 2 && node.bezierPoints) {
    const first = node.bezierPoints[0]
    const second = node.bezierPoints[1]
    const previous = node.bezierPoints[bezierPointCount - 2]
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
  if (pointCount < 2) {
    return null
  }

  return {
    start: points[0],
    next: points[1],
    previous: points[pointCount - 2],
    end: points[pointCount - 1],
  }
}

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
  if (length <= 1e-6) {
    return
  }
  const ux = options.dx / length
  const uy = options.dy / length
  const nx = -uy
  const ny = ux
  const size = options.size
  const half = size * 0.5
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
    const tipBackX = options.x + ux * size * 1.8
    const tipBackY = options.y + uy * size * 1.8
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
    context.arc(options.x + ux * size * 0.75, options.y + uy * size * 0.75, half * 0.75, 0, Math.PI * 2)
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
  const maxRadius = Math.min(width, height) / 2
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

function clampRadius(value: number, maxRadius: number) {
  return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, maxRadius))
}