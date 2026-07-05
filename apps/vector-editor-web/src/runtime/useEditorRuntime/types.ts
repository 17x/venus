import type * as React from 'react'
import type {ToolName} from '../model/index.ts'
import type {CanvasViewportState} from '../index.ts'
import type {RuntimeEditingMode} from '../index.ts'
import type {RuntimeOverlayInstruction, RuntimePreviewInstruction} from '../index.ts'
import type {RuntimeCursorState, RuntimeSelectionChromeState} from '../index.ts'
import type {
  OverlayDiagnostics,
  EngineOverlayRenderer as EngineOverlayRendererCompat,
  EngineRendererComponent as EngineRendererComponentCompat,
} from '../engine-bridge/index.tsx'
import type {EngineOverlayDrawNode} from '../engine-bridge/engine.ts'
import type {CanvasRuntimeBridgeState} from '../useCanvasRuntimeBridge.ts'
import type {
  ElementProps,
  EditorEventData,
  EditorEventType,
} from '../types/index.ts'
import type {PointRef} from '../../views/statusBar/StatusBar.tsx'
import type {createEditorDocumentFromFile} from '../adapters/fileDocument/fileDocument.ts'
import type {SceneShapeSnapshot} from '../shared-memory/index.ts'
import type {HistorySummary} from '../worker/index.ts'
import type {
  EditorFileAsset,
  EditorFileDocument,
  EditorFilePageSpec,
} from '../types/index.ts'

export type {
  EditorFileAsset,
  EditorFileDocument,
  EditorFilePageSpec,
}

export type EditorExecutor = (type: EditorEventType, data?: EditorEventData) => void

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
  file: EditorFileDocument | null
  hasFile: boolean
}

export interface EditorRuntimeState {
  canvas: {
    // Keep compat aliases local to hook state to avoid leaking adapter implementation names.
    Renderer: EngineRendererComponentCompat
    OverlayRenderer?: EngineOverlayRendererCompat
    document: ReturnType<typeof createEditorDocumentFromFile>
    shapes: SceneShapeSnapshot[]
    stats: CanvasRuntimeBridgeState<ReturnType<typeof createEditorDocumentFromFile>>['stats']
    viewport: CanvasRuntimeBridgeState<ReturnType<typeof createEditorDocumentFromFile>>['viewport']
    editingMode: RuntimeEditingMode
    // Keeps canvas renderer in preview interaction phase for continuous property edits.
    transformPreviewActive?: boolean
    cursor?: string
    cursorState?: RuntimeCursorState
    selectionChrome?: RuntimeSelectionChromeState
    isolationGroupId?: string | null
    ready: boolean
    protectedNodeIds?: readonly string[]
    overlayInstructions?: RuntimeOverlayInstruction[]
    previewInstructions?: RuntimePreviewInstruction[]
    overlayNodes?: readonly EngineOverlayDrawNode[]
    overlayDiagnostics?: OverlayDiagnostics
    /** Stores engine-driven hover guide labels (e.g. line/anchor hints) for product text rendering. */
    guideHintLabels?: readonly string[]
    onPointerMove: (point: {x: number; y: number}, metadata?: {screen: {x: number; y: number}; pointerId: number}) => void
    onPointerDown: (
      point: {x: number; y: number},
      modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
      metadata?: {screen: {x: number; y: number}; pointerId: number},
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
  editingMode: RuntimeEditingMode
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
  snappingEnabled: boolean
  showPrint: boolean
  viewportScale: number
}

/** Layer item representing one node in the document tree. Depth encodes nesting level. */
export interface LayerItem {
  id: string
  name: string
  show: boolean
  isVisible?: boolean
  isLocked?: boolean
  type: string
  /** Nesting depth (0 = root). Tree structure encoded via depth-based indentation. */
  depth: number
  /** Whether this node is a container (group, frame, clip, mask). */
  isGroup: boolean
  /** Child layer items for tree-based consumers. Flat-rendered consumers use depth instead. */
  children?: LayerItem[]
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
  createFile: (nextFile: EditorFileDocument) => void
  addAsset: (asset: EditorFileAsset) => void
  setCurrentTool: (toolName: ToolName) => void
  setSnappingEnabled: React.Dispatch<React.SetStateAction<boolean>>
  pickHistory: (historyNode: {id: number}) => void
  openDroppedFile: (droppedFile: File) => Promise<void>
  setShowPrint: React.Dispatch<React.SetStateAction<boolean>>
}

export interface EditorRuntimeRefs {
  contextRootRef: React.RefObject<HTMLDivElement | null>
  worldPointRef: React.RefObject<PointRef | null>
  editorRef: React.RefObject<{ printOut?: (ctx: CanvasRenderingContext2D) => void } | null>
}
