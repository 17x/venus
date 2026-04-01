declare module '@lite-u/editor/types' {
  export type UID = string

  export interface Fill {
    enabled?: boolean
    color?: string
  }

  export interface Stroke {
    enabled?: boolean
    color?: string
    weight?: number
    cap?: string
    join?: string
    dashed?: boolean
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
    opacity?: number
    fill?: Fill
    stroke?: Stroke
    asset?: string
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
