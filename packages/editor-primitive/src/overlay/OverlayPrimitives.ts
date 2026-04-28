import type {Point2D} from '@venus/lib'

/**
 * Defines supported overlay primitive kinds rendered by engine overlay layers.
 */
export type OverlayPrimitiveType =
  | 'rect'
  | 'polygon'
  | 'polyline'
  | 'line'
  | 'circle'
  | 'handle'
  | 'caret'
  | 'label'
  | 'hit-area'

/**
 * Defines shared coordinate spaces used by overlay primitives.
 */
export type OverlayCoordinateSpace = 'world' | 'screen'

/**
 * Defines shared base fields for overlay primitives.
 */
export interface OverlayPrimitiveBase {
  /** Stores primitive id stable across one overlay version. */
  id: string
  /** Stores primitive kind used by renderer/hit-test dispatch. */
  type: OverlayPrimitiveType
  /** Stores whether primitive coordinates are world or screen based. */
  coordinate: OverlayCoordinateSpace
  /** Stores render order override for overlay sorting. */
  zIndex?: number
  /** Indicates whether primitive should be rendered. */
  visible?: boolean
  /** Indicates whether primitive participates in overlay hit tests. */
  hittable?: boolean
}

/**
 * Defines minimal rectangle overlay primitive.
 */
export interface RectOverlayPrimitive extends OverlayPrimitiveBase {
  /** Stores primitive type discriminator. */
  type: 'rect'
  /** Stores rectangle x coordinate. */
  x: number
  /** Stores rectangle y coordinate. */
  y: number
  /** Stores rectangle width. */
  width: number
  /** Stores rectangle height. */
  height: number
}

/**
 * Defines minimal polyline/polygon point list primitive.
 */
export interface PointListOverlayPrimitive extends OverlayPrimitiveBase {
  /** Stores primitive type discriminator. */
  type: 'polygon' | 'polyline'
  /** Stores points in primitive coordinate space. */
  points: Point2D[]
}

