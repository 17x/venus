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

/** Declares stroke dash pattern values. */
export type StrokeDashPattern = 'solid' | 'dashed' | 'dotted' | 'custom'

/** Declares stroke cap style for open path endpoints. */
export type StrokeCap = 'none' | 'round' | 'square'

/** Declares stroke join style for path corners. */
export type StrokeJoin = 'miter' | 'round' | 'bevel'

/** Declares stroke alignment relative to the path. */
export type StrokeAlign = 'center' | 'inside' | 'outside'

/** Declares gradient algorithm families. */
export type ShapeGradientType = 'linear' | 'radial' | 'angular' | 'diamond'

/** Declares blend mode compositing operators. */
export type ShapeBlendMode =
  | 'normal'
  | 'darken'
  | 'multiply'
  | 'color-burn'
  | 'lighten'
  | 'screen'
  | 'color-dodge'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'

/** Declares shadow effect kind. */
export type ShadowKind = 'drop' | 'inner'

/** Declares blur effect kind. */
export type BlurKind = 'layer' | 'background'

/** Declares image fill scale mode. */
export type ImageScaleMode = 'fill' | 'fit' | 'crop' | 'tile'

/** Declares boolean operation kinds for vector shape composition. */
export type BooleanOperation = 'union' | 'subtract' | 'intersect' | 'exclude' | 'none'

/** Declares text auto-height mode. */
export type TextAutoHeight = 'auto' | 'fixed'

/** Declares text truncation mode. */
export type TextTruncation = 'none' | 'ending' | 'middle'

/** Declares text decoration style. */
export type TextDecoration = 'none' | 'underline' | 'strikethrough'

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
  /** Stores optional linear/angular gradient angle in degrees. */
  angle?: number
  /** Stores optional radial/diamond/angular center x in normalized coordinates. */
  centerX?: number
  /** Stores optional radial/diamond/angular center y in normalized coordinates. */
  centerY?: number
  /** Stores optional radial/diamond radius in normalized coordinates. */
  radius?: number
  /** Stores optional angular gradient start angle offset in degrees. */
  startAngle?: number
  /** Stores optional angular gradient sweep angle in degrees. */
  sweepAngle?: number
}

/** Declares image fill payload for pattern/image-backed fills. */
export interface ShapeImageFill {
  /** Stores asset id referencing the image source. */
  assetId: string
  /** Stores image scale mode controlling sizing behavior. */
  scaleMode?: ImageScaleMode
  /** Stores optional rotation in degrees for the fill image. */
  rotation?: number
  /** Stores optional opacity multiplier [0-1] for the image fill layer. */
  opacity?: number
  /** Stores optional blend mode for this image fill layer. */
  blendMode?: ShapeBlendMode
}

/** Declares fill channel style for one shape. */
export interface ShapeFillStyle {
  /** Enables or disables fill rendering. */
  enabled?: boolean
  /** Stores fallback solid fill color in CSS notation. */
  color?: string
  /** Stores optional gradient fill style. */
  gradient?: ShapeGradientStyle
  /** Stores optional image/pattern fill style. */
  image?: ShapeImageFill
  /** Stores per-fill opacity multiplier [0-1]. */
  opacity?: number
  /** Stores optional blend mode for this fill layer. */
  blendMode?: ShapeBlendMode
}

/** Declares stroke channel style for one shape. */
export interface ShapeStrokeStyle {
  /** Enables or disables stroke rendering. */
  enabled?: boolean
  /** Stores fallback solid stroke color in CSS notation. */
  color?: string
  /** Stores stroke width in world units. */
  weight?: number
  /** Stores optional gradient stroke style. */
  gradient?: ShapeGradientStyle
  /** Stores stroke dash pattern. Defaults to solid when omitted. */
  dashPattern?: StrokeDashPattern
  /** Stores custom dash array (e.g. [4, 2, 1, 2]) used when dashPattern is 'custom'. */
  customDash?: number[]
  /** Stores stroke alignment relative to the shape boundary. Defaults to center. */
  align?: StrokeAlign
  /** Stores stroke cap style for open path endpoints. Defaults to none. */
  cap?: StrokeCap
  /** Stores stroke join style for path corners. Defaults to miter. */
  join?: StrokeJoin
  /** Stores per-stroke opacity multiplier [0-1]. */
  opacity?: number
  /** Stores optional blend mode for this stroke layer. */
  blendMode?: ShapeBlendMode
}

