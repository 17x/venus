export {convertUnit} from './converter.ts'
export type {BezierPoint, BoundingRect, Point, Rect} from './geometry.ts'
export {
  cubicBezier,
  generateBoundingRectFromRect,
  generateBoundingRectFromRotatedRect,
  generateBoundingRectFromTwoPoints,
  getBoundingRectFromBezierPoints,
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

export type ShapeType = 'frame' | 'rectangle' | 'ellipse' | 'text'

export interface ShapeRecord {
  id: string
  type: ShapeType
  name: string
  x: number
  y: number
  width: number
  height: number
}

export interface EditorDocument {
  id: string
  name: string
  width: number
  height: number
  shapes: ShapeRecord[]
}
