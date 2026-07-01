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

export interface EnginePoint {
  x: number
  y: number
}

export interface EngineBezierPoint {
  anchor: EnginePoint
  cp1?: EnginePoint | null
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

export interface EngineRect {
  x: number
  y: number
  width: number
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

export interface EngineTransform2D {
  matrix: readonly [number, number, number, number, number, number]
}

/** Declares one shadow hint accepted by renderable engine nodes. */
export interface EngineShadow {
  color?: string
  offsetX?: number
  offsetY?: number
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
  topLeft?: number
  topRight?: number
  bottomRight?: number
  bottomLeft?: number
}

/** Declares arrowhead styles for open stroke primitives. */
export type EngineStrokeArrowhead = 'none' | 'triangle' | 'diamond' | 'circle' | 'bar'

export type EngineClipShape =
  | {
    kind: 'rect'
    rect: EngineRect
    radius?: number
  }
  | {
    kind: 'path'
    points: readonly EnginePoint[]
    closed?: boolean
  }

/** Declares clipping metadata that can be attached to renderable engine nodes. */
export interface EngineNodeClip {
  clipNodeId?: EngineNodeId
  clipShape?: EngineClipShape
  rule?: 'nonzero' | 'evenodd'
}

export interface EngineNodeBase {
  id: EngineNodeId
  type: string
  /** Visual effects applied after geometry rendering. Prefer this over the deprecated flat fields below. */
  visual?: EngineVisualEffects
  /** @deprecated Use `visual.opacity` instead. */
  opacity?: number
  /** @deprecated Use `visual.blendMode` instead. */
  blendMode?: string
  transform?: EngineTransform2D
  /** @deprecated Use `visual.shadow` instead. */
  shadow?: EngineShadow
  /** @deprecated Use `visual.innerShadow` instead. */
  innerShadow?: EngineInnerShadow
  /** @deprecated Use `visual.layerBlur` instead. */
  layerBlur?: EngineLayerBlur
  // `clipNodeId` enables graph-level clip reuse, while `clipShape` supports
  // inline clipping for lightweight nodes (for example clipped images).
  clip?: EngineNodeClip
}

export interface EngineTextStyle {
  fontFamily: string
  fontSize: number
  fontWeight?: number | string
  fontStyle?: 'normal' | 'italic' | 'oblique'
  lineHeight?: number
  letterSpacing?: number
  /** Fill rendering configuration. Prefer this over the deprecated flat fill fields below. */
  fillConfig?: EngineFillConfig
  /** Stroke rendering configuration. Prefer this over the deprecated flat stroke fields below. */
  strokeConfig?: EngineStrokeConfig
  align?: 'start' | 'center' | 'end'
  verticalAlign?: 'top' | 'middle' | 'bottom'
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

export interface EngineTextRun {
  text: string
  style?: Partial<EngineTextStyle>
}

export interface EngineTextNode extends EngineNodeBase {
  type: 'text'
  x: number
  y: number
  width?: number
  height?: number
  style: EngineTextStyle
  // `text` is the fast plain-string path. `runs` is the rich-text path.
  // Renderers should prefer `runs` when both are present.
  text?: string
  runs?: readonly EngineTextRun[]
  wrap?: 'none' | 'word' | 'char'
  cacheKey?: string
  lineCount?: number
  maxLineHeight?: number
}

export interface EngineImageNode extends EngineNodeBase {
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  assetId: string
  sourceRect?: EngineRect
  naturalSize?: {
    width: number
    height: number
  }
  imageSmoothing?: boolean
}

export interface EngineGroupNode extends EngineNodeBase {
  type: 'group'
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
  // Rectangle corner radius controls. `cornerRadii` takes precedence over
  // uniform `cornerRadius` when both are provided.
  cornerRadius?: number
  cornerRadii?: EngineRectangleCornerRadii
  // Ellipse arc controls in degrees. When omitted, the ellipse is full-circle.
  ellipseStartAngle?: number
  ellipseEndAngle?: number
  // Draw radial wedge edges from the arc endpoints to the ellipse center.
  ellipseDrawWedgeLine?: boolean
  points?: readonly EnginePoint[]
  bezierPoints?: readonly EngineBezierPoint[]
  pointCount?: number
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

export type EngineRenderableNode =
  | EngineTextNode
  | EngineImageNode
  | EngineShapeNode
  | EngineGroupNode

export interface EngineSceneSnapshot {
  // Revision is used by render adapters for cache invalidation and should
  // change whenever render-relevant scene content changes.
  revision: string | number
  width: number
  height: number
  nodes: readonly EngineRenderableNode[]
  metadata?: {
    planVersion?: number
    bufferVersion?: number
    dirtyNodeIds?: readonly EngineNodeId[]
    removedNodeIds?: readonly EngineNodeId[]
    bufferLayout?: EngineSceneBufferLayout
  }
}
