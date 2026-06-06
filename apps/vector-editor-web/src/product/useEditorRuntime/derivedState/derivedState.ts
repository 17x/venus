import {createElement, useMemo, useRef} from 'react'
import type {EditorDocument} from '../../../runtime/model/index.ts'
import type {RuntimeEditingMode} from '../../../runtime/index.ts'
import type {
  EditorFileHistoryRecoveryReplayMode,
  EditorFileHistoryRecoveryReplaySnapshot,
} from '../../../runtime/types/editorFile.ts'
import {
  createRuntimeSelectionChromeRegistry,
} from '../../../runtime/index.ts'
import {EngineRenderer} from '../../../runtime/engine-bridge/index.tsx'
import type {OverlayDiagnostics} from '../../../runtime/engine-bridge/index.tsx'
import {
  buildSelectionState,
  resolveMaskSelectionPresentationIds,
} from '../../../runtime/interaction/index.ts'
import {resolveTransformPreviewRuntimeState, type SnapGuide} from '../../../runtime/interaction/index.ts'
import type {
  DraftPrimitive,
  PathSubSelection,
  TransformPreview,
} from '../../../runtime/interaction/index.ts'
import {useCanvasRuntimeBridge} from '../../useCanvasRuntimeBridge.ts'
import {useTransformPreviewCommitBridge} from '../../useTransformPreviewCommitBridge.ts'
import {
  filterDocumentToShapeSet,
  filterSnapshotsToShapeSet,
  resolveIsolationShapeIdSet,
  resolvePathHandlePreviewDocument,
} from '../helpers.ts'
import type {SelectorOverlayItem} from '@venus/editor-primitive'
import {
  type ShapeStyleHandleDrag,
} from '../../runtime/shapeStyleHandles.ts'
import {resolveRuntimeEffectiveSnapGuides} from '../../runtime/snappingPolicy.ts'
import {
  DEFAULT_PRESENTATION_CONFIG,
  DEFAULT_SELECTION_CONFIG,
  SCENE_CAPACITY,
  resolveGeometryHintPointer,
  resolveHoveredDisplayShapeId,
  resolveShapeStylePreviewDocument,
} from './derivedState.shared.ts'
import {useEditorRuntimeDerivedStateOverlays} from './derivedState.overlays.ts'
import {collectProjectionDiagnostics} from './derivedState.projectionDiagnostics.ts'

/**
 * Derives renderer/overlay interaction state from runtime snapshots for editor product hooks.
 * @param options Runtime/product state inputs consumed by derived-state composition.
 */
