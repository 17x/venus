// Engine scene types own the render-facing scene contract; product document
// semantics, command history, and editor UI policy must stay outside this file.
import type { EngineSceneBufferLayout } from '../buffer/buffer.ts'

/** Lists every renderable node family accepted by the engine scene contract. */
export const ENGINE_RENDERABLE_NODE_TYPES = [
  'group',
  'shape',
  'text',
  'image',
] as const

/** Lists every shape geometry kind accepted by `EngineShapeNode`. */
export const ENGINE_SHAPE_TYPES = [
  'rect',
  'ellipse',
  'line',
  'polygon',
  'path',
] as const

/** Declares one renderable node family accepted by the engine scene contract. */
export type EngineRenderableNodeType = (typeof ENGINE_RENDERABLE_NODE_TYPES)[number]

/** Declares one shape geometry kind accepted by `EngineShapeNode`. */
export type EngineShapeKind = (typeof ENGINE_SHAPE_TYPES)[number]

export type EngineNodeId = string

/** Declares a two-dimensional point in local node coordinates. */
export interface EnginePoint {
  /** Horizontal axis coordinate. */
  x: number
  /** Vertical axis coordinate. */
  y: number
}

/** Declares one bezier knot point with optional in/out control handles. */
export interface EngineBezierPoint {
  /** The knot (anchor) point of this bezier segment. */
  anchor: EnginePoint
  /** Incoming control point from the previous segment. */
  cp1?: EnginePoint | null
  /** Outgoing control point to the next segment. */
  cp2?: EnginePoint | null
}

/** Declares one anchor (knot) point on path geometry with optional control handles. */
export interface EngineAnchorPoint {
  /** Horizontal position of the anchor point in local node coordinates. */
  x: number
  /** Vertical position of the anchor point in local node coordinates. */
  y: number
  /** Incoming control point from the previous segment. When absent, the handle is collapsed onto the anchor. */
  cp1?: EnginePoint | null
  /** Outgoing control point to the next segment. When absent, the handle is collapsed onto the anchor. */
  cp2?: EnginePoint | null
}

/** Declares an axis-aligned rectangle in local node coordinates. */
export interface EngineRect {
  /** Left coordinate. */
  x: number
  /** Top coordinate. */
  y: number
  /** Width of the rectangle. */
  width: number
  /** Height of the rectangle. */
  height: number
}

/** Declares ellipse geometry in center+radii form. Prefer this over x/y/width/height for ellipse shapes. */
export interface EngineEllipseGeometry {
  /** Center x coordinate in local node space. */
  cx: number
  /** Center y coordinate in local node space. */
  cy: number
  /** Horizontal radius (half of the ellipse width). */
  rx: number
  /** Vertical radius (half of the ellipse height). */
  ry: number
}

/** Declares a 2D affine transformation encoded as a 6-element row-major matrix [a, b, c, d, tx, ty]. */
export interface EngineTransform2D {
  /** Affine matrix in row-major order: [a, b, c, d, tx, ty]. */
  matrix: readonly [number, number, number, number, number, number]
}

/** Declares one shadow hint accepted by renderable engine nodes. */
export interface EngineShadow {
  /** CSS colour string for the shadow. */
  color?: string
  /** Horizontal shadow offset in pixels. */
  offsetX?: number
  /** Vertical shadow offset in pixels. */
  offsetY?: number
  /** Shadow blur radius in pixels. */
  blur?: number
}

/** Declares an inner shadow effect applied inside shape geometry. */
export interface EngineInnerShadow {
  /** Shadow colour (CSS string). */
  color?: string
  /** Shadow blur radius in pixels. */
  blur?: number
}

/** Declares layer blur applied after shape rendering. */
export interface EngineLayerBlur {
  /** Blur radius in pixels. */
  amount: number
}

/** Declares visual effects applied to a renderable node. */
export interface EngineVisualEffects {
  /** Node opacity in the [0, 1] interval. */
  opacity?: number
  /** CSS blend mode string. */
  blendMode?: string
  /** Drop shadow effect. */
  shadow?: EngineShadow
  /** Inner shadow effect clipped to shape interior. */
  innerShadow?: EngineInnerShadow
  /** Layer blur applied via CSS filter after rendering. */
  layerBlur?: EngineLayerBlur
}

