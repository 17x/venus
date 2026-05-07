import type {Point2D} from '@venus/lib'

/**
 * Defines selector match policies for point/rect/path queries.
 */
export type SelectorMatchMode = 'intersect' | 'contain'

/**
 * Defines selection mutation mode emitted by pointer selector.
 */
export type SelectorSelectionMode = 'replace' | 'add' | 'toggle' | 'remove'

/**
 * Defines normalized selector query options shared by click/rect/path queries.
 */
export interface SelectorQueryOptions {
  /** Stores geometric match policy for multi-target queries. */
  mode: SelectorMatchMode
  /** Stores hit tolerance in screen pixels. */
  tolerancePx: number
  /** Controls whether locked targets are included in results. */
  includeLocked: boolean
  /** Controls whether hidden targets are included in results. */
  includeHidden: boolean
}

/**
 * Defines axis-aligned selector rectangle in world space.
 */
export interface SelectorRect {
  /** Stores minimum world x. */
  minX: number
  /** Stores minimum world y. */
  minY: number
  /** Stores maximum world x. */
  maxX: number
  /** Stores maximum world y. */
  maxY: number
}

/**
 * Defines abstract selector engine capabilities consumed by pointer selector.
 */
export interface SelectorEngine<TTargetId extends string = string> {
  /** Resolves topmost targets for point click queries. */
  selectPoint(point: Point2D, options: SelectorQueryOptions): TTargetId[]
  /** Resolves targets intersecting or contained by a rectangle query. */
  selectRect(rect: SelectorRect, options: SelectorQueryOptions): TTargetId[]
}

/**
 * Defines overlay descriptor type used by selector/pointer-selector outputs.
 */
export type SelectorOverlayItemType = 'marquee' | 'hoverOutline' | 'selectionBox' | 'handler'

/**
 * Defines screen-space geometry payload used by selector overlay descriptors.
 */
export interface SelectorOverlayGeometry {
  /** Stores primitive kind used by overlay render adapters. */
  primitive:
    | 'rect'
    | 'polygon'
    | 'polyline'
    | 'line'
    | 'arc'
    | 'circle'
    | 'handle'
    | 'caret'
    | 'label'
    | 'hit-area'
  /** Stores geometry points in screen space. */
  points: Point2D[]
}

/**
 * Defines visual style payload for selector overlay descriptors.
 */
export interface SelectorOverlayStyle {
  /** Stores optional stroke color token or CSS color value. */
  stroke?: string
  /** Stores optional fill color token or CSS color value. */
  fill?: string
  /** Stores optional stroke dash array in screen pixels. */
  dash?: number[]
  /** Stores optional stroke width in screen pixels. */
  width?: number
}

/**
 * Defines one selector overlay descriptor emitted by pointer selector.
 */
export interface SelectorOverlayItem {
  /** Stores semantic overlay descriptor type. */
  type: SelectorOverlayItemType
  /** Stores screen-space geometry payload. */
  geometry: SelectorOverlayGeometry
  /** Stores optional visual style payload. */
  style?: SelectorOverlayStyle
  /** Stores optional overlay z-order inside overlay pass. */
  zIndex?: number
}

/**
 * Creates baseline selector query options.
 */
export function createDefaultSelectorQueryOptions(): SelectorQueryOptions {
  return {
    mode: 'contain',
    tolerancePx: 6,
    includeLocked: false,
    includeHidden: false,
  }
}
