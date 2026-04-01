import type { ToolDefinition } from '@venus/editor-core'

export const TOOLS: ToolDefinition[] = [
  { id: 'select', label: 'Select', shortcut: 'V' },
  { id: 'frame', label: 'Frame', shortcut: 'F' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O' },
  { id: 'pen', label: 'Pen', shortcut: 'P' },
  { id: 'text', label: 'Text', shortcut: 'T' },
]
