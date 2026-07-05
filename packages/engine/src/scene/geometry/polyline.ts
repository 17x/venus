import type {EnginePoint} from '../types/types.ts'

export interface EngineRectBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Returns a closed copy of a polyline by appending the first point when needed.
 * @param points Source point list.
 */
export function closePolylinePoints(points: readonly EnginePoint[]): EnginePoint[] {
  if (points.length === 0) {
    return []
  }

  const first = points[0]
  const last = points[points.length - 1]
  if (first.x === last.x && first.y === last.y) {
    return points.map((point) => ({...point}))
  }

  return [
    ...points.map((point) => ({...point})),
    {x: first.x, y: first.y},
  ]
}

/**
 * Converts axis-aligned min/max bounds into a closed clockwise polyline.
 * @param bounds Rectangle bounds to convert.
 */
export function rectBoundsToPolyline(bounds: EngineRectBounds): EnginePoint[] {
  return [
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.minY},
  ]
}