export function useEditorRuntimeDerivedState(options: {
  document: EditorDocument
  crashRecoveryReplay?: EditorFileHistoryRecoveryReplaySnapshot
  crashRecoveryReplayMode?: EditorFileHistoryRecoveryReplayMode
  editingMode: RuntimeEditingMode
  isolationGroupId: string | null
  onContextMenu?: (position: {x: number; y: number}) => void
  hoveredShapeId: string | null
  activeTransformHandle: string | null
  snapGuides: SnapGuide[]
  pathSubSelection: PathSubSelection | null
  pathSubSelectionHover: PathSubSelection | null
  draftPrimitive: DraftPrimitive | null
  penDraftPoints: Array<{x: number; y: number}> | null
  pathHandleDrag: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null
  shapeStyleHandleDrag: ShapeStyleHandleDrag | null
  // Stores pointer-selector-owned overlay descriptors emitted by editor-primitive.
  selectorOverlayItems: SelectorOverlayItem[]
  createWorker: () => Worker
}) {
  const {
    document,
    crashRecoveryReplay,
    crashRecoveryReplayMode,
    editingMode,
    isolationGroupId,
    onContextMenu,
    hoveredShapeId,
    activeTransformHandle,
    snapGuides,
    pathSubSelection,
    pathSubSelectionHover,
    draftPrimitive,
    penDraftPoints,
    pathHandleDrag,
    shapeStyleHandleDrag,
    selectorOverlayItems,
    createWorker,
  } = options
  const runtimeBridgeOptions = useMemo(() => {
    return {
      capacity: Math.max(SCENE_CAPACITY, document.shapes.length + 8),
      createWorker,
      document,
      crashRecoveryReplay,
      crashRecoveryReplayMode,
      allowFrameSelection: false,
      selection: DEFAULT_SELECTION_CONFIG,
      presentation: DEFAULT_PRESENTATION_CONFIG,
      onContextMenu,
    }
  }, [crashRecoveryReplay, crashRecoveryReplayMode, createWorker, document, onContextMenu])

  const {
    runtime: canvasRuntime,
    interactions: defaultCanvasInteractions,
    presentation: runtimePresentation,
  } = useCanvasRuntimeBridge(runtimeBridgeOptions)

  const RuntimeRenderer = useMemo(() => {
    // Wrap runtime renderer so hook consumers stay decoupled from adapter internals.
    return function RuntimeEngineRenderer(props: Parameters<typeof EngineRenderer>[0]) {
      return createElement(EngineRenderer, props)
    }
  }, [])

  const {
    preview: transformPreview,
    setPreview: setTransformPreview,
    clearPreview: clearTransformPreview,
    markCommitPending: markTransformPreviewCommitPending,
  } = useTransformPreviewCommitBridge<TransformPreview['shapes'][number]>({
    documentShapes: canvasRuntime.document.shapes,
  })

  const selectedShape = canvasRuntime.stats.selectedIndex >= 0
    ? canvasRuntime.shapes[canvasRuntime.stats.selectedIndex] ?? null
    : null
  const selectedShapeIdsRef = useRef<string[]>([])
  const runtimeShapeById = useMemo(
    () => new Map(canvasRuntime.shapes.map((shape) => [shape.id, shape])),
    [canvasRuntime.shapes],
  )
  const selectedShapeIds = useMemo(() => {
    const next = canvasRuntime.shapes
      .filter((shape) => shape.isSelected)
      .map((shape) => shape.id)
    const current = selectedShapeIdsRef.current
    const unchanged = current.length === next.length && current.every((id, index) => id === next[index])
    if (unchanged) {
      return current
    }
    selectedShapeIdsRef.current = next
    return next
  }, [canvasRuntime.shapes])
  const selectedNode = selectedShape
    ? canvasRuntime.document.shapes.find((shape) => shape.id === selectedShape.id) ?? null
    : null
  const selectedShapeId = selectedShape?.id ?? null
  const previewState = useMemo(() => resolveTransformPreviewRuntimeState(
    canvasRuntime.document,
    canvasRuntime.shapes,
    transformPreview?.shapes ?? null,
    {includeClipBoundImagePreview: true},
  ), [canvasRuntime.document, canvasRuntime.shapes, transformPreview])
  const isolationVisibleIds = useMemo(() => resolveIsolationShapeIdSet({
    shapes: previewState.previewDocument.shapes,
    groupId: isolationGroupId,
  }), [isolationGroupId, previewState.previewDocument.shapes])
  // Isolation is a runtime-only filter over the preview scene so engine and UI
  // can reuse the same document model while narrowing interaction scope.
  const previewDocument = useMemo(
    () => filterDocumentToShapeSet(previewState.previewDocument, isolationVisibleIds),
    [isolationVisibleIds, previewState.previewDocument],
  )
  const previewShapes = useMemo(
    () => filterSnapshotsToShapeSet(previewState.previewShapes, isolationVisibleIds),
    [isolationVisibleIds, previewState.previewShapes],
  )
  const interactionDocument = useMemo(() => resolvePathHandlePreviewDocument(
    previewDocument,
    pathHandleDrag,
    pathSubSelectionHover,
  ), [pathHandleDrag, pathSubSelectionHover, previewDocument])
  const stylePreviewDocument = useMemo(() => resolveShapeStylePreviewDocument(
    interactionDocument,
    shapeStyleHandleDrag,
  ), [interactionDocument, shapeStyleHandleDrag])
  const previewShapeById = useMemo(
    () => new Map(stylePreviewDocument.shapes.map((shape) => [shape.id, shape])),
    [stylePreviewDocument.shapes],
  )
  const transformPreviewActive = useMemo(() => {
    // Keep one shared continuous-preview flag so drag/resize/rotate and
    // property-handle drags all stay in preview mode until pointer-up commit.
    return Boolean(
      (transformPreview?.shapes?.length ?? 0) > 0 ||
      pathHandleDrag ||
      shapeStyleHandleDrag,
    )
  }, [pathHandleDrag, shapeStyleHandleDrag, transformPreview?.shapes])

  const selectionState = useMemo(
    () => buildSelectionState(stylePreviewDocument, previewShapes),
    [previewShapes, stylePreviewDocument],
  )
  const hasPathEditActivity = Boolean(
    pathSubSelection ||
    pathSubSelectionHover ||
    pathHandleDrag,
  )
  const hasDraftOverlayActivity = Boolean(
    draftPrimitive ||
    ((penDraftPoints?.length ?? 0) > 1),
  )
  const overlayInteractionDegraded = useMemo(() => {
    // Keep path/draft overlays available; degrade expensive hover/guide visuals during motion-heavy modes.
    if (hasPathEditActivity || hasDraftOverlayActivity) {
      return false
    }

    return editingMode === 'dragging' ||
      editingMode === 'resizing' ||
      editingMode === 'rotating' ||
      editingMode === 'drawingPath' ||
      editingMode === 'drawingPencil' ||
      editingMode === 'insertingShape'
  }, [editingMode, hasDraftOverlayActivity, hasPathEditActivity])
  const effectiveHoveredShapeId = overlayInteractionDegraded
    ? null
    : hoveredShapeId
  const hoverDisplayShapeId = useMemo(() => resolveHoveredDisplayShapeId(
    interactionDocument,
    effectiveHoveredShapeId,
  ), [effectiveHoveredShapeId, interactionDocument])
  const reducedSnapGuides = useMemo(() => resolveRuntimeEffectiveSnapGuides({
    guides: snapGuides,
    overlayInteractionDegraded,
    selectedBounds: selectionState.selectedBounds,
  }), [overlayInteractionDegraded, selectionState.selectedBounds, snapGuides])
  const effectiveSnapGuides = reducedSnapGuides.guides
  const overlayGuideSelectionStrategy = reducedSnapGuides.strategy
  const activePathSubSelection = pathSubSelectionHover ?? pathSubSelection
  const selectionChromeRegistry = useMemo(() => createRuntimeSelectionChromeRegistry(), [])
  const selectionChrome = useMemo(() => selectionChromeRegistry.resolve({
    nodeType: selectedNode?.type ?? null,
    editingMode,
    isMaskedImageHost: selectedNode?.type === 'image' && Boolean(selectedNode.clipPathId),
    isMaskSource: selectedNode?.schema?.maskRole === 'source',
  }), [editingMode, selectedNode, selectionChromeRegistry])
  const activePathShape = useMemo(() => {
    if (!activePathSubSelection) {
      return null
    }
    const shape = previewShapeById.get(activePathSubSelection.shapeId)
    if (!shape || shape.type !== 'path') {
      return null
    }
    return shape
  }, [activePathSubSelection, previewShapeById])

  const geometryHintPointer = useMemo(() => resolveGeometryHintPointer(
    activePathSubSelection,
    activePathShape,
  ), [activePathShape, activePathSubSelection])
  const selectionPresentationShapeIds = useMemo(
    () => resolveMaskSelectionPresentationIds(interactionDocument, selectedShapeIds),
    [interactionDocument, selectedShapeIds],
  )

  const hoveredGeometryShape = useMemo(() => (
    hoverDisplayShapeId ? previewShapeById.get(hoverDisplayShapeId) ?? null : null
  ), [hoverDisplayShapeId, previewShapeById])

  const geometryOutlineLevel = useMemo<'low' | 'medium' | 'high'>(() => {
    if (hasPathEditActivity) {
      return 'high'
    }

    // Keep ellipse/circle hover contour always on high sampling so outline
    // stays precise at any zoom and transform state.
    if (hoveredGeometryShape?.type === 'ellipse') {
      return 'high'
    }

    return 'medium'
  }, [hasPathEditActivity, hoveredGeometryShape])

  const engineGeometryPayload = useMemo(() => canvasRuntime.requestEngineGeometry({
    nodes: interactionDocument.shapes,
    hoveredNodeId: hoverDisplayShapeId,
    selectedNodeIds: selectionPresentationShapeIds,
    pointer: geometryHintPointer,
    tolerance: 6,
    outlineLevel: geometryOutlineLevel,
    marqueeBounds: null,
  }), [
    canvasRuntime,
    geometryOutlineLevel,
    geometryHintPointer,
    hoverDisplayShapeId,
    interactionDocument,
    selectionPresentationShapeIds,
  ])

  const projectionDiagnostics = useMemo(() => collectProjectionDiagnostics({
    selectedBounds: selectionState.selectedBounds,
    selectedGeometryPayloads: engineGeometryPayload.selected,
  }), [engineGeometryPayload.selected, selectionState.selectedBounds])

  const overlayDiagnostics = useMemo<OverlayDiagnostics>(() => ({
    degraded: overlayInteractionDegraded,
    guideInputCount: snapGuides.length,
    guideKeptCount: effectiveSnapGuides.length,
    guideDroppedCount: Math.max(0, snapGuides.length - effectiveSnapGuides.length),
    guideSelectionStrategy: overlayGuideSelectionStrategy,
    pathEditWhitelistActive: hasPathEditActivity,
    projectionDiagnostics,
  }), [
    effectiveSnapGuides.length,
    hasPathEditActivity,
    overlayGuideSelectionStrategy,
    overlayInteractionDegraded,
    projectionDiagnostics,
    snapGuides.length,
  ])

  const {
    overlayInstructions,
    previewInstructions,
    guideHintLabels,
    engineOverlayNodes,
    protectedNodeIds,
  } = useEditorRuntimeDerivedStateOverlays({
    canvasRuntime,
    editingMode,
    transformPreviewActive,
    selectedShapeIds,
    selectionPresentationShapeIds,
    selectedNode,
    selectionState,
    interactionDocument,
    previewShapeById,
    shapeStyleHandleDrag,
    engineGeometryPayload,
    selectorOverlayItems,
    effectiveSnapGuides,
    activeTransformHandle,
    activePathSubSelection,
    activePathShape,
    pathSubSelection,
    pathSubSelectionHover,
    pathHandleDrag,
    shapeStyleHandleDragForProtection: shapeStyleHandleDrag,
    transformPreview,
    hoverDisplayShapeId,
  })

  return {
    canvasRuntime,
    defaultCanvasInteractions,
    runtimePresentation,
    // Keep renderer component identity stable so hover-only overlay updates
    // cannot remount the engine canvas and thrash width/height state.
    RuntimeRenderer,
    transformPreview,
    setTransformPreview,
    clearTransformPreview,
    markTransformPreviewCommitPending,
    selectedShape,
    selectedShapeId,
    selectedNode,
    runtimeShapeById,
    selectedShapeIds,
    previewDocument,
    previewShapes,
    interactionDocument: stylePreviewDocument,
    previewShapeById,
    selectionState,
    transformPreviewActive,
    selectionChrome,
    overlayInstructions,
    previewInstructions,
    guideHintLabels,
    selectedGeometryPayload: engineGeometryPayload.selected,
    marqueeCandidateNodeIds: engineGeometryPayload.marqueeCandidateNodeIds,
    overlayDiagnostics,
    protectedNodeIds,
    OverlayRenderer: undefined,
    engineOverlayNodes,
  }
}
