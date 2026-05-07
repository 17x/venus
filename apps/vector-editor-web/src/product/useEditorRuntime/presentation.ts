import {useMemo, type MutableRefObject} from 'react'
import {resolveRuntimeCursor} from '../../runtime/index.ts'
import type {RuntimeEditingMode} from '../../runtime/index.ts'
import type {RuntimeCursorHandleKind} from '../../runtime/cursor/resolveRuntimeCursor.ts'
import type {CursorIntent} from '@venus/editor-primitive'
import {deriveEditorUIState} from '../deriveEditorUIState.ts'
import {resolveSelectedProps} from './helpers.ts'
import {useEditorRuntimeBridgeSync} from '../runtime/useEditorRuntimeBridgeSync.ts'
import type {SelectedElementProps} from './types.ts'

/**
 * Computes runtime cursor state from tool, transform, and overlay hints.
 * @param input Cursor computation inputs.
 */
export function useEditorRuntimeCursorState(input: {
  runtimeToolRegistryRef: MutableRefObject<{get: (tool: string) => {getCursor?: () => unknown} | undefined}>
  currentTool: string
  selectedNode: {id: string; rotation?: number} | null
  transformPreview: {shapes: Array<{shapeId: string; rotation?: number}>} | null
  pathSubSelection: {hitType?: string | null} | null
  pathSubSelectionHover: {hitType?: string | null} | null
  overlayInstructions: Array<{hitRegion?: string; cursor?: CursorIntent}>
  editingMode: RuntimeEditingMode
  activeTransformHandle: RuntimeCursorHandleKind | null
  hoveredTransformHandle: RuntimeCursorHandleKind | null
}) {
  const activeToolCursor = input.runtimeToolRegistryRef.current.get(input.currentTool)?.getCursor?.() as string | undefined

  const activeRotation = useMemo(() => {
    if (!input.selectedNode) {
      return 0
    }

    const previewRotation = input.transformPreview?.shapes.find((shape) => shape.shapeId === input.selectedNode?.id)?.rotation
    if (typeof previewRotation === 'number') {
      return previewRotation
    }

    return input.selectedNode.rotation ?? 0
  }, [input.selectedNode, input.transformPreview])

  const overlayCursorIntent = useMemo(() => {
    const hoverHitType = (input.pathSubSelectionHover ?? input.pathSubSelection)?.hitType
    if (!hoverHitType) {
      return null
    }

    const targetHitRegion =
      hoverHitType === 'anchorPoint'
        ? 'path-anchor'
        : hoverHitType === 'segment'
          ? 'path-segment'
          : 'path-handle'

    for (let index = input.overlayInstructions.length - 1; index >= 0; index -= 1) {
      const instruction = input.overlayInstructions[index]
        if (instruction.hitRegion === targetHitRegion && instruction.cursor) {
          return instruction.cursor
      }
    }

    return null
  }, [input.overlayInstructions, input.pathSubSelection, input.pathSubSelectionHover])

  const resolvedPathHitType = useMemo<'anchorPoint' | 'segment' | 'inHandle' | 'outHandle' | null>(() => {
    const hitType = (input.pathSubSelectionHover ?? input.pathSubSelection)?.hitType
    if (hitType === 'anchorPoint' || hitType === 'segment' || hitType === 'inHandle' || hitType === 'outHandle') {
      return hitType
    }
    return null
  }, [input.pathSubSelection, input.pathSubSelectionHover])

  return useMemo(() => resolveRuntimeCursor({
    toolCursor: activeToolCursor,
    editingMode: input.editingMode,
    activeHandle: input.activeTransformHandle ?? input.hoveredTransformHandle,
    rotationDegrees: activeRotation,
    pathHitType: resolvedPathHitType,
    overlayCursorIntent,
  }), [
    activeRotation,
    activeToolCursor,
    input.activeTransformHandle,
    input.editingMode,
    input.hoveredTransformHandle,
    resolvedPathHitType,
    overlayCursorIntent,
  ])
}

/**
 * Derives UI state, selected props, and synchronizes runtime bridge diagnostics snapshots.
 * @param input Dependencies required for UI derivation and runtime sync.
 */
export function useEditorRuntimeUiStateAndSync(input: {
  canvasRuntime: any
  clipboard: any[]
  selectedNode: any
  selectedShapeIds: string[]
  showPrint: boolean
  file: any
  setLastCommandType: (commandType: string | null) => void
  setSelectedShapeIds: (ids: string[]) => void
  setShellSelectedCount: (count: number) => void
  setShellLayerCount: (count: number) => void
  dispatchRuntimeEvent: (event: any) => void
}) {
  const uiState = deriveEditorUIState({
    canvasRuntime: input.canvasRuntime,
    clipboard: input.clipboard,
    selectedNode: input.selectedNode,
    selectedIds: input.selectedShapeIds,
    showPrint: input.showPrint,
  })

  const selectedProps: SelectedElementProps | null = useMemo(() => resolveSelectedProps(
    uiState.selectedProps,
    input.selectedNode,
    input.file,
  ), [input.file, input.selectedNode, uiState.selectedProps])

  useEditorRuntimeBridgeSync({
    fileId: input.file?.id,
    setLastCommandType: input.setLastCommandType,
    selectedShapeIds: input.selectedShapeIds,
    layerItemCount: uiState.layerItems.length,
    setSelectedShapeIds: input.setSelectedShapeIds,
    setShellSelectedCount: input.setShellSelectedCount,
    setShellLayerCount: input.setShellLayerCount,
    dispatchRuntimeEvent: input.dispatchRuntimeEvent,
    runtimeV2: {
      checks: input.canvasRuntime.runtimeV2.checks,
      mismatches: input.canvasRuntime.runtimeV2.mismatches,
      lastCommandType: input.canvasRuntime.runtimeV2.lastCommandType,
      lastIssues: input.canvasRuntime.runtimeV2.lastIssues,
      frameBoundaryChecks: input.canvasRuntime.runtimeV2.frameBoundaryChecks,
      frameBoundaryMismatches: input.canvasRuntime.runtimeV2.frameBoundaryMismatches,
      lastFrameBoundaryIssues: input.canvasRuntime.runtimeV2.lastFrameBoundaryIssues,
      strictModeEnabled: input.canvasRuntime.runtimeV2.strictModeEnabled,
    },
  })

  return {
    uiState,
    selectedProps,
  }
}
