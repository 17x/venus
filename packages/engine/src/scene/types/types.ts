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

export interface EngineRect {
  x: number
  y: number
  width: number
  height: number
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
  opacity?: number
  blendMode?: string
  transform?: EngineTransform2D
  shadow?: EngineShadow
  /** Inner shadow effect clipped to shape interior. */
  innerShadow?: EngineInnerShadow
  /** Layer blur applied via CSS filter after rendering. */
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
  fill?: string
  /** Ordered paint list for text fill (takes precedence over `fill`). */
  fills?: readonly EnginePaint[]
  stroke?: string
  strokeWidth?: number
  align?: 'start' | 'center' | 'end'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  shadow?: EngineShadow
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
  x: number
  y: number
  width: number
  height: number
  // Rectangle corner radius controls. `cornerRadii` takes precedence over
  // uniform `cornerRadius` when both are provided.
  cornerRadius?: number
  cornerRadii?: EngineRectangleCornerRadii
  // Ellipse arc controls in degrees. When omitted, the ellipse is full-circle.
  ellipseStartAngle?: number
  ellipseEndAngle?: number
  // Arrowheads for open stroke primitives.
  strokeStartArrowhead?: EngineStrokeArrowhead
  strokeEndArrowhead?: EngineStrokeArrowhead
  points?: readonly EnginePoint[]
  bezierPoints?: readonly EngineBezierPoint[]
  pointCount?: number
  bezierPointCount?: number
  closed?: boolean
  /** Single fill colour (backward compatible; prefer `fills` when present). */
  fill?: string
  /** Single stroke colour (backward compatible; prefer `strokes` when present). */
  stroke?: string
  strokeWidth?: number
  /** Ordered paint list for fill (takes precedence over `fill`). */
  fills?: readonly EnginePaint[]
  /** Ordered paint list for stroke (takes precedence over `stroke`). */
  strokes?: readonly EnginePaint[]
  /** Stroke alignment relative to path geometry. Defaults to center. */
  strokeAlign?: EngineStrokeAlign
  /** Dash pattern as alternating dash-gap lengths. Empty or absent means solid. */
  strokeDashArray?: readonly number[]
  /** Line cap style for open stroke paths. Defaults to round. */
  strokeCap?: 'butt' | 'round' | 'square'
  /** Line join style for stroke corners. Defaults to round. */
  strokeJoin?: 'miter' | 'round' | 'bevel'
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
