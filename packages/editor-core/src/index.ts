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

export const TOOLS: ToolDefinition[] = [
  { id: 'select', label: 'Select', shortcut: 'V' },
  { id: 'frame', label: 'Frame', shortcut: 'F' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O' },
  { id: 'pen', label: 'Pen', shortcut: 'P' },
  { id: 'text', label: 'Text', shortcut: 'T' },
]

export function createStarterDocument(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'A4',
    width: 640,
    height: 920,
    shapes: [
      {
        id: 'shape-1',
        type: 'rectangle',
        name: 'rectangle',
        x: 110,
        y: 90,
        width: 160,
        height: 160,
      },
      {
        id: 'shape-2',
        type: 'rectangle',
        name: 'rectangle',
        x: 340,
        y: 300,
        width: 160,
        height: 160,
      },
      {
        id: 'shape-3',
        type: 'rectangle',
        name: 'rectangle',
        x: 110,
        y: 400,
        width: 160,
        height: 160,
      },
    ],
  }
}
