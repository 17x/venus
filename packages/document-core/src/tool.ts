export type ToolId = 'select' | 'frame' | 'rectangle' | 'ellipse' | 'lineSegment' | 'pen' | 'text'

export type ToolName =
  | 'selector'
  | 'dselector'
  | 'rectangle'
  | 'text'
  | 'ellipse'
  | 'panning'
  | 'lineSegment'
  | 'path'
  | 'pencil'
  | 'zoomIn'
  | 'zoomOut'

export interface ToolDefinition {
  id: ToolId
  label: string
  shortcut: string
}
