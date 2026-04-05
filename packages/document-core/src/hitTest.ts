import type {DocumentNode} from './index.ts'

export function isPointInsideClipShape(
  pointer: {x: number; y: number},
  clipSource: DocumentNode,
  options?: {
    tolerance?: number
  },
) {
  const tolerance = options?.tolerance ?? 1.5

  if (clipSource.type === 'rectangle' || clipSource.type === 'frame' || clipSource.type === 'group') {
    const bounds = getNormalizedBounds(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    return (
      pointer.x >= bounds.minX &&
      pointer.x <= bounds.maxX &&
      pointer.y >= bounds.minY &&
      pointer.y <= bounds.maxY
    )
  }

  if (clipSource.type === 'ellipse') {
    const bounds = getNormalizedBounds(clipSource.x, clipSource.y, clipSource.width, clipSource.height)
    const radiusX = Math.abs(clipSource.width) / 2
    const radiusY = Math.abs(clipSource.height) / 2
    if (radiusX <= 0 || radiusY <= 0) {
      return false
    }
    const centerX = bounds.minX + radiusX
    const centerY = bounds.minY + radiusY
    const normalized =
      ((pointer.x - centerX) * (pointer.x - centerX)) / (radiusX * radiusX) +
      ((pointer.y - centerY) * (pointer.y - centerY)) / (radiusY * radiusY)

    return normalized <= 1
  }

  if (clipSource.type === 'polygon' || clipSource.type === 'star') {
    const points = clipSource.points
    if (!points || points.length < 3) {
      return false
    }
    return (
      isPointInsidePolygon(pointer, points) ||
      isPointNearPolygonEdge(pointer, points, tolerance)
    )
  }

  if (clipSource.type === 'path') {
    if (clipSource.bezierPoints && clipSource.bezierPoints.length > 1) {
      const polygon = sampleBezierPathPolygon(clipSource.bezierPoints, 16)
      if (polygon.length < 3) {
        return false
      }
      return (
        isPointInsidePolygon(pointer, polygon) ||
        isPointNearPolygonEdge(pointer, polygon, tolerance)
      )
    }

    if (clipSource.points && clipSource.points.length > 2) {
      return (
        isPointInsidePolygon(pointer, clipSource.points) ||
        isPointNearPolygonEdge(pointer, clipSource.points, tolerance)
      )
    }
  }

  return false
}

function getNormalizedBounds(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return {
    minX: Math.min(x, x + width),
    maxX: Math.max(x, x + width),
    minY: Math.min(y, y + height),
    maxY: Math.max(y, y + height),
  }
}

function isPointInsidePolygon(
  pointer: {x: number; y: number},
  points: Array<{x: number; y: number}>,
) {
  let inside = false

  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const current = points[index]
    const last = points[previous]
    const intersects =
      ((current.y > pointer.y) !== (last.y > pointer.y)) &&
      pointer.x < ((last.x - current.x) * (pointer.y - current.y)) / ((last.y - current.y) || 1e-9) + current.x

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

function isPointNearPolygonEdge(
  pointer: {x: number; y: number},
  points: Array<{x: number; y: number}>,
  tolerance = 6,
) {
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const edgeHit = isPointNearLineSegment(pointer, {
      x1: current.x,
      y1: current.y,
      x2: next.x,
      y2: next.y,
    }, tolerance)

    if (edgeHit) {
      return true
    }
  }

  return false
}

function isPointNearLineSegment(
  pointer: {x: number; y: number},
  line: {x1: number; y1: number; x2: number; y2: number},
  tolerance = 6,
) {
  const dx = line.x2 - line.x1
  const dy = line.y2 - line.y1
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    const distanceSquared =
      (pointer.x - line.x1) * (pointer.x - line.x1) +
      (pointer.y - line.y1) * (pointer.y - line.y1)
    return distanceSquared <= tolerance * tolerance
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointer.x - line.x1) * dx + (pointer.y - line.y1) * dy) / lengthSquared,
    ),
  )
  const nearestX = line.x1 + t * dx
  const nearestY = line.y1 + t * dy
  const distanceSquared =
    (pointer.x - nearestX) * (pointer.x - nearestX) +
    (pointer.y - nearestY) * (pointer.y - nearestY)

  return distanceSquared <= tolerance * tolerance
}

function sampleBezierPathPolygon(
  points: Array<{
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }>,
  stepsPerSegment = 16,
) {
  if (points.length < 2) {
    return []
  }

  const sampled: Array<{x: number; y: number}> = [{...points[0].anchor}]

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const cp1 = current.cp2 ?? current.anchor
    const cp2 = next.cp1 ?? next.anchor

    for (let step = 1; step <= stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment
      sampled.push(sampleCubicBezierPoint(current.anchor, cp1, cp2, next.anchor, t))
    }
  }

  return sampled
}

function sampleCubicBezierPoint(
  p0: {x: number; y: number},
  p1: {x: number; y: number},
  p2: {x: number; y: number},
  p3: {x: number; y: number},
  t: number,
) {
  const inv = 1 - t
  const a = inv * inv * inv
  const b = 3 * inv * inv * t
  const c = 3 * inv * t * t
  const d = t * t * t

  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  }
}
