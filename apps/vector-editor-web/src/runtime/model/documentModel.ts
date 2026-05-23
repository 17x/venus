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
