import { sampleBezierPathPolygon as sampleBezierPathPolygonFromLib } from '@venus/lib/geometry'
import type { EngineEditorBezierPoint, EngineEditorPoint } from '../hitTest.ts'

const DEFAULT_SEGMENTS_PER_CURVE = 12
const MIN_SAFE_TOLERANCE = 0.5
const HIGH_TOLERANCE_THRESHOLD = 8
const MEDIUM_TOLERANCE_THRESHOLD = 4
const HIGH_FILL_SEGMENTS = 8
const HIGH_STROKE_SEGMENTS = 6
const MEDIUM_FILL_SEGMENTS = 12
const MEDIUM_STROKE_SEGMENTS = 10
const LOW_FILL_SEGMENTS = 18
const LOW_STROKE_SEGMENTS = 14

// Sample chained cubic beziers into a polygonal approximation for hit predicates.
/**
 * Handles sampleBezierPathPolygon.
 * @param points points parameter.
 * @param segmentsPerCurve segmentsPerCurve parameter.
 */
export function sampleBezierPathPolygon(
  points: EngineEditorBezierPoint[],
  segmentsPerCurve = DEFAULT_SEGMENTS_PER_CURVE,
): EngineEditorPoint[] {
  return sampleBezierPathPolygonFromLib(points, segmentsPerCurve) as EngineEditorPoint[]
}

// Resolve bezier sampling segments from pointer tolerance to balance precision and cost.
/**
 * Handles resolveBezierSegmentsPerCurve.
 * @param tolerance tolerance parameter.
 * @param mode mode parameter.
 */
export function resolveBezierSegmentsPerCurve(
  tolerance: number,
  mode: 'stroke' | 'fill',
): number {
  const safeTolerance = Math.max(MIN_SAFE_TOLERANCE, tolerance)
  if (safeTolerance >= HIGH_TOLERANCE_THRESHOLD) {
    return mode === 'fill' ? HIGH_FILL_SEGMENTS : HIGH_STROKE_SEGMENTS
  }
  if (safeTolerance >= MEDIUM_TOLERANCE_THRESHOLD) {
    return mode === 'fill' ? MEDIUM_FILL_SEGMENTS : MEDIUM_STROKE_SEGMENTS
  }
  return mode === 'fill' ? LOW_FILL_SEGMENTS : LOW_STROKE_SEGMENTS
}
