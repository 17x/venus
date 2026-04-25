import {createElement, useMemo, useRef} from 'react'
import type {EditorDocument} from '@venus/document-core'
import type {RuntimeEditingMode} from '@vector/runtime'
import {
  buildRuntimePathEditInstructions,
  buildRuntimeOverlayInstructions,
  buildRuntimePreviewInstructions,
  createRuntimeSelectionChromeRegistry,
} from '@vector/runtime'
import {Canvas2DRenderer} from '../runtime/canvasAdapter.tsx'
import type {OverlayDiagnostics} from '../runtime/canvasAdapter.tsx'
import {buildSelectionState, InteractionOverlay} from '../interaction/index.ts'
import {resolveTransformPreviewRuntimeState, resolveMarqueeBounds, type MarqueeState, type SnapGuide} from '../../runtime/interaction/index.ts'
import type {
  DraftPrimitive,
  InteractionBounds,
  PathSubSelection,
  TransformPreview,
} from '../interaction/index.ts'
import {useCanvasRuntimeBridge} from './useCanvasRuntimeBridge.ts'
import {useTransformPreviewCommitBridge} from './useTransformPreviewCommitBridge.ts'
import {
  filterDocumentToShapeSet,
  filterSnapshotsToShapeSet,
  resolveIsolationShapeIdSet,
  resolvePathHandlePreviewDocument,
} from './useEditorRuntime.helpers.ts'

const SCENE_CAPACITY = 8192
const DEFAULT_SELECTION_CONFIG = {
  allowFrameSelection: false,
  input: {
    singleClick: 'replace',
    shiftClick: 'add',
    metaOrCtrlClick: 'toggle',
    altClick: 'subtract',
  },
  marquee: {
    enabled: true,
    defaultMatchMode: 'contain',
    shiftMatchMode: 'contain',
  },
} as const

const DEFAULT_PRESENTATION_CONFIG = {
  marquee: {
    fill: 'rgba(37, 99, 235, 0.12)',
    stroke: 'rgba(37, 99, 235, 0.95)',
  },
  overlay: {
    selectionStroke: '#2563eb',
    hoverStroke: 'rgba(14, 165, 233, 0.9)',
  },
} as const

