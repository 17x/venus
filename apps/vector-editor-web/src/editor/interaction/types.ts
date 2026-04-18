export interface InteractionPoint {
  x: number
  y: number
}

export interface InteractionBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type HandleKind =
  | 'move'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'

export interface InteractionHandle {
  id: string
  kind: HandleKind
  x: number
  y: number
}

export interface SelectionState {
  selectedIds: string[]
  hoverId: string | null
  selectedBounds: InteractionBounds | null
}

export interface TransformPreview {
  shapes: Array<{
    shapeId: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    flipX?: boolean
    flipY?: boolean
  }>
}

export interface TransformSessionShape {
  shapeId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  centerX: number
  centerY: number
}

export interface TransformSession {
  shapeIds: string[]
  shapes: TransformSessionShape[]
  handle: HandleKind
  start: InteractionPoint
  startBounds: InteractionBounds
  current: InteractionPoint
}

export type DraftPrimitiveType = 'rectangle' | 'ellipse' | 'lineSegment' | 'path' | 'polygon' | 'star' | 'text'

export interface DraftPrimitive {
  id: string
  type: DraftPrimitiveType
  points: InteractionPoint[]
  bounds: InteractionBounds
}

export type SegmentType = 'line' | 'curve'

export interface PathHandlePoint {
  x: number
  y: number
}

export interface PathAnchorPoint {
  index: number
  x: number
  y: number
  segmentType: SegmentType
  inHandle?: PathHandlePoint
  outHandle?: PathHandlePoint
}

export interface PathSegmentSelection {
  index: number
  segmentType: SegmentType
  x: number
  y: number
}

export interface PathHandleSelection {
  anchorIndex: number
  handleType: 'inHandle' | 'outHandle'
  x: number
  y: number
}

export interface PathSubSelection {
  shapeId: string
  hitType: 'anchorPoint' | 'segment' | 'inHandle' | 'outHandle'
  anchorPoint?: PathAnchorPoint
  segment?: PathSegmentSelection
  handlePoint?: PathHandleSelection
}
