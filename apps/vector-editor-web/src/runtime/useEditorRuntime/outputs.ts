import type {PointRef} from '../../views/statusBar/StatusBar.tsx'
import type {MutableRefObject, RefObject} from 'react'
import type * as React from 'react'
import type {RuntimeEditingMode} from '../index.ts'
import type {ToolName} from '../model/index.ts'
import type {
  EditorDocumentState,
  EditorRuntimeCommands,
  EditorRuntimeRefs,
  EditorRuntimeState,
  SelectedElementProps,
} from './types.ts'

/**
 * Builds stable runtime/document/command/ref payload slices returned by useEditorRuntime.
 * @param input Runtime orchestration state required to construct return payloads.
 */
export function buildUseEditorRuntimeOutputs(input: {
  canvasRuntime: any
  file: any
  hasFile: boolean
  RuntimeRenderer: any
  OverlayRenderer: any
  interactionDocument: any
  previewShapes: any[]
  editingMode: RuntimeEditingMode
  transformPreviewActive: boolean
  cursorState: any
  selectionChrome: any
  isolationGroupId: string | null
  protectedNodeIds: string[]
  overlayInstructions: any[]
  previewInstructions: any[]
  engineOverlayNodes: any[]
  overlayDiagnostics: any
  guideHintLabels: string[]
  canvasInteractions: {
    onPointerMove: (point: {x: number; y: number}, metadata?: {screen: {x: number; y: number}; pointerId: number}) => void
    onPointerDown: (
      point: {x: number; y: number},
      modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
      metadata?: {screen: {x: number; y: number}; pointerId: number},
    ) => void
    onPointerUp: () => void
    onPointerLeave: () => void
    onViewportChange: (...args: any[]) => void
    onViewportPan: (...args: any[]) => void
    onViewportResize: (...args: any[]) => void
    onViewportZoom: (...args: any[]) => void
    onContextMenu: (...args: any[]) => void
  }
  currentTool: ToolName
  focused: boolean
  selectedShape: any
  executeAction: (action: any) => void
  saveFile: () => Promise<void> | void
  createFile: (...args: any[]) => any
  addAsset: (...args: any[]) => any
  setCurrentTool: (toolName: ToolName) => void
  setSnappingEnabled: React.Dispatch<React.SetStateAction<boolean>>
  pickHistory: (...args: any[]) => any
  openDroppedFile: (...args: any[]) => any
  setShowPrint: React.Dispatch<React.SetStateAction<boolean>>
  contextRootRef: RefObject<HTMLDivElement | null>
  worldPointRef: MutableRefObject<PointRef | null>
  editorRef: MutableRefObject<{ printOut?: (ctx: CanvasRenderingContext2D) => void } | null>
}) {
  const documentState: EditorDocumentState = {
    document: input.canvasRuntime.document,
    file: input.file,
    hasFile: input.hasFile,
  }

  const runtimeState: EditorRuntimeState = {
    canvas: {
      Renderer: input.RuntimeRenderer,
      OverlayRenderer: input.OverlayRenderer,
      document: input.interactionDocument,
      shapes: input.previewShapes,
      stats: input.canvasRuntime.stats,
      viewport: input.canvasRuntime.viewport,
      editingMode: input.editingMode,
      transformPreviewActive: input.transformPreviewActive,
      cursor: input.cursorState.cursor,
      cursorState: input.cursorState,
      selectionChrome: input.selectionChrome,
      isolationGroupId: input.isolationGroupId,
      ready: input.canvasRuntime.ready,
      protectedNodeIds: input.protectedNodeIds,
      overlayInstructions: input.overlayInstructions,
      previewInstructions: input.previewInstructions,
      overlayNodes: input.engineOverlayNodes,
      overlayDiagnostics: input.overlayDiagnostics,
      guideHintLabels: input.guideHintLabels,
      onPointerMove: input.canvasInteractions.onPointerMove,
      onPointerDown: input.canvasInteractions.onPointerDown,
      onPointerUp: input.canvasInteractions.onPointerUp,
      onPointerLeave: input.canvasInteractions.onPointerLeave,
      onViewportChange: input.canvasInteractions.onViewportChange,
      onViewportPan: input.canvasInteractions.onViewportPan,
      onViewportResize: input.canvasInteractions.onViewportResize,
      onViewportZoom: input.canvasInteractions.onViewportZoom,
      onContextMenu: input.canvasInteractions.onContextMenu,
    },
    currentTool: input.currentTool,
    editingMode: input.editingMode,
    focused: input.focused,
    history: input.canvasRuntime.history,
    selectedShape: input.selectedShape,
    viewportScale: input.canvasRuntime.viewport.scale,
  }

  const commands: EditorRuntimeCommands = {
    executeAction: input.executeAction,
    saveFile: input.saveFile,
    createFile: input.createFile,
    addAsset: input.addAsset,
    setCurrentTool: input.setCurrentTool,
    setSnappingEnabled: input.setSnappingEnabled,
    pickHistory: input.pickHistory,
    openDroppedFile: input.openDroppedFile,
    setShowPrint: input.setShowPrint,
  }

  const refs: EditorRuntimeRefs = {
    contextRootRef: input.contextRootRef,
    worldPointRef: input.worldPointRef,
    editorRef: input.editorRef,
  }

  return {
    documentState,
    runtimeState,
    commands,
    refs,
  }
}

export interface BuildUseEditorRuntimeUiStateInput<TUiState> {
  uiState: TUiState
  selectedProps: SelectedElementProps | null
  snappingEnabled: boolean
}

/**
 * Merges selected props and snapping state into derived UI state.
 * @param input Base UI state and supplemental fields.
 */
export function buildUseEditorRuntimeUiState<TUiState extends object>(
  input: BuildUseEditorRuntimeUiStateInput<TUiState>,
) {
  return {
    ...input.uiState,
    selectedProps: input.selectedProps,
    snappingEnabled: input.snappingEnabled,
  }
}
