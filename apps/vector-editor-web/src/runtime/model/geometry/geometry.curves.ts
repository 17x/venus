import type {Point} from './geometry.ts'
import {
  cubicBezierPoint,
  getCubicExtrema as getEngineCubicExtrema,
} from '@venus/engine'

/**
 * Computes one cubic bezier point for parameter t.
 * @param t Curve parameter in [0, 1].
 * @param p0 First control point.
 * @param p1 Second control point.
 * @param p2 Third control point.
 * @param p3 Fourth control point.
 */
export function cubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  return cubicBezierPoint(t, p0, p1, p2, p3)
}

/**
 * Solves normalized cubic derivative roots for extrema discovery.
 * @param p0 Cubic first point axis value.
 * @param p1 Cubic second point axis value.
 * @param p2 Cubic third point axis value.
 * @param p3 Cubic fourth point axis value.
 */
export function getCubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  return getEngineCubicExtrema(p0, p1, p2, p3)
}
