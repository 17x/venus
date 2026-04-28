declare module '@lite-u/editor/types' {
  export type UID = string

  // Declares one gradient color stop in normalized offset space.
  export interface GradientStop {
    // Stores stop offset in [0, 1].
    offset: number
    // Stores CSS-compatible color string.
    color: string
    // Stores optional stop alpha override.
    opacity?: number
  }

  // Declares gradient fill/stroke style metadata.
  export interface GradientStyle {
    // Stores gradient strategy used by renderer.
    type: 'linear' | 'radial'
    // Stores ordered stop list for color interpolation.
    stops: GradientStop[]
    // Stores optional linear gradient angle in degrees.
    angle?: number
    // Stores optional radial center x in normalized coordinates.
    centerX?: number
    // Stores optional radial center y in normalized coordinates.
    centerY?: number
    // Stores optional radial radius in normalized coordinates.
    radius?: number
  }

  // Declares basic fill style shape used by editor element props.
  export interface Fill {
    // Stores whether fill channel is enabled.
    enabled?: boolean
    // Stores solid fill color when gradient is omitted.
    color?: string
    // Stores optional gradient configuration for fill rendering.
    gradient?: GradientStyle
  }

  // Declares basic stroke style shape used by editor element props.
  export interface Stroke {
    // Stores whether stroke channel is enabled.
    enabled?: boolean
    // Stores solid stroke color when gradient is omitted.
    color?: string
    // Stores stroke width.
    weight?: number
    // Stores line cap style.
    cap?: string
    // Stores line join style.
    join?: string
    // Stores dashed rendering toggle.
    dashed?: boolean
    // Stores optional gradient configuration for stroke rendering.
    gradient?: GradientStyle
  }
  export interface Shadow {
    enabled?: boolean
    color?: string
    offsetX?: number
    offsetY?: number
    blur?: number
  }
  export interface CornerRadii {
    topLeft?: number
    topRight?: number
    bottomRight?: number
    bottomLeft?: number
  }

  export interface TextShadow {
    color?: string
    offsetX?: number
    offsetY?: number
    blur?: number
  }

  export interface TextStyle {
    color?: string
    fontFamily?: string
    fontSize?: number
    fontWeight?: number
    letterSpacing?: number
    lineHeight?: number
    textAlign?: 'left' | 'center' | 'right'
    verticalAlign?: 'top' | 'middle' | 'bottom'
    shadow?: TextShadow
  }

  export interface TextRun {
    start: number
    end: number
    style?: TextStyle
  }

  export interface ElementProps {
    id: UID
    type: string
    layer?: number
    name?: string
    show?: boolean
    x?: number
    y?: number
    cx?: number
    cy?: number
    r1?: number
    r2?: number
    width?: number
    height?: number
    rotation?: number
    flipX?: boolean
    flipY?: boolean
    opacity?: number
    fill?: Fill
    stroke?: Stroke
    shadow?: Shadow
    cornerRadius?: number
    cornerRadii?: CornerRadii
    ellipseStartAngle?: number
    ellipseEndAngle?: number
    asset?: string
    text?: string
    textRuns?: TextRun[]
    [key: string]: unknown
  }

  export interface ElementInstance extends ElementProps {
    layer: number
    show: boolean
  }

  export interface VisionEditorAssetType {
    id: UID
    name: string
    type: string
    mimeType: string
    file?: File
    imageRef?: unknown
  }

  export type VisionEventType = string
  export type VisionEventData<K extends VisionEventType = VisionEventType> = unknown
}

declare module '@lite-u/editor' {
  import type {
    ElementInstance,
    ElementProps,
    VisionEditorAssetType,
    VisionEventData,
    VisionEventType,
  } from '@lite-u/editor/types'

  export interface EditorHistoryNode {
    id: number
    prev: EditorHistoryNode | null
    next: EditorHistoryNode | null
    data?: {
      type?: string
    }
  }

  export interface EditorHistoryTree {
    current: EditorHistoryNode | null
    toArray(): EditorHistoryNode[]
  }

  export interface EditorEvents {
    onInitialized?: () => void
    onZoomed?: (scale: number) => void
    onHistoryUpdated?: (historyTree: EditorHistoryTree | null) => void
    onElementsUpdated?: (elementMap: Map<string, ElementInstance>) => void
    onSelectionUpdated?: (selected: Set<string>, props: ElementProps | null) => void
    onWorldMouseMove?: (point: {x: number; y: number}) => void
    onContextMenu?: (position: {x: number; y: number}) => void
    onElementCopied?: (items: ElementProps[]) => void
    onSwitchTool?: (toolName: string) => void
  }

  export interface EditorOptions {
    container: HTMLDivElement
    elements: ElementProps[]
    assets?: VisionEditorAssetType[]
    config?: {
      dpr?: number
      page?: unknown
    }
    events?: EditorEvents
  }

  export class Editor {
    constructor(options: EditorOptions)
    execute(type: VisionEventType, data?: VisionEventData): void
    export(): {
      elements?: ElementProps[]
      assets?: VisionEditorAssetType[]
    } | undefined
    destroy(): void
    printOut(ctx: CanvasRenderingContext2D): void
  }
}
