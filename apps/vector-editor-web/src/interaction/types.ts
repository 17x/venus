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
    rotation?: number
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

export type DraftPrimitiveType = 'rectangle' | 'ellipse' | 'lineSegment' | 'path' | 'polygon' | 'star'

export interface DraftPrimitive {
  id: string
  type: DraftPrimitiveType
  points: InteractionPoint[]
  bounds: InteractionBounds
}
