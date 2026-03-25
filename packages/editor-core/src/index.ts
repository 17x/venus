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
    name: 'Untitled',
    width: 1440,
    height: 960,
    shapes: [
      {
        id: 'shape-frame',
        type: 'frame',
        name: 'Landing Page',
        x: 160,
        y: 120,
        width: 720,
        height: 480,
      },
      {
        id: 'shape-hero',
        type: 'rectangle',
        name: 'Hero Card',
        x: 230,
        y: 200,
        width: 320,
        height: 180,
      },
      {
        id: 'shape-cta',
        type: 'ellipse',
        name: 'CTA Accent',
        x: 610,
        y: 260,
        width: 120,
        height: 120,
      },
    ],
  }
}