/** Declares shadow channel style for one shape. */
export interface ShapeShadowStyle {
  /** Enables or disables shadow rendering. */
  enabled?: boolean
  /** Stores shadow effect kind. Defaults to drop when omitted. */
  kind?: ShadowKind
  /** Stores shadow color in CSS notation. */
  color?: string
  /** Stores shadow offset on the x axis in world units. */
  offsetX?: number
  /** Stores shadow offset on the y axis in world units. */
  offsetY?: number
  /** Stores shadow blur radius in world units. */
  blur?: number
  /** Stores shadow spread radius in world units. */
  spread?: number
  /** Stores optional blend mode for this shadow layer. */
  blendMode?: ShapeBlendMode
}

/** Declares blur effect style for one shape. */
export interface ShapeBlurStyle {
  /** Enables or disables blur rendering. */
  enabled?: boolean
  /** Stores blur effect kind. */
  kind: BlurKind
  /** Stores blur radius in world units. */
  radius: number
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
  /** Stores font style (normal, italic). */
  fontStyle?: 'normal' | 'italic'
  /** Stores letter spacing in px. */
  letterSpacing?: number
  /** Stores line-height multiplier. */
  lineHeight?: number
  /** Stores horizontal text alignment. */
  textAlign?: 'left' | 'center' | 'right'
  /** Stores vertical text alignment inside its box. */
  verticalAlign?: 'top' | 'middle' | 'bottom'
  /** Stores text decoration style. */
  textDecoration?: TextDecoration
  /** Stores optional text-level shadow style. */
  shadow?: ShapeShadowStyle
  /** Stores paragraph left indent in px. */
  paragraphIndentLeft?: number
  /** Stores paragraph first-line indent in px. */
  paragraphIndentFirst?: number
  /** Stores paragraph right indent in px. */
  paragraphIndentRight?: number
  /** Stores paragraph spacing before in px. */
  paragraphSpaceBeforeLine?: number
  /** Stores paragraph spacing after in px. */
  paragraphSpaceAfterLine?: number
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

/** Declares one canonical style-id reference payload on a document node. */
export interface DocumentNodeStyleReferences {
  /** Stores optional fill style id used by style library references. */
  fillStyleId?: string
  /** Stores optional stroke style id used by style library references. */
  strokeStyleId?: string
  /** Stores optional text style id used by style library references. */
  textStyleId?: string
  /** Stores optional effect style id used by style library references. */
  effectStyleId?: string
}

/** Declares one document page contract used by multi-page editor model. */
export interface EditorDocumentPage {
  /** Stores stable page id. */
  id: string
  /** Stores page display name. */
  name: string
  /** Stores page width in world units. */
  width: number
  /** Stores page height in world units. */
  height: number
}

/** Declares one lifecycle state snapshot for editor document state machine. */
export interface EditorDocumentLifecycleTransitionSource {
  /** Stores stable source category for lifecycle transition diagnostics. */
  kind: 'system' | 'user' | 'command' | 'import'
  /** Stores semantic source event label. */
  event: string
  /** Stores optional source command id when transition is command-driven. */
  commandId?: string
  /** Stores optional source transaction id when transition is command-driven. */
  transactionId?: string
  /** Stores optional source command type when transition is command-driven. */
  commandType?: string
  /** Stores transition timestamp in epoch milliseconds. */
  issuedAt: number
}

/** Declares one command-derived dirty source payload for save/recovery tracing. */
export interface EditorDocumentLifecycleDirtySource {
  /** Stores stable command type that introduced unsaved changes. */
  commandType: string
  /** Stores optional command id for deterministic diagnostics mapping. */
  commandId?: string
  /** Stores stable transaction id for grouped command chains. */
  transactionId: string
  /** Stores dirty-source timestamp in epoch milliseconds. */
  issuedAt: number
}

/** Declares one lifecycle state snapshot for editor document state machine. */
export interface EditorDocumentLifecycleState {
  /** Stores lifecycle phase. */
  state: 'created' | 'opened' | 'dirty' | 'saving' | 'saved' | 'recovery' | 'closed'
  /** Stores whether unsaved user changes currently exist. */
  dirty: boolean
  /** Stores optional last-save timestamp for diagnostics. */
  lastSavedAt?: number
  /** Stores optional recovery reason for failure diagnostics. */
  recoveryReason?: string
  /** Stores latest lifecycle transition source for state-machine observability. */
  lastTransitionSource?: EditorDocumentLifecycleTransitionSource
  /** Stores latest dirty-source chain for command/transaction traceability. */
  lastDirtySource?: EditorDocumentLifecycleDirtySource
}

/** Declares canonical schema header used by contract migration entry points. */
export interface EditorDocumentSchema {
  /** Stores schema namespace identifier. */
  name: string
  /** Stores schema version number used by migration gates. */
  version: number
  /** Stores schema major version used by compatibility gates. */
  major?: number
  /** Stores schema minor version used by additive migration gates. */
  minor?: number
}

/** Declares one style-library map grouped by style category id. */
export interface EditorDocumentStyleReferences {
  /** Stores fill style registry keyed by style id. */
  fills: Record<string, {name?: string}>
  /** Stores stroke style registry keyed by style id. */
  strokes: Record<string, {name?: string}>
  /** Stores text style registry keyed by style id. */
  texts: Record<string, {name?: string}>
  /** Stores effect style registry keyed by style id. */
  effects: Record<string, {name?: string}>
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
  /** Stores layer opacity [0-1] applied to the entire node. */
  opacity?: number
  /** Stores layer blend mode for compositing this node. */
  blendMode?: ShapeBlendMode
  /** Stores whether this node is locked against selection/editing. */
  locked?: boolean
  /** Stores whether this node is visible. Defaults to true. */
  visible?: boolean
  /** Stores plain text payload for text-like nodes. */
  text?: string
  /** Stores rich text segments aligned to text. */
  textRuns?: TextRun[]
  /** Stores text auto-height mode. Defaults to fixed. */
  textAutoHeight?: TextAutoHeight
  /** Stores text truncation mode when text overflows the bounding box. */
  textTruncation?: TextTruncation
  /** Stores max lines before truncation applies (when textTruncation is set). */
  textMaxLines?: number
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
  /** Stores ordered fill style layers (Figma-compatible multi-fill). */
  fills?: ShapeFillStyle[]
  /** @deprecated Use fills[0] instead. Kept for backward compatibility. */
  fill?: ShapeFillStyle
  /** Stores ordered stroke style layers (Figma-compatible multi-stroke). */
  strokes?: ShapeStrokeStyle[]
  /** @deprecated Use strokes[0] instead. Kept for backward compatibility. */
  stroke?: ShapeStrokeStyle
  /** Stores shadow style channel. */
  shadow?: ShapeShadowStyle
  /** Stores layer blur effect. */
  blur?: ShapeBlurStyle
  /** Stores uniform rectangle corner radius. */
  cornerRadius?: number
  /** Stores independent rectangle corner radii. */
  cornerRadii?: RectangleCornerRadii
  /** Stores ellipse arc start angle in degrees. */
  ellipseStartAngle?: number
  /** Stores ellipse arc end angle in degrees. */
  ellipseEndAngle?: number
  /** Stores boolean operation applied to this node relative to siblings. */
  booleanOperation?: BooleanOperation
  /** Stores optional component id when this node is a component instance. */
  componentId?: string
  /** Stores optional component variant properties for variant-based overrides. */
  componentProperties?: Record<string, unknown>
  /** Stores source metadata for adapters and diagnostics. */
  schema?: DocumentSchemaMeta
  /** Stores optional style references used by page/style model evolution. */
  styleRefs?: DocumentNodeStyleReferences
  /** Stores optional extension namespace payload for forward-compatible metadata. */
  extensions?: Record<string, unknown>
}

/** Declares canonical editor document payload. */
export interface EditorDocument {
  /** Stores stable document id. */
  id: string
  /** Stores display document name. */
  name: string
  /** Stores canonical schema header. */
  schema?: EditorDocumentSchema
  /** Stores document creation timestamp in epoch milliseconds. */
  createdAt?: number
  /** Stores document update timestamp in epoch milliseconds. */
  updatedAt?: number
  /** Stores canvas width in world units. */
  width: number
  /** Stores canvas height in world units. */
  height: number
  /** Stores page list for multi-page model evolution. */
  pages?: EditorDocumentPage[]
  /** Stores active page id from the page list. */
  activePageId?: string
  /** Stores lifecycle status used by document save/recovery workflows. */
  lifecycle?: EditorDocumentLifecycleState
  /** Stores style-library references grouped by style category. */
  styleReferences?: EditorDocumentStyleReferences
  /** Stores extension namespace payload preserved across IO boundaries. */
  extensions?: Record<string, unknown>
  /** Stores ordered node snapshot list. */
  shapes: DocumentNode[]
}
