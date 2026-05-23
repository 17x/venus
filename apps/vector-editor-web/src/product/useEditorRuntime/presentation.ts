import {useMemo, type MutableRefObject} from 'react'
import {resolveRuntimeCursor} from '../../runtime/index.ts'
import type {RuntimeEditingMode} from '../../runtime/index.ts'
import type {RuntimeCursorHandleKind} from '../../runtime/cursor/resolveRuntimeCursor.ts'
import type {CursorIntent} from '@venus/editor-primitive'
import {deriveEditorUIState} from '../deriveEditorUIState.ts'
import {resolveSelectedProps} from './helpers.ts'
import {useEditorRuntimeBridgeSync} from '../runtime/useEditorRuntimeBridgeSync.ts'
import {createEditorDocumentFromFile, createFileElementsFromDocument} from '../../runtime/adapters/fileDocument/fileDocument.ts'
import {createRuntimeSceneFromVisionFile} from '../../runtime/adapters/fileFormatScene.ts'
import {normalizeFile} from '../../runtime/adapters/readFileNormalize.ts'
import {runNormalizedGroupConsistencyQuickCheck} from '../../runtime/model/document-runtime/index.ts'
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
  setLastCommandMeta: (meta: import('../runtime/useEditorRuntimeInteractionBridge.ts').EditorRuntimeLastCommandMeta | null) => void
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

  const groupConsistencyQuickCheck = useMemo(() => {
    // Keep quick-check summary stable so debug panel can triage group consistency without scanning full diagnostics payloads.
    const quickCheck = runNormalizedGroupConsistencyQuickCheck(input.canvasRuntime.document)
    const uniqueCodes = Array.from(new Set(quickCheck.diagnostics.map((diagnostic) => diagnostic.code))).sort()

    return {
      valid: quickCheck.valid,
      diagnosticCount: quickCheck.diagnostics.length,
      codes: uniqueCodes,
    }
  }, [input.canvasRuntime.document])

  const adapterSnapshotGovernance = useMemo(() => {
    if (!input.file) {
      return {
        available: false,
        normalizeElementCount: 0,
        fileDocumentShapeCount: 0,
        fileFormatSceneRootCount: 0,
        roundTripElementCount: 0,
        consistent: true,
        mismatchCount: 0,
        riskLevel: 'low' as const,
        fieldDiffs: [],
        issues: [] as string[],
      }
    }

    try {
      // Re-run adapter chain on current file snapshot so debug panel can surface one compact governance view.
      const normalizedFile = normalizeFile(input.file)
      const runtimeDocument = createEditorDocumentFromFile(normalizedFile)
      const runtimeScene = createRuntimeSceneFromVisionFile(normalizedFile)
      const roundTripElements = createFileElementsFromDocument(runtimeDocument)

      const normalizeElementCount = normalizedFile.elements.length
      const fileDocumentShapeCount = runtimeDocument.shapes.length
      const fileFormatSceneRootCount = runtimeScene.nodes.length
      const roundTripElementCount = roundTripElements.length
      const expectedSceneRootBaseline = fileDocumentShapeCount > 0 ? 1 : 0

      // Keep diff rows stable and deterministic so runtime debug panel triage and contract tests share one source of truth.
      const fieldDiffs = [
        {
          field: 'normalize:fileDocument' as const,
          baseline: normalizeElementCount,
          observed: fileDocumentShapeCount,
          delta: fileDocumentShapeCount - normalizeElementCount,
          matches: fileDocumentShapeCount === normalizeElementCount,
        },
        {
          field: 'fileDocument:roundTrip' as const,
          baseline: fileDocumentShapeCount,
          observed: roundTripElementCount,
          delta: roundTripElementCount - fileDocumentShapeCount,
          matches: roundTripElementCount === fileDocumentShapeCount,
        },
        {
          field: 'fileDocument:sceneRoot' as const,
          baseline: expectedSceneRootBaseline,
          observed: fileFormatSceneRootCount,
          delta: fileFormatSceneRootCount - expectedSceneRootBaseline,
          matches: fileFormatSceneRootCount >= expectedSceneRootBaseline,
        },
      ]

      const issues: string[] = []
      if (!fieldDiffs[0].matches) {
        issues.push('adapter:fileDocument-shape-count-mismatch')
      }
      if (!fieldDiffs[1].matches) {
        issues.push('adapter:roundtrip-element-count-mismatch')
      }
      if (!fieldDiffs[2].matches) {
        issues.push('adapter:fileFormatScene-root-nodes-empty')
      }

      const mismatchCount = fieldDiffs.reduce((count, diffRow) => count + (diffRow.matches ? 0 : 1), 0)
      // Escalate risk levels by mismatch count so debug consumers can prioritize triage without parsing raw issue strings.
      const riskLevel: 'low' | 'medium' | 'high' = mismatchCount === 0
        ? 'low'
        : mismatchCount === 1
          ? 'medium'
          : 'high'

      return {
        available: true,
        normalizeElementCount,
        fileDocumentShapeCount,
        fileFormatSceneRootCount,
        roundTripElementCount,
        consistent: mismatchCount === 0,
        mismatchCount,
        riskLevel,
        fieldDiffs,
        issues,
      }
    } catch {
      return {
        available: false,
        normalizeElementCount: 0,
        fileDocumentShapeCount: 0,
        fileFormatSceneRootCount: 0,
        roundTripElementCount: 0,
        consistent: false,
        mismatchCount: 1,
        riskLevel: 'high' as const,
        fieldDiffs: [],
        issues: ['adapter:governance-evaluation-failed'],
      }
    }
  }, [input.file])

  useEditorRuntimeBridgeSync({
    fileId: input.file?.id,
    setLastCommandType: input.setLastCommandType,
    setLastCommandMeta: input.setLastCommandMeta,
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
      groupConsistencyQuickCheck,
      adapterSnapshotGovernance,
    },
  })

  return {
    uiState,
    selectedProps,
  }
}
