type PathHintPoint = {
  x: number
  y: number
}

type PathHintBezierPoint = {
  anchor: PathHintPoint
}

type PathHintShape = {
  type: string
  points?: PathHintPoint[]
  bezierPoints?: PathHintBezierPoint[]
}

export function withResolvedPathHints<T extends PathHintShape>(shape: T): T & {closed?: boolean} {
  if (shape.type !== 'path') {
    return shape
  }

  return {
    ...shape,
    closed: resolvePathClosed(shape),
  }
}

export function resolvePathClosed(shape: PathHintShape) {
  if (shape.type !== 'path') {
    return false
  }

  const compare = (left: PathHintPoint, right: PathHintPoint) => {
    return Math.hypot(left.x - right.x, left.y - right.y) <= 1e-3
  }

  if (shape.bezierPoints && shape.bezierPoints.length >= 3) {
    return compare(shape.bezierPoints[0].anchor, shape.bezierPoints[shape.bezierPoints.length - 1].anchor)
  }

  if (shape.points && shape.points.length >= 3) {
    return compare(shape.points[0], shape.points[shape.points.length - 1])
  }

  return false
}