/** Declares stroke rendering configuration for shapes and text. */
export interface EngineStrokeConfig {
  /** Ordered paint list for stroke. Takes precedence over `color` when both are present. */
  paints?: readonly EnginePaint[]
  /** Single stroke colour shorthand. Backward compatible; prefer `paints`. */
  color?: string
  /** Stroke width in local node units. */
  width?: number
  /** Stroke alignment relative to path geometry. Defaults to center. */
  align?: EngineStrokeAlign
  /** Dash pattern as alternating dash-gap lengths. Empty or absent means solid stroke. */
  dashArray?: readonly number[]
  /** Line cap style for open stroke paths. Defaults to round. */
  cap?: 'butt' | 'round' | 'square'
  /** Line join style for stroke corners. Defaults to round. */
  join?: 'miter' | 'round' | 'bevel'
  /** Arrowhead style rendered at the stroke start. */
  startArrowhead?: EngineStrokeArrowhead
  /** Arrowhead style rendered at the stroke end. */
  endArrowhead?: EngineStrokeArrowhead
}

/** Declares fill rendering configuration for shapes and text. */
export interface EngineFillConfig {
  /** Ordered paint list for fill. Takes precedence over `color` when both are present. */
  paints?: readonly EnginePaint[]
  /** Single fill colour shorthand. Backward compatible; prefer `paints`. */
  color?: string
}

/** Declares one gradient colour stop used by gradient paints. */
export interface EngineGradientStop {
  /** Stop position in the [0, 1] interval. */
  offset: number
  /** CSS colour string for this stop. */
  color: string
  /** Optional per-stop opacity in the [0, 1] interval. */
  opacity?: number
}

/** Declares a linear gradient paint descriptor. */
export interface EngineLinearGradient {
  type: 'linear'
  /** Gradient start x in local node coordinates. */
  startX: number
  /** Gradient start y in local node coordinates. */
  startY: number
  /** Gradient end x in local node coordinates. */
  endX: number
  /** Gradient end y in local node coordinates. */
  endY: number
  /** Ordered colour stops. */
  stops: readonly EngineGradientStop[]
}

/** Declares a radial gradient paint descriptor. */
export interface EngineRadialGradient {
  type: 'radial'
  /** Gradient centre x in local node coordinates. */
  centerX: number
  /** Gradient centre y in local node coordinates. */
  centerY: number
  /** Gradient radius in local node units. */
  radius: number
  /** Ordered colour stops. */
  stops: readonly EngineGradientStop[]
}

/** Declares one gradient descriptor accepted by gradient paints. */
export type EngineGradient = EngineLinearGradient | EngineRadialGradient

/** Declares a solid-colour paint used for fills and strokes. */
export interface EngineSolidPaint {
  type: 'solid'
  /** CSS colour string. */
  color: string
  /** Optional paint-level opacity in the [0, 1] interval. */
  opacity?: number
}

/** Declares a gradient paint used for fills and strokes. */
export interface EngineGradientPaint {
  type: 'gradient'
  /** Gradient descriptor. */
  gradient: EngineGradient
  /** Optional paint-level opacity in the [0, 1] interval. */
  opacity?: number
}

/** Declares one paint descriptor accepted by multi-paint fill and stroke lists. */
export type EnginePaint = EngineSolidPaint | EngineGradientPaint

/** Declares stroke alignment relative to the shape's path. */
export type EngineStrokeAlign = 'center' | 'inside' | 'outside'

/** Declares per-corner rectangle radii for rounded rectangle rendering. */
export interface EngineRectangleCornerRadii {
  /** Top-left corner radius in pixels. */
  topLeft?: number
  /** Top-right corner radius in pixels. */
  topRight?: number
  /** Bottom-right corner radius in pixels. */
  bottomRight?: number
  /** Bottom-left corner radius in pixels. */
  bottomLeft?: number
}

/** Declares arrowhead styles for open stroke primitives. */
export type EngineStrokeArrowhead = 'none' | 'triangle' | 'diamond' | 'circle' | 'bar'

/** Declares one inline clip shape. Supports rectangle clips with optional radius and path clips. */
export type EngineClipShape =
  | {
    /** Discriminant for rectangle clip shape. */
    kind: 'rect'
    /** Clip rectangle in local node coordinates. */
    rect: EngineRect
    /** Optional uniform corner radius for rounded clip corners. */
    radius?: number
  }
  | {
    /** Discriminant for path clip shape. */
    kind: 'path'
    /** Ordered clip path vertices in local node coordinates. */
    points: readonly EnginePoint[]
    /** Whether the clip path is closed. */
    closed?: boolean
  }

/** Declares clipping metadata that can be attached to renderable engine nodes. */
export interface EngineNodeClip {
  /** References another node by id for graph-level clip reuse. */
  clipNodeId?: EngineNodeId
  /** Inline clip shape definition for lightweight nodes. */
  clipShape?: EngineClipShape
  /** Fill rule for the clip path: 'nonzero' (default) or 'evenodd'. */
  rule?: 'nonzero' | 'evenodd'
}

