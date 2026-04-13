import type * as React from 'react'
import type {ToolName} from '@venus/document-core'
import type {CanvasViewportState} from '@venus/runtime'
import type {
  CanvasOverlayRenderer as CanvasOverlayRendererCompat,
  CanvasRenderer as CanvasRendererCompat,
} from '../runtime/canvasAdapter.tsx'
import type {CanvasRuntimeBridgeState} from './useCanvasRuntimeBridge.ts'
import type {ElementProps, VisionEventData, VisionEventType} from '@lite-u/editor/types'
import type {PointRef} from '../components/statusBar/StatusBar.tsx'
import type {createEditorDocumentFromFile} from '../adapters/fileDocument.ts'
import type {SceneShapeSnapshot} from '@venus/runtime/shared-memory'
import type {HistorySummary} from '@venus/runtime/worker'

export interface VisionFileAsset {
  id: string
  name: string
  type: string
  mimeType: string
  file?: File
  imageRef?: unknown
  objectUrl?: string
}

export interface VisionFilePageSet {
  unit: string
  width: number
  height: number
  dpi: number
}

export interface VisionFileType {
  id: string
  name: string
  version: string
  createdAt: number
  updatedAt: number
  config: {
    page: VisionFilePageSet
    editor?: {}
  }
  elements: ElementProps[]
  assets?: VisionFileAsset[]
}

export type EditorExecutor = (type: VisionEventType, data?: VisionEventData) => void

export interface HistoryNodeLike {
  id: number
  prev: HistoryNodeLike | null
  next: HistoryNodeLike | null
  label?: string
  data: {
    type: string
  }
}

export interface EditorDocumentState {
  document: ReturnType<typeof createEditorDocumentFromFile>
  file: VisionFileType | null
  hasFile: boolean
}

export interface EditorRuntimeState {
  canvas: {
    Renderer: CanvasRendererCompat
    OverlayRenderer?: CanvasOverlayRendererCompat
    document: ReturnType<typeof createEditorDocumentFromFile>
    shapes: SceneShapeSnapshot[]
    stats: CanvasRuntimeBridgeState<ReturnType<typeof createEditorDocumentFromFile>>['stats']
    viewport: CanvasRuntimeBridgeState<ReturnType<typeof createEditorDocumentFromFile>>['viewport']
    ready: boolean
    onPointerMove: (point: {x: number; y: number}) => void
    onPointerDown: (
      point: {x: number; y: number},
      modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
    ) => void
    onPointerUp: () => void
    onPointerLeave: () => void
    onViewportChange: (viewport: CanvasViewportState) => void
    onViewportPan: (deltaX: number, deltaY: number) => void
    onViewportResize: (width: number, height: number) => void
    onViewportZoom: (nextScale: number, anchor?: {x: number; y: number}) => void
    onContextMenu: (position: {x: number; y: number}) => void
  }
  currentTool: ToolName
  focused: boolean
  history: HistorySummary
  selectedShape: SceneShapeSnapshot | null
  viewportScale: number
}

export interface EditorUIState {
  copiedItems: ElementProps[]
  hasUnsavedChanges: boolean
  historyItems: HistoryNodeLike[]
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
  layerItems: LayerItem[]
  selectedIds: string[]
  selectedProps: SelectedElementProps | null
  showCreateFile: boolean
  showPrint: boolean
  viewportScale: number
}

export interface LayerItem {
  id: string
  name: string
  show: boolean
  type: string
  depth: number
  isGroup: boolean
}

export interface SelectedImageMeta {
  assetId?: string
  assetName?: string
  mimeType?: string
  naturalWidth?: number
  naturalHeight?: number
}

export interface SelectedSchemaMeta {
  sourceNodeType?: string
  sourceNodeKind?: string
  sourceFeatureKinds?: string[]
}

export type SelectedElementProps = ElementProps & {
  imageMeta?: SelectedImageMeta
  schemaMeta?: SelectedSchemaMeta
}

export interface EditorRuntimeCommands {
  executeAction: EditorExecutor
  saveFile: VoidFunction
  createFile: (nextFile: VisionFileType) => void
  addAsset: (asset: VisionFileAsset) => void
  handleCreating: (value: boolean) => void
  startCreateFile: VoidFunction
  setCurrentTool: (toolName: ToolName) => void
  pickHistory: (historyNode: {id: number}) => void
  openDroppedFile: (droppedFile: File) => Promise<void>
  setShowPrint: React.Dispatch<React.SetStateAction<boolean>>
}

export interface EditorRuntimeRefs {
  contextRootRef: React.RefObject<HTMLDivElement | null>
  worldPointRef: React.RefObject<PointRef | null>
  editorRef: React.RefObject<{ printOut?: (ctx: CanvasRenderingContext2D) => void } | null>
}
