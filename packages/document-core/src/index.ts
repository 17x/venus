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

export type ShapeType = 'frame' | 'rectangle' | 'ellipse' | 'lineSegment' | 'path' | 'text'

export interface DocumentNode {
  id: string
  type: ShapeType
  name: string
  x: number
  y: number
  width: number
  height: number
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