/** Base interface for all renderable engine nodes. */
export interface EngineNodeBase {
  /** Unique node identifier within the scene. */
  id: EngineNodeId
  /** Node family discriminator ('group' | 'shape' | 'text' | 'image'). */
  type: string
  /** Visual effects applied after geometry rendering. Prefer this over the deprecated flat fields below. */
  visual?: EngineVisualEffects
  /** @deprecated Use `visual.opacity` instead. */
  opacity?: number
  /** @deprecated Use `visual.blendMode` instead. */
  blendMode?: string
  /** 2D affine transform applied to this node's local coordinate space. */
  transform?: EngineTransform2D
  /** @deprecated Use `visual.shadow` instead. */
  shadow?: EngineShadow
  /** @deprecated Use `visual.innerShadow` instead. */
  innerShadow?: EngineInnerShadow
  /** @deprecated Use `visual.layerBlur` instead. */
  layerBlur?: EngineLayerBlur
  /** Clipping metadata; supports both node-reference and inline clip shapes. */
  clip?: EngineNodeClip
  /** Optional public target id returned by hit-test when this render node is hit. */
  hitTargetId?: EngineNodeId
}

/** Declares text rendering style applied to a text node or text run. */
export interface EngineTextStyle {
  /** Font family name (e.g. 'Inter', 'Arial'). */
  fontFamily: string
  /** Font size in local node units. */
  fontSize: number
  /** Font weight as a number (100–900) or string ('bold'). */
  fontWeight?: number | string
  /** Font style variant. */
  fontStyle?: 'normal' | 'italic' | 'oblique'
  /** Line height multiplier or absolute value. */
  lineHeight?: number
  /** Letter spacing in local node units. */
  letterSpacing?: number
  /** Fill rendering configuration. Prefer this over the deprecated flat fill fields below. */
  fillConfig?: EngineFillConfig
  /** Stroke rendering configuration. Prefer this over the deprecated flat stroke fields below. */
  strokeConfig?: EngineStrokeConfig
  /** Horizontal text alignment. */
  align?: 'start' | 'center' | 'end'
  /** Vertical text alignment within the text box. */
  verticalAlign?: 'top' | 'middle' | 'bottom'
  /** Text-specific drop shadow (independent of node-level shadow). */
  shadow?: EngineShadow
  // ── Deprecated flat fill / stroke fields ──
  /** @deprecated Use `fillConfig.color` instead. */
  fill?: string
  /** @deprecated Use `fillConfig.paints` instead. */
  fills?: readonly EnginePaint[]
  /** @deprecated Use `strokeConfig.color` instead. */
  stroke?: string
  /** @deprecated Use `strokeConfig.width` instead. */
  strokeWidth?: number
}

/** Declares one rich-text run with optional style override. */
export interface EngineTextRun {
  /** Plain text content for this run. */
  text: string
  /** Optional per-run style overrides merged on top of the parent text style. */
  style?: Partial<EngineTextStyle>
}

/** Declares a text leaf node in the render tree. */
export interface EngineTextNode extends EngineNodeBase {
  type: 'text'
  /** Local left coordinate of the text box. */
  x: number
  /** Local top coordinate of the text box. */
  y: number
  /** Text box width. When absent, the renderer uses auto-width. */
  width?: number
  /** Text box height. When absent, the renderer uses auto-height. */
  height?: number
  /** Primary text rendering style. */
  style: EngineTextStyle
  // `text` is the fast plain-string path. `runs` is the rich-text path.
  // Renderers should prefer `runs` when both are present.
  /** Plain text content (fast path). */
  text?: string
  /** Rich-text runs. Renderers prefer this over `text` when present. */
  runs?: readonly EngineTextRun[]
  /** Text wrapping mode. */
  wrap?: 'none' | 'word' | 'char'
  /** Renderer-managed cache key for text layout invalidation. */
  cacheKey?: string
  /** Cached line count computed by the text layout engine. */
  lineCount?: number
  /** Cached maximum line height computed by the text layout engine. */
  maxLineHeight?: number
}

/** Declares an image leaf node in the render tree. */
export interface EngineImageNode extends EngineNodeBase {
  type: 'image'
  /** Local left coordinate. */
  x: number
  /** Local top coordinate. */
  y: number
  /** Rendered image width in local node units. */
  width: number
  /** Rendered image height in local node units. */
  height: number
  /** Asset identifier used to resolve the image source. */
  assetId: string
  /** Optional resolved external URI used by export/adapters while assetId remains the loader key. */
  assetUrl?: string
  /** Optional sub-rect of the source image to render. */
  sourceRect?: EngineRect
  /** Original image dimensions before any scaling. */
  naturalSize?: {
    width: number
    height: number
  }
  /** Whether to apply image smoothing (bilinear filtering). */
  imageSmoothing?: boolean
}

/** Container node that groups child renderable nodes. */
export interface EngineGroupNode extends EngineNodeBase {
  type: 'group'
  /** Ordered list of child renderable nodes. */
  children: readonly EngineRenderableNode[]
}

