import type {BezierPoint, Point} from './geometry.ts'

export {convertUnit} from './converter.ts'
export {isPointInsideClipShape} from './hitTest.ts'
export type {BezierPoint, BoundingRect, Point, Rect} from './geometry.ts'
export {
  cubicBezier,
  generateBoundingRectFromRect,
  generateBoundingRectFromRotatedRect,
  generateBoundingRectFromTwoPoints,
  getBoundingRectFromBezierPoints,
  convertDrawPointsToBezierPoints,
  isInsideRotatedRect,
  isPointNear,
  nearestPointOnCurve,
  rectsOverlap,
  rotatePointAroundPoint,
  transformPoints,
} from './geometry.ts'
export {nid} from './nid.ts'
export {type ToolDefinition, type ToolId, type ToolName} from './tool.ts'
export {Unit, type UnitType} from './unit.ts'

export type ShapeType = 'frame' | 'group' | 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'lineSegment' | 'path' | 'text' | 'image'
export type StrokeArrowhead = 'none' | 'triangle' | 'diamond' | 'circle' | 'bar'

export interface TextStyle {
  color?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
}

export interface TextRun {
  start: number
  end: number
  style?: TextStyle
}

export interface DocumentSchemaMeta {
  sourceNodeType?: string
  sourceNodeKind?: string
  sourceFeatureKinds?: string[]
}

export interface DocumentNode {
  id: string
  type: ShapeType
  name: string
  parentId?: string | null
  childIds?: string[]
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  // Primary text payload for text-like nodes and product-level label adapters.
  text?: string
  // Rich text runs aligned with `text`, optional for the minimal plain-text case.
  textRuns?: TextRun[]
  // Asset reference for image-backed nodes.
  assetId?: string
  // Resolved browser-usable URL for image rendering in app shells.
  assetUrl?: string
  // Clip source reference for image-backed nodes that are trimmed by another
  // closed shape in the file-format layer.
  clipPathId?: string
  clipRule?: 'nonzero' | 'evenodd'
  // Absolute world-space points used by polyline/path shapes.
  points?: Point[]
  // Bezier curve points used by pen/pencil-authored path shapes.
  bezierPoints?: BezierPoint[]
  // Optional arrowhead styles for open stroke primitives.
  strokeStartArrowhead?: StrokeArrowhead
  strokeEndArrowhead?: StrokeArrowhead
  // File-format source metadata preserved for adapters, renderer diagnostics,
  // and interaction logic that needs to stay aligned with node+feature truth.
  schema?: DocumentSchemaMeta
}

export interface EditorDocument {
  id: string
  name: string
  width: number
  height: number
  shapes: DocumentNode[]
}
