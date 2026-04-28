import type {Point2D} from '../math/matrix.ts'

/**
 * Defines a two-dimensional rectangle primitive.
 */
export interface Rect2D {
  /** Stores the x coordinate of the top-left corner. */
  readonly x: number
  /** Stores the y coordinate of the top-left corner. */
  readonly y: number
  /** Stores the rectangle width. */
  readonly width: number
  /** Stores the rectangle height. */
  readonly height: number
}

/**
 * Defines a compact transform primitive used by geometry utilities.
 */
export interface Transform2D {
  /** Stores translation on the x axis. */
  readonly translateX: number
  /** Stores translation on the y axis. */
  readonly translateY: number
  /** Stores scale on the x axis. */
  readonly scaleX: number
  /** Stores scale on the y axis. */
  readonly scaleY: number
  /** Stores clockwise rotation in degrees. */
  readonly rotation: number
}

/**
 * Resolves the center point of a rectangle.
 */
export function getRectCenter(rect: Rect2D): Point2D {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}