export function useEditorRuntimeDerivedState(options: {
  document: EditorDocument
  editingMode: RuntimeEditingMode
  isolationGroupId: string | null
  onContextMenu?: (position: {x: number; y: number}) => void
  hoveredShapeId: string | null
  marquee: MarqueeState | null
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
  createWorker: () => Worker
}) {
  const {
    document,
    editingMode,
    isolationGroupId,
    onContextMenu,
    hoveredShapeId,
    marquee,
    activeTransformHandle,
    snapGuides,
    pathSubSelection,
    pathSubSelectionHover,
    draftPrimitive,
    penDraftPoints,
    pathHandleDrag,
    createWorker,
  } = options
  const runtimeBridgeOptions = useMemo(() => {
    return {
      capacity: Math.max(SCENE_CAPACITY, document.shapes.length + 8),
      createWorker,
      document,
      allowFrameSelection: false,
      selection: DEFAULT_SELECTION_CONFIG,
      presentation: DEFAULT_PRESENTATION_CONFIG,
      onContextMenu,
    }
  }, [createWorker, document, onContextMenu])

  const {
    runtime: canvasRuntime,
    interactions: defaultCanvasInteractions,
    presentation: runtimePresentation,
  } = useCanvasRuntimeBridge(runtimeBridgeOptions)

  const RuntimeRenderer = useMemo(() => {
    return function RuntimeCanvasRenderer(props: Parameters<typeof Canvas2DRenderer>[0]) {
      return createElement(Canvas2DRenderer, props)
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
  const shouldDeferTransformPreviewToOverlay =
    editingMode === 'dragging' ||
    editingMode === 'resizing' ||
    editingMode === 'rotating'
  const previewState = useMemo(() => resolveTransformPreviewRuntimeState(
    canvasRuntime.document,
    canvasRuntime.shapes,
    // Keep drag/resize/rotate visuals in preview overlay only so the main
    // scene snapshot stays stable during high-frequency transform gestures.
    shouldDeferTransformPreviewToOverlay
      ? null
      : transformPreview?.shapes ?? null,
    {includeClipBoundImagePreview: true},
  ), [canvasRuntime.document, canvasRuntime.shapes, shouldDeferTransformPreviewToOverlay, transformPreview])
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
  const isolationBackdropShapes = useMemo(
    () => isolationGroupId
      ? previewState.previewDocument.shapes.filter((shape) => !(isolationVisibleIds?.has(shape.id) ?? false))
      : [],
    [isolationGroupId, isolationVisibleIds, previewState.previewDocument.shapes],
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
  const previewShapeById = useMemo(
    () => new Map(interactionDocument.shapes.map((shape) => [shape.id, shape])),
    [interactionDocument.shapes],
  )

  const selectionState = useMemo(
    () => buildSelectionState(interactionDocument, previewShapes),
    [interactionDocument, previewShapes],
  )
  const hasPathEditActivity = Boolean(
    pathSubSelection ||
    pathSubSelectionHover ||
    pathHandleDrag,
  )
  const overlayInteractionDegraded = useMemo(() => {
    // Keep path-edit overlays available; degrade expensive hover/guide visuals during motion-heavy modes.
    if (hasPathEditActivity) {
      return false
    }

    return editingMode === 'panning' ||
      editingMode === 'zooming' ||
      editingMode === 'dragging' ||
      editingMode === 'resizing' ||
      editingMode === 'rotating' ||
      editingMode === 'drawingPath' ||
      editingMode === 'drawingPencil' ||
      editingMode === 'insertingShape'
  }, [editingMode, hasPathEditActivity])
  const effectiveHoveredShapeId = overlayInteractionDegraded
    ? null
    : hoveredShapeId
  const effectiveSnapGuides = useMemo(() => {
    if (!overlayInteractionDegraded) {
      return snapGuides
    }

    const selectedBounds = selectionState.selectedBounds
    if (!selectedBounds) {
      // No active moving/selected bounds: keep one stable guide per axis.
      const primaryGuideByAxis = new Map<SnapGuide['axis'], SnapGuide>()
      for (const guide of snapGuides) {
        if (!primaryGuideByAxis.has(guide.axis)) {
          primaryGuideByAxis.set(guide.axis, guide)
        }
      }
      return Array.from(primaryGuideByAxis.values())
    }

    const resolveAnchorValue = (guide: SnapGuide) => {
      if (guide.axis === 'x') {
        if (guide.kind === 'edge-min') {
          return selectedBounds.minX
        }
        if (guide.kind === 'edge-max') {
          return selectedBounds.maxX
        }
        return (selectedBounds.minX + selectedBounds.maxX) / 2
      }

      if (guide.kind === 'edge-min') {
        return selectedBounds.minY
      }
      if (guide.kind === 'edge-max') {
        return selectedBounds.maxY
      }
      return (selectedBounds.minY + selectedBounds.maxY) / 2
    }

    // Preserve coarse snapping readability under degraded overlays by keeping
    // the most relevant guide per axis for the current moving selection.
    const primaryGuideByAxis = new Map<SnapGuide['axis'], SnapGuide>()
    for (const guide of snapGuides) {
      const existing = primaryGuideByAxis.get(guide.axis)
      if (!existing) {
        primaryGuideByAxis.set(guide.axis, guide)
        continue
      }

      const existingDistance = Math.abs(resolveAnchorValue(existing) - existing.value)
      const nextDistance = Math.abs(resolveAnchorValue(guide) - guide.value)
      if (nextDistance < existingDistance) {
        primaryGuideByAxis.set(guide.axis, guide)
      }
    }
    return Array.from(primaryGuideByAxis.values())
  }, [overlayInteractionDegraded, selectionState.selectedBounds, snapGuides])
  const overlayGuideSelectionStrategy = useMemo<OverlayDiagnostics['guideSelectionStrategy']>(() => {
    if (!overlayInteractionDegraded) {
      return 'full'
    }

    return selectionState.selectedBounds
      ? 'axis-relevance'
      : 'axis-first'
  }, [overlayInteractionDegraded, selectionState.selectedBounds])
  const overlayDiagnostics = useMemo<OverlayDiagnostics>(() => ({
    degraded: overlayInteractionDegraded,
    guideInputCount: snapGuides.length,
    guideKeptCount: effectiveSnapGuides.length,
    guideDroppedCount: Math.max(0, snapGuides.length - effectiveSnapGuides.length),
    guideSelectionStrategy: overlayGuideSelectionStrategy,
    pathEditWhitelistActive: hasPathEditActivity,
  }), [effectiveSnapGuides.length, hasPathEditActivity, overlayGuideSelectionStrategy, overlayInteractionDegraded, snapGuides.length])
  const marqueeBounds = useMemo<InteractionBounds | null>(() => {
    if (!marquee) {
      return null
    }
    return resolveMarqueeBounds(marquee)
  }, [marquee])

  const hoveredShapeBounds = useMemo(() => {
    if (!effectiveHoveredShapeId) {
      return null
    }
    const hoveredShape = previewShapeById.get(effectiveHoveredShapeId)
    if (!hoveredShape) {
      return null
    }
    return {
      minX: Math.min(hoveredShape.x, hoveredShape.x + hoveredShape.width),
      minY: Math.min(hoveredShape.y, hoveredShape.y + hoveredShape.height),
      maxX: Math.max(hoveredShape.x, hoveredShape.x + hoveredShape.width),
      maxY: Math.max(hoveredShape.y, hoveredShape.y + hoveredShape.height),
    }
  }, [effectiveHoveredShapeId, previewShapeById])

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

  const activePathAnchors = useMemo(() => {
    if (!activePathShape) {
      return [] as Array<{x: number; y: number}>
    }
    if (Array.isArray(activePathShape.bezierPoints) && activePathShape.bezierPoints.length > 0) {
      return activePathShape.bezierPoints.map((point) => ({
        x: point.anchor.x,
        y: point.anchor.y,
      }))
    }
    return (activePathShape.points ?? []).map((point) => ({x: point.x, y: point.y}))
  }, [activePathShape])

  const activePathHandleLinks = useMemo(() => {
    if (!activePathShape || !Array.isArray(activePathShape.bezierPoints)) {
      return [] as Array<{anchor: {x: number; y: number}; handle: {x: number; y: number}; handleType: 'inHandle' | 'outHandle'; anchorIndex: number}>
    }

    return activePathShape.bezierPoints.flatMap((point, anchorIndex) => {
      const links: Array<{anchor: {x: number; y: number}; handle: {x: number; y: number}; handleType: 'inHandle' | 'outHandle'; anchorIndex: number}> = []
      if (point.cp1) {
        const override =
          activePathSubSelection?.hitType === 'inHandle' &&
          activePathSubSelection.handlePoint?.anchorIndex === anchorIndex
            ? activePathSubSelection.handlePoint
            : null
        links.push({
          anchor: {x: point.anchor.x, y: point.anchor.y},
          handle: override ? {x: override.x, y: override.y} : {x: point.cp1.x, y: point.cp1.y},
          handleType: 'inHandle',
          anchorIndex,
        })
      }
      if (point.cp2) {
        const override =
          activePathSubSelection?.hitType === 'outHandle' &&
          activePathSubSelection.handlePoint?.anchorIndex === anchorIndex
            ? activePathSubSelection.handlePoint
            : null
        links.push({
          anchor: {x: point.anchor.x, y: point.anchor.y},
          handle: override ? {x: override.x, y: override.y} : {x: point.cp2.x, y: point.cp2.y},
          handleType: 'outHandle',
          anchorIndex,
        })
      }
      return links
    })
  }, [activePathShape, activePathSubSelection])

  const highlightedSegment = useMemo(() => {
    if (!activePathSubSelection || activePathSubSelection.hitType !== 'segment' || !activePathSubSelection.segment || activePathAnchors.length < 2) {
      return null
    }
    const from = activePathAnchors[activePathSubSelection.segment.index]
    const to = activePathAnchors[activePathSubSelection.segment.index + 1]
    if (!from || !to) {
      return null
    }
    return {from, to}
  }, [activePathAnchors, activePathSubSelection])

  const baseOverlayInstructions = useMemo(() => buildRuntimeOverlayInstructions({
    selectedBounds: selectionState.selectedBounds,
    marqueeBounds,
    hoveredShapeBounds,
    snapGuides: effectiveSnapGuides,
    canvasBounds: {
      minX: 0,
      minY: 0,
      maxX: interactionDocument.width,
      maxY: interactionDocument.height,
    },
  }), [
    hoveredShapeBounds,
    interactionDocument.height,
    interactionDocument.width,
    marqueeBounds,
    selectionState.selectedBounds,
    effectiveSnapGuides,
  ])

  const pathEditInstructions = useMemo(() => buildRuntimePathEditInstructions({
    activePathShapeId: activePathShape?.id,
    activePathAnchors,
    activePathHandleLinks,
    highlightedSegment,
    activePathSubSelection,
  }), [
    activePathAnchors,
    activePathHandleLinks,
    activePathShape?.id,
    activePathSubSelection,
    highlightedSegment,
  ])

  const overlayInstructions = useMemo(
    () => [...baseOverlayInstructions, ...pathEditInstructions],
    [baseOverlayInstructions, pathEditInstructions],
  )

  const previewInstructions = useMemo(() => buildRuntimePreviewInstructions({
    transformPreview,
  }), [transformPreview])

  const protectedNodeIds = useMemo(() => {
    const ids = new Set<string>(selectedShapeIds)
    for (const previewShape of transformPreview?.shapes ?? []) {
      ids.add(previewShape.shapeId)
    }
    if (pathSubSelection?.shapeId) {
      ids.add(pathSubSelection.shapeId)
    }
    if (pathSubSelectionHover?.shapeId) {
      ids.add(pathSubSelectionHover.shapeId)
    }
    if (pathHandleDrag?.shapeId) {
      ids.add(pathHandleDrag.shapeId)
    }
    return Array.from(ids)
  }, [
    pathHandleDrag?.shapeId,
    pathSubSelection?.shapeId,
    pathSubSelectionHover?.shapeId,
    selectedShapeIds,
    transformPreview?.shapes,
  ])

  const OverlayRenderer = useMemo(() => {
    const overlayMarquee = marqueeBounds
    const overlayHoveredShapeId = effectiveHoveredShapeId
    const hideSelectionBounds = selectionChrome.hideBounds
    const hideSelectionChrome = activeTransformHandle !== null || selectionChrome.hideTransformHandles
    const overlaySnapGuides = effectiveSnapGuides
    const overlayPathSubSelection = pathSubSelection
    const overlayPathSubSelectionHover = pathSubSelectionHover
    const overlayDraftPrimitive = draftPrimitive
    const overlayPenDraftPoints = penDraftPoints
    return function Overlay(
      props: Parameters<typeof InteractionOverlay>[0],
    ) {
      return createElement(InteractionOverlay, {
        ...props,
        hoveredShapeId: overlayHoveredShapeId,
        marqueeBounds: overlayMarquee,
        isolationBackdropShapes,
        hideSelectionBounds,
        hideSelectionChrome,
        snapGuides: overlaySnapGuides,
        pathSubSelection: overlayPathSubSelection,
        pathSubSelectionHover: overlayPathSubSelectionHover,
        draftPrimitive: overlayDraftPrimitive,
        penDraftPoints: overlayPenDraftPoints,
        overlayInstructions,
        previewInstructions,
        presentation: runtimePresentation,
      })
    }
  }, [
    activeTransformHandle,
    draftPrimitive,
    effectiveHoveredShapeId,
    isolationBackdropShapes,
    selectionChrome.hideBounds,
    marqueeBounds,
    pathSubSelection,
    pathSubSelectionHover,
    penDraftPoints,
    overlayInstructions,
    previewInstructions,
    runtimePresentation,
    effectiveSnapGuides,
  ])

  return {
    canvasRuntime,
    defaultCanvasInteractions,
    runtimePresentation,
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
    interactionDocument,
    previewShapeById,
    selectionState,
    selectionChrome,
    marqueeBounds,
    overlayInstructions,
    previewInstructions,
    overlayDiagnostics,
    protectedNodeIds,
    OverlayRenderer,
  }
}