export interface EngineShapeNode extends EngineNodeBase {
  type: 'shape'
  shape: EngineShapeKind
  /**
   * Local left coordinate.
   * - rect: top-left corner of the rectangle.
   * - ellipse: prefer {@link ellipseGeometry} instead; falls back to top-left of bounding rect.
   * - line / polygon / path: derived from points/bezierPoints bounds; not an authored truth.
   */
  x?: number
  /**
   * Local top coordinate. Same semantics as {@link x}.
   */
  y?: number
  /**
   * Bounding box width.
   * - rect: intrinsic (the rectangle width).
   * - ellipse: prefer {@link ellipseGeometry} instead; falls back to bounding rect width.
   * - line / polygon / path: derived from geometry; saved for editor convenience, not an authored truth.
   */
  width?: number
  /**
   * Bounding box height. Same semantics as {@link width}.
   */
  height?: number
  /** Ellipse geometry in center+radii form. Preferred over x/y/width/height for ellipse shapes. */
  ellipseGeometry?: EngineEllipseGeometry
  /** Fill rendering configuration. Prefer this over the deprecated flat fill fields below. */
  fillConfig?: EngineFillConfig
  /** Stroke rendering configuration. Prefer this over the deprecated flat stroke fields below. */
  strokeConfig?: EngineStrokeConfig
  /** Uniform corner radius for rounded rectangles. `cornerRadii` takes precedence when both are provided. */
  cornerRadius?: number
  /** Per-corner radii for rounded rectangles. Takes precedence over uniform `cornerRadius`. */
  cornerRadii?: EngineRectangleCornerRadii
  /** Ellipse arc start angle in degrees. When omitted, the ellipse is a full circle. */
  ellipseStartAngle?: number
  /** Ellipse arc end angle in degrees. Defaults to 360 (full circle). */
  ellipseEndAngle?: number
  /** When true, draws radial edges from arc endpoints to the ellipse center, forming a wedge. */
  ellipseDrawWedgeLine?: boolean
  /** Straight-line vertices for line, polygon, and path shapes. */
  points?: readonly EnginePoint[]
  /** Bezier vertices for line and path shapes. Preferred over `points` by renderers. */
  bezierPoints?: readonly EngineBezierPoint[]
  /** Cached point count for geometry payload resolution. */
  pointCount?: number
  /** Cached bezier point count for geometry payload resolution. */
  bezierPointCount?: number
  /** Ordered anchor points for path-like geometry. When present, renderers should prefer this over bezierPoints/points for path shapes. */
  anchorPoints?: readonly EngineAnchorPoint[]
  closed?: boolean
  // ── Deprecated flat fill / stroke fields ──
  /** @deprecated Use `fillConfig.color` instead. */
  fill?: string
  /** @deprecated Use `fillConfig.paints` instead. */
  fills?: readonly EnginePaint[]
  /** @deprecated Use `strokeConfig.color` instead. */
  stroke?: string
  /** @deprecated Use `strokeConfig.paints` instead. */
  strokes?: readonly EnginePaint[]
  /** @deprecated Use `strokeConfig.width` instead. */
  strokeWidth?: number
  /** @deprecated Use `strokeConfig.align` instead. */
  strokeAlign?: EngineStrokeAlign
  /** @deprecated Use `strokeConfig.dashArray` instead. */
  strokeDashArray?: readonly number[]
  /** @deprecated Use `strokeConfig.cap` instead. */
  strokeCap?: 'butt' | 'round' | 'square'
  /** @deprecated Use `strokeConfig.join` instead. */
  strokeJoin?: 'miter' | 'round' | 'bevel'
  /** @deprecated Use `strokeConfig.startArrowhead` instead. */
  strokeStartArrowhead?: EngineStrokeArrowhead
  /** @deprecated Use `strokeConfig.endArrowhead` instead. */
  strokeEndArrowhead?: EngineStrokeArrowhead
}

/** Union of all renderable node families accepted by the engine scene contract. */
export type EngineRenderableNode =
  | EngineTextNode
  | EngineImageNode
  | EngineShapeNode
  | EngineGroupNode

/** Complete scene descriptor passed to the engine for rendering. */
export interface EngineSceneSnapshot {
  /** Monotonic revision used by render adapters for cache invalidation. */
  revision: string | number
  /** Scene viewport width in pixels. */
  width: number
  /** Scene viewport height in pixels. */
  height: number
  /** Ordered list of root-level renderable nodes. */
  nodes: readonly EngineRenderableNode[]
  /** Optional metadata for incremental updates and buffer management. */
  metadata?: {
    planVersion?: number
    bufferVersion?: number
    dirtyNodeIds?: readonly EngineNodeId[]
    removedNodeIds?: readonly EngineNodeId[]
    bufferLayout?: EngineSceneBufferLayout
  }
}
