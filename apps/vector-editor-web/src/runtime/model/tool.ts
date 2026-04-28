export type ToolId =
  | 'select'
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'lineSegment'
  | 'polygon'
  | 'star'
  | 'pen'
  | 'text'

export type ToolName =
  | 'selector'
  | 'dselector'
  | 'rectangle'
  | 'text'
  | 'ellipse'
  | 'panning'
  | 'connector'
  | 'lineSegment'
  | 'polygon'
  | 'star'
  | 'path'
  | 'pencil'
  | 'zoomIn'
  | 'zoomOut'

export interface ToolDefinition {
  id: ToolId
  label: string
  shortcut: string
}
