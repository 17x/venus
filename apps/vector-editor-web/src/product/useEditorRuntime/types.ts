import type * as React from 'react'
import type {ToolName} from '../../runtime/model/index.ts'
import type {CanvasViewportState} from '../../runtime/index.ts'
import type {RuntimeEditingMode} from '../../runtime/index.ts'
import type {RuntimeOverlayInstruction, RuntimePreviewInstruction} from '../../runtime/index.ts'
import type {RuntimeCursorState, RuntimeSelectionChromeState} from '../../runtime/index.ts'
import type {
  OverlayDiagnostics,
  EngineOverlayRenderer as EngineOverlayRendererCompat,
  EngineRendererComponent as EngineRendererComponentCompat,
} from '../../runtime/engine-bridge/index.tsx'
import type {EngineOverlayDrawNode} from '../../runtime/engine-bridge/engine.ts'
import type {CanvasRuntimeBridgeState} from '../useCanvasRuntimeBridge.ts'
import type {
  ElementProps,
  EditorEventData,
  EditorEventType,
} from '../../runtime/types/index.ts'
import type {PointRef} from '../../views/statusBar/StatusBar.tsx'
import type {createEditorDocumentFromFile} from '../../runtime/adapters/fileDocument/fileDocument.ts'
import type {SceneShapeSnapshot} from '../../runtime/shared-memory/index.ts'
import type {HistorySummary} from '../../runtime/worker/index.ts'
import type {
  EditorFileAsset,
  EditorFileDocument,
  EditorFilePageSpec,
} from '../../runtime/types/index.ts'

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

export interface LayerItem {
  id: string
  name: string
  show: boolean
  isVisible?: boolean
  isLocked?: boolean
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

/**
 * Declares field-level mixed-state flags for multi-selection inspector rendering.
 */
export interface SelectedMixedFields {
  /** Indicates fill enabled flag differs across selected shapes. */
  fillEnabled?: boolean
  /** Indicates fill color differs across selected shapes. */
  fillColor?: boolean
  /** Indicates stroke enabled flag differs across selected shapes. */
  strokeEnabled?: boolean
  /** Indicates stroke color differs across selected shapes. */
  strokeColor?: boolean
  /** Indicates stroke weight differs across selected shapes. */
  strokeWeight?: boolean
  /** Indicates stroke cap differs across selected shapes. */
  strokeCap?: boolean
  /** Indicates stroke join differs across selected shapes. */
  strokeJoin?: boolean
  /** Indicates stroke dashed mode differs across selected shapes. */
  strokeDashed?: boolean
  /** Indicates opacity differs across selected shapes. */
  opacity?: boolean
  /** Indicates corner radius differs across selected shapes. */
  cornerRadius?: boolean
  /** Indicates shadow enabled flag differs across selected shapes. */
  shadowEnabled?: boolean
  /** Indicates shadow color differs across selected shapes. */
  shadowColor?: boolean
  /** Indicates shadow X offset differs across selected shapes. */
  shadowOffsetX?: boolean
  /** Indicates shadow Y offset differs across selected shapes. */
  shadowOffsetY?: boolean
  /** Indicates shadow blur differs across selected shapes. */
  shadowBlur?: boolean
}

export type SelectedElementProps = ElementProps & {
  imageMeta?: SelectedImageMeta
  schemaMeta?: SelectedSchemaMeta
  mixedFields?: SelectedMixedFields
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
