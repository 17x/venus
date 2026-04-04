import {buildHistoryArray, buildSelectedProps} from './editorRuntimeHelpers.ts'
import type {EditorUIState} from './useEditorRuntime.types.ts'
import type {DocumentNode} from '@venus/document-core'
import type {useCanvasRuntime} from '@venus/canvas-base'
import type {ElementProps} from '@lite-u/editor/types'

/**
 * Centralizes UI-facing derived data so panels and menus don't each invent
 * their own projection of runtime state.
 */
export function deriveEditorUIState(options: {
  canvasRuntime: ReturnType<typeof useCanvasRuntime>
  clipboard: ElementProps[]
  selectedNode: DocumentNode | null
  selectedShapeId: string | null
  showCreateFile: boolean
  showPrint: boolean
}): EditorUIState {
  const {
    canvasRuntime,
    clipboard,
    selectedNode,
    selectedShapeId,
    showCreateFile,
    showPrint,
  } = options

  return {
    copiedItems: clipboard,
    hasUnsavedChanges: canvasRuntime.history.entries.length > 0,
    historyItems: buildHistoryArray(canvasRuntime.history),
    historyStatus: {
      id: canvasRuntime.history.cursor,
      hasPrev: canvasRuntime.history.canUndo,
      hasNext: canvasRuntime.history.canRedo,
    },
    layerItems: canvasRuntime.shapes.map((shape) => {
      const source = canvasRuntime.document.shapes.find((node) => node.id === shape.id)
      return {
        id: shape.id,
        name: source?.text ?? source?.name ?? shape.id,
        show: true,
      }
    }),
    selectedIds: selectedShapeId ? [selectedShapeId] : [],
    selectedProps: buildSelectedProps(selectedNode),
    showCreateFile,
    showPrint,
    viewportScale: canvasRuntime.viewport.scale,
  }
}
