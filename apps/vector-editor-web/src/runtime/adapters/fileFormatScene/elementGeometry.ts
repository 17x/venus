import type {ElementProps} from '../../types/index.ts'
import {getBoundingRectFromBezierPoints} from '../../model/index.ts'

// Converts unknown payload into a normalized point shape used by geometry/path adapters.
export function toPointLike(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as {x?: unknown}).x !== 'number' ||
    typeof (value as {y?: unknown}).y !== 'number'
  ) {
    return null
  }

  return {
    x: Number((value as {x: number}).x),
    y: Number((value as {y: number}).y),
  }
}

// Converts unknown payload into a normalized bezier point used by path adapters.
export function toBezierPointLike(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const anchor = toPointLike(record.anchor)
  if (!anchor) {
    return null
  }

  return {
    anchor,
    cp1: toPointLike(record.cp1),
    cp2: toPointLike(record.cp2),
  }
}

// Resolves robust element geometry bounds from explicit width/height, bezier points, or raw points.
export function resolveElementGeometry(element: ElementProps) {
  const points = Array.isArray(element.points)
    ? element.points
        .map((point) => toPointLike(point))
        .filter((point): point is NonNullable<ReturnType<typeof toPointLike>> => point !== null)
    : []
  const pointBounds = points.length > 0
    ? {
        minX: Math.min(...points.map((point) => point.x)),
        minY: Math.min(...points.map((point) => point.y)),
        maxX: Math.max(...points.map((point) => point.x)),
        maxY: Math.max(...points.map((point) => point.y)),
      }
    : null

  const bezierPoints = Array.isArray(element.bezierPoints)
    ? element.bezierPoints
        .map((point) => toBezierPointLike(point))
        .filter((point): point is NonNullable<ReturnType<typeof toBezierPointLike>> => point !== null)
    : []
  const bezierBounds = bezierPoints.length > 0
    ? getBoundingRectFromBezierPoints(bezierPoints)
    : null

  const width = Number(
    element.width ??
      (bezierBounds
        ? bezierBounds.width
        : pointBounds
          ? pointBounds.maxX - pointBounds.minX
          : 0),
  )
  const height = Number(
    element.height ??
      (bezierBounds
        ? bezierBounds.height
        : pointBounds
          ? pointBounds.maxY - pointBounds.minY
          : 0),
  )
  const x = Number(
    element.x ??
      (bezierBounds
        ? bezierBounds.x
        : pointBounds
          ? pointBounds.minX
          : ((element.cx ?? 0) - width / 2)),
  )
  const y = Number(
    element.y ??
      (bezierBounds
        ? bezierBounds.y
        : pointBounds
          ? pointBounds.minY
          : ((element.cy ?? 0) - height / 2)),
  )

  return {
    x,
    y,
    width,
    height,
  }
}
