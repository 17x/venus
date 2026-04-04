import type {BezierPoint, Point} from './geometry.ts'

export {convertUnit} from './converter.ts'
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

export type ShapeType = 'frame' | 'rectangle' | 'ellipse' | 'lineSegment' | 'path' | 'text' | 'image'

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

export interface DocumentNode {
  id: string
  type: ShapeType
  name: string
  x: number
  y: number
  width: number
  height: number
  // Primary text payload for text-like nodes and product-level label adapters.
  text?: string
  // Rich text runs aligned with `text`, optional for the minimal plain-text case.
  textRuns?: TextRun[]
  // Asset reference for image-backed nodes.
  assetId?: string
  // Resolved browser-usable URL for image rendering in app shells.
  assetUrl?: string
  // Absolute world-space points used by polyline/path shapes.
  points?: Point[]
  // Bezier curve points used by pen/pencil-authored path shapes.
  bezierPoints?: BezierPoint[]
}

export interface EditorDocument {
  id: string
  name: string
  width: number
  height: number
  shapes: DocumentNode[]
}
