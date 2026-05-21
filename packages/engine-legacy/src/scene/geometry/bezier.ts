import type { EngineBezierPoint, EnginePoint } from '../types/types.ts'

const CUBIC_BEZIER_BLEND_COEFFICIENT = 3

/**
 * Samples one cubic bezier curve into a polyline using fixed segment count.
  * @param points points parameter.
 * @param segments segments parameter.
*/
export function sampleBezierCurve(
  points: { start: EngineBezierPoint; end: EngineBezierPoint },
  segments = 16,
): EnginePoint[] {
  const safeSegments = Math.max(1, Math.floor(segments))
  const startAnchor = points.start.anchor
  const endAnchor = points.end.anchor
  const cp1 = points.start.cp2 ?? startAnchor
  const cp2 = points.end.cp1 ?? endAnchor
  const sampled: EnginePoint[] = []

  for (let index = 0; index <= safeSegments; index += 1) {
    const t = index / safeSegments
    const mt = 1 - t
    sampled.push({
      x:
        mt * mt * mt * startAnchor.x +
        CUBIC_BEZIER_BLEND_COEFFICIENT * mt * mt * t * cp1.x +
        CUBIC_BEZIER_BLEND_COEFFICIENT * mt * t * t * cp2.x +
        t * t * t * endAnchor.x,
      y:
        mt * mt * mt * startAnchor.y +
        CUBIC_BEZIER_BLEND_COEFFICIENT * mt * mt * t * cp1.y +
        CUBIC_BEZIER_BLEND_COEFFICIENT * mt * t * t * cp2.y +
        t * t * t * endAnchor.y,
    })
  }

  return sampled
}
