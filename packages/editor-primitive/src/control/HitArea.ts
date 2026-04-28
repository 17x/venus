import type {Point2D} from '@venus/lib'

/**
 * Defines open hit-area kinds for overlay controls.
 *
 * Per docs/task/overlay.md §17.3 and §4.5, hit area must be expressible as
 * point/rect/segment/circle/arc/polygon/path/custom so render area and hit
 * area can be decoupled (e.g. invisible rotate arc, line tolerance hover).
 */
export type ControlHitAreaKind =
  | 'point'
  | 'rect'
  | 'rotated-rect'
  | 'segment'
  | 'circle'
  | 'arc-sector'
  | 'polygon'
  | 'polyline'
  | 'path'
  | 'custom'

/**
 * Defines point hit area expanded by tolerance into a circular region.
 */
export interface PointHitArea {
  /** Stores discriminator. */
  kind: 'point'
  /** Stores hit area center in declared coordinate space. */
  center: Point2D
  /** Stores hit-test tolerance radius. */
  tolerance: number
}

/**
 * Defines axis-aligned rectangle hit area with optional tolerance expansion.
 */
export interface RectHitArea {
  /** Stores discriminator. */
  kind: 'rect'
  /** Stores rectangle min x. */
  minX: number
  /** Stores rectangle min y. */
  minY: number
  /** Stores rectangle max x. */
  maxX: number
  /** Stores rectangle max y. */
  maxY: number
  /** Stores edge expansion tolerance. */
  tolerance?: number
}

/**
 * Defines rotated rectangle hit area used by rotated marquee bodies.
 */
export interface RotatedRectHitArea {
  /** Stores discriminator. */
  kind: 'rotated-rect'
  /** Stores four corners in CW order. */
  corners: [Point2D, Point2D, Point2D, Point2D]
  /** Stores edge expansion tolerance. */
  tolerance?: number
}

/**
 * Defines line-segment hit area used by line/edge controls.
 */
export interface SegmentHitArea {
  /** Stores discriminator. */
  kind: 'segment'
  /** Stores segment start. */
  from: Point2D
  /** Stores segment end. */
  to: Point2D
  /** Stores stroke tolerance perpendicular distance. */
  tolerance: number
}

/**
 * Defines circular hit area for round controls (radius, anchor, angle).
 */
export interface CircleHitArea {
  /** Stores discriminator. */
  kind: 'circle'
  /** Stores circle center. */
  center: Point2D
  /** Stores circle radius. */
  radius: number
}

/**
 * Defines arc-sector hit area used by rotate handles and arc-angle handles.
 */
export interface ArcSectorHitArea {
  /** Stores discriminator. */
  kind: 'arc-sector'
  /** Stores arc center. */
  center: Point2D
  /** Stores inner radius of sector ring. */
  innerRadius: number
  /** Stores outer radius of sector ring. */
  outerRadius: number
  /** Stores start angle in degrees. */
  startAngleDegrees: number
  /** Stores end angle in degrees. */
  endAngleDegrees: number
}

/**
 * Defines closed polygon hit area for arbitrary fills.
 */
export interface PolygonHitArea {
  /** Stores discriminator. */
  kind: 'polygon'
  /** Stores polygon vertices in declared coordinate space. */
  points: Point2D[]
}

/**
 * Defines open polyline hit area driven by stroke tolerance.
 */
export interface PolylineHitArea {
  /** Stores discriminator. */
  kind: 'polyline'
  /** Stores ordered points. */
  points: Point2D[]
  /** Stores stroke tolerance perpendicular distance. */
  tolerance: number
}

/**
 * Defines opaque path hit area dispatched to the engine path tester.
 */
export interface PathHitArea {
  /** Stores discriminator. */
  kind: 'path'
  /** Stores path identifier resolved by host engine. */
  pathId: string
  /** Stores tolerance forwarded to engine path tester. */
  tolerance?: number
  /** Indicates whether path should be treated as closed for fill hits. */
  closed?: boolean
}

/**
 * Defines custom hit area implemented by a host-supplied tester.
 *
 * Custom hit areas keep the system open per docs/task/overlay.md §17.3 so
 * elements can register element-specific control geometry without changing
 * core enums.
 */
export interface CustomHitArea {
  /** Stores discriminator. */
  kind: 'custom'
  /** Stores tester invoked by the resolver against the active pointer. */
  test: (pointer: Point2D) => boolean
  /** Stores optional metadata token used for diagnostics. */
  tag?: string
}

/**
 * Defines the union of hit-area shapes supported by overlay controls.
 */
export type ControlHitArea =
  | PointHitArea
  | RectHitArea
  | RotatedRectHitArea
  | SegmentHitArea
  | CircleHitArea
  | ArcSectorHitArea
  | PolygonHitArea
  | PolylineHitArea
  | PathHitArea
  | CustomHitArea
