export type ToolId = 'select' | 'frame' | 'rectangle' | 'ellipse' | 'pen' | 'text'

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

export interface ToolDefinition {
  id: ToolId
  label: string
  shortcut: string
}
