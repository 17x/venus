import type * as React from 'react'
import type {ToolName} from '@venus/document-core'
import type {useCanvasRuntime} from '@venus/canvas-base'
import {SkiaRenderer} from '@venus/renderer-skia'
import type {ElementProps, VisionEventData, VisionEventType} from '@lite-u/editor/types'
import type {PointRef} from '../components/statusBar/StatusBar.tsx'
import type {createEditorDocumentFromFile} from '../adapters/fileDocument.ts'
import type {SceneShapeSnapshot} from '@venus/shared-memory'
import type {HistorySummary} from '@venus/editor-worker'

export interface VisionFileAsset {
  id: string
  name: string
  type: string
  mimeType: string
  file?: File
  imageRef?: unknown
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
    Renderer: typeof SkiaRenderer
    document: ReturnType<typeof createEditorDocumentFromFile>
    shapes: SceneShapeSnapshot[]
    stats: ReturnType<typeof useCanvasRuntime>['stats']
    viewport: ReturnType<typeof useCanvasRuntime>['viewport']
    ready: boolean
    onPointerMove: (point: {x: number; y: number}) => void
    onPointerDown: (point: {x: number; y: number}) => void
    onPointerUp: () => void
    onPointerLeave: () => void
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
  layerItems: {id: string; name: string; show: boolean}[]
  selectedIds: string[]
  selectedProps: ElementProps | null
  showCreateFile: boolean
  showPrint: boolean
  viewportScale: number
}

export interface EditorRuntimeCommands {
  executeAction: EditorExecutor
  saveFile: VoidFunction
  createFile: (nextFile: VisionFileType) => void
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
