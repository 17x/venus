import {Point} from '~/type'
import {BezierPoint} from '~/elements/props'
import {getBoundingRectFromBezierPoints} from '~/core/geometry'

export function convertDrawPointsToBezierPoints(points: Point[], tension = 0.3): {
  center: Point,
  points: BezierPoint[],
  closed: boolean
} {
  const filtered: Point[] = []
  const offsetThreshold = 2
  const closeThreshold = 20

  // filter minor movements
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      filtered.push(points[i])
    } else {
      const prev = filtered[filtered.length - 1]
      const dx = points[i].x - prev.x
      const dy = points[i].y - prev.y
      if (Math.hypot(dx, dy) >= offsetThreshold) {
        filtered.push(points[i])
      }
    }
  }

  points = filtered
  const bezierPoints: BezierPoint[] = []

  const isClosed = points.length > 2 &&
    Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y) < closeThreshold

  for (let i = 0; i < points.length; i++) {
    const prev = points[i - 1] ?? (isClosed ? points[points.length - 2] : points[i])
    const curr = points[i]
    const next = points[i + 1] ?? (isClosed ? points[(i + 1) % points.length] : points[i])

    // Vector from prev to next (smoothed direction)
    const dx = (next.x - prev.x) * tension
    const dy = (next.y - prev.y) * tension

    let cp1: Point | null = null
    let cp2: Point | null = null

    if (i !== 0 || isClosed) {
      cp1 = {
        x: curr.x - dx,
        y: curr.y - dy,
      }
    }

    if (i !== points.length - 1 || isClosed) {
      cp2 = cp1
        ? {
          x: curr.x * 2 - cp1.x,
          y: curr.y * 2 - cp1.y,
        }
        : {
          x: curr.x + dx,
          y: curr.y + dy,
        }
    }

    bezierPoints.push({
      anchor: {...curr},
      cp1,
      cp2,
      type: 'smooth',
    })
  }

  const rect = getBoundingRectFromBezierPoints(bezierPoints)
  const center = {x: rect.cx, y: rect.cy}

  return {
    center,
    points: bezierPoints,
    closed: isClosed,
  }
}

export function drawLine(ctx: CanvasRenderingContext2D, p1: Point, p2: Point,  lineWidth = 1) {
  ctx.save()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.stroke()
  ctx.restore()
}