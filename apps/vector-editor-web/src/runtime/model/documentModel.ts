import type {BezierPoint, Point} from './geometry/geometry.ts'

/** Declares supported runtime/document shape categories. */
export type ShapeType =
  | 'frame'
  | 'group'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'lineSegment'
  | 'path'
  | 'text'
  | 'image'

/** Declares arrowhead style values for stroked open paths. */
export type StrokeArrowhead = 'none' | 'triangle' | 'diamond' | 'circle' | 'bar'

/** Declares gradient algorithm families. */
export type ShapeGradientType = 'linear' | 'radial'

/** Declares one gradient stop in normalized offset space. */
export interface ShapeGradientStop {
  /** Stores stop offset in the range [0, 1]. */
  offset: number
  /** Stores CSS-compatible color string for this stop. */
  color: string
  /** Stores optional alpha override for this stop. */
  opacity?: number
}

/** Declares gradient paint payload shared by fill and stroke styles. */
export interface ShapeGradientStyle {
  /** Stores gradient interpolation strategy. */
  type: ShapeGradientType
  /** Stores ordered gradient stop list. */
  stops: ShapeGradientStop[]
  /** Stores optional linear gradient angle in degrees. */
  angle?: number
  /** Stores optional radial center x in normalized coordinates. */
  centerX?: number
  /** Stores optional radial center y in normalized coordinates. */
  centerY?: number
  /** Stores optional radial radius in normalized coordinates. */
  radius?: number
}

/** Declares fill channel style for one shape. */
export interface ShapeFillStyle {
  /** Enables or disables fill rendering. */
  enabled?: boolean
  /** Stores fallback solid fill color. */
  color?: string
  /** Stores optional gradient fill style. */
  gradient?: ShapeGradientStyle
}

/** Declares stroke channel style for one shape. */
export interface ShapeStrokeStyle {
  /** Enables or disables stroke rendering. */
  enabled?: boolean
  /** Stores fallback solid stroke color. */
  color?: string
  /** Stores stroke width in world units. */
  weight?: number
  /** Stores optional gradient stroke style. */
  gradient?: ShapeGradientStyle
}

/** Declares shadow channel style for one shape. */
export interface ShapeShadowStyle {
  /** Enables or disables shadow rendering. */
  enabled?: boolean
  /** Stores shadow color. */
  color?: string
  /** Stores shadow offset on the x axis. */
  offsetX?: number
  /** Stores shadow offset on the y axis. */
  offsetY?: number
  /** Stores shadow blur radius. */
  blur?: number
}

/** Declares per-corner radii for rectangle-like shapes. */
export interface RectangleCornerRadii {
  /** Stores top-left corner radius. */
  topLeft?: number
  /** Stores top-right corner radius. */
  topRight?: number
  /** Stores bottom-right corner radius. */
  bottomRight?: number
  /** Stores bottom-left corner radius. */
  bottomLeft?: number
}

/** Declares text style payload used by rich text runs. */
export interface TextStyle {
  /** Stores text color. */
  color?: string
  /** Stores font family. */
  fontFamily?: string
  /** Stores font size in px. */
  fontSize?: number
  /** Stores font weight. */
  fontWeight?: number
  /** Stores letter spacing in px. */
  letterSpacing?: number
  /** Stores line-height multiplier. */
  lineHeight?: number
  /** Stores horizontal text alignment. */
  textAlign?: 'left' | 'center' | 'right'
  /** Stores vertical text alignment inside its box. */
  verticalAlign?: 'top' | 'middle' | 'bottom'
  /** Stores optional text-level shadow style. */
  shadow?: ShapeShadowStyle
}

/** Declares one styled text segment in the node text payload. */
export interface TextRun {
  /** Stores inclusive start index of the run. */
  start: number
  /** Stores exclusive end index of the run. */
  end: number
  /** Stores optional style override for this run. */
  style?: TextStyle
}

/** Declares persisted source metadata used by adapters and diagnostics. */
export interface DocumentSchemaMeta {
  /** Stores source node type from imported scene adapters. */
  sourceNodeType?: string
  /** Stores source node kind from imported scene adapters. */
  sourceNodeKind?: string
  /** Stores source feature-kind list from imported scene adapters. */
  sourceFeatureKinds?: string[]
  /** Stores mask group id when the node participates in a mask pair. */
  maskGroupId?: string
  /** Stores mask role for host/source pairing logic. */
  maskRole?: 'host' | 'source'
}

/** Declares canonical document node payload consumed by runtime and worker layers. */
export interface DocumentNode {
  /** Stores stable node id. */
  id: string
  /** Stores semantic shape type. */
  type: ShapeType
  /** Stores display name. */
  name: string
  /** Stores optional parent id for hierarchy traversal. */
  parentId?: string | null
  /** Stores ordered child id list for group/frame nodes. */
  childIds?: string[]
  /** Stores top-left x position in world coordinates. */
  x: number
  /** Stores top-left y position in world coordinates. */
  y: number
  /** Stores width in world units. */
  width: number
  /** Stores height in world units. */
  height: number
  /** Stores clockwise rotation in degrees. */
  rotation?: number
  /** Stores horizontal flip state. */
  flipX?: boolean
  /** Stores vertical flip state. */
  flipY?: boolean
  /** Stores plain text payload for text-like nodes. */
  text?: string
  /** Stores rich text segments aligned to text. */
  textRuns?: TextRun[]
  /** Stores asset id for image-backed nodes. */
  assetId?: string
  /** Stores resolved browser URL for image-backed nodes. */
  assetUrl?: string
  /** Stores clip host/source reference id for masked images. */
  clipPathId?: string
  /** Stores clip fill rule for masked images. */
  clipRule?: 'nonzero' | 'evenodd'
  /** Stores absolute polyline points for open/closed paths. */
  points?: Point[]
  /** Stores bezier control points for pen-generated paths. */
  bezierPoints?: BezierPoint[]
  /** Stores stroke start arrowhead style. */
  strokeStartArrowhead?: StrokeArrowhead
  /** Stores stroke end arrowhead style. */
  strokeEndArrowhead?: StrokeArrowhead
  /** Stores fill style channel. */
  fill?: ShapeFillStyle
  /** Stores stroke style channel. */
  stroke?: ShapeStrokeStyle
  /** Stores shadow style channel. */
  shadow?: ShapeShadowStyle
  /** Stores uniform rectangle corner radius. */
  cornerRadius?: number
  /** Stores independent rectangle corner radii. */
  cornerRadii?: RectangleCornerRadii
  /** Stores ellipse arc start angle in degrees. */
  ellipseStartAngle?: number
  /** Stores ellipse arc end angle in degrees. */
  ellipseEndAngle?: number
  /** Stores source metadata for adapters and diagnostics. */
  schema?: DocumentSchemaMeta
}

/** Declares canonical editor document payload. */
export interface EditorDocument {
  /** Stores stable document id. */
  id: string
  /** Stores display document name. */
  name: string
  /** Stores canvas width in world units. */
  width: number
  /** Stores canvas height in world units. */
  height: number
  /** Stores ordered node snapshot list. */
  shapes: DocumentNode[]
}
