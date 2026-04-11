export type EngineNodeId = string

export interface EnginePoint {
  x: number
  y: number
}

export interface EngineRect {
  x: number
  y: number
  width: number
  height: number
}

export interface EngineTransform2D {
  matrix: readonly [number, number, number, number, number, number]
}

export type EngineClipShape =
  | {
    kind: 'rect'
    rect: EngineRect
    radius?: number
  }
  | {
    kind: 'path'
    points: readonly EnginePoint[]
    closed?: boolean
  }

export interface EngineNodeBase {
  id: EngineNodeId
  type: string
  opacity?: number
  blendMode?: string
  transform?: EngineTransform2D
  // `clipNodeId` enables graph-level clip reuse, while `clipShape` supports
  // inline clipping for lightweight nodes (for example clipped images).
  clip?: {
    clipNodeId?: EngineNodeId
    clipShape?: EngineClipShape
  }
}

export interface EngineTextStyle {
  fontFamily: string
  fontSize: number
  fontWeight?: number | string
  fontStyle?: 'normal' | 'italic' | 'oblique'
  lineHeight?: number
  letterSpacing?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  align?: 'start' | 'center' | 'end'
}

export interface EngineTextRun {
  text: string
  style?: Partial<EngineTextStyle>
}

export interface EngineTextNode extends EngineNodeBase {
  type: 'text'
  x: number
  y: number
  width?: number
  height?: number
  style: EngineTextStyle
  // `text` is the fast plain-string path. `runs` is the rich-text path.
  // Renderers should prefer `runs` when both are present.
  text?: string
  runs?: readonly EngineTextRun[]
  wrap?: 'none' | 'word' | 'char'
}

export interface EngineImageNode extends EngineNodeBase {
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  assetId: string
  sourceRect?: EngineRect
  naturalSize?: {
    width: number
    height: number
  }
  imageSmoothing?: boolean
}

export interface EngineGroupNode extends EngineNodeBase {
  type: 'group'
  children: readonly EngineRenderableNode[]
}

export type EngineRenderableNode =
  | EngineTextNode
  | EngineImageNode
  | EngineGroupNode

export interface EngineSceneSnapshot {
  // Revision is used by render adapters for cache invalidation and should
  // change whenever render-relevant scene content changes.
  revision: string | number
  width: number
  height: number
  nodes: readonly EngineRenderableNode[]
}
