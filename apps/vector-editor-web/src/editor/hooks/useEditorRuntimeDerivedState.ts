import {createElement, useMemo} from 'react'
import type {EditorDocument} from '@venus/document-core'
import {
  buildRuntimePathEditInstructions,
  buildRuntimeOverlayInstructions,
  buildRuntimePreviewInstructions,
} from '@vector/runtime'
import {Canvas2DRenderer} from '../runtime/canvasAdapter.tsx'
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
import {resolvePathHandlePreviewDocument} from './useEditorRuntime.helpers.ts'

const SCENE_CAPACITY = 256
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

  const preferredEngineBackend = useMemo(() => {
    if (typeof window === 'undefined') {
      return 'webgl' as const
    }

    const requested = new URLSearchParams(window.location.search).get('engineBackend')
    return requested === 'canvas2d' ? 'canvas2d' : 'webgl'
  }, [])

  const RuntimeRenderer = useMemo(() => {
    return function RuntimeCanvasRenderer(props: Parameters<typeof Canvas2DRenderer>[0]) {
      return createElement(Canvas2DRenderer, {
        ...props,
        backend: preferredEngineBackend,
      })
    }
  }, [preferredEngineBackend])

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
  const runtimeShapeById = useMemo(
    () => new Map(canvasRuntime.shapes.map((shape) => [shape.id, shape])),
    [canvasRuntime.shapes],
  )
  const selectedShapeIds = useMemo(
    () => canvasRuntime.shapes.filter((shape) => shape.isSelected).map((shape) => shape.id),
    [canvasRuntime.shapes],
  )
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
  const previewDocument = previewState.previewDocument
  const previewShapes = previewState.previewShapes
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
  const marqueeBounds = useMemo<InteractionBounds | null>(() => {
    if (!marquee) {
      return null
    }
    return resolveMarqueeBounds(marquee)
  }, [marquee])

  const hoveredShapeBounds = useMemo(() => {
    if (!hoveredShapeId) {
      return null
    }
    const hoveredShape = previewShapeById.get(hoveredShapeId)
    if (!hoveredShape) {
      return null
    }
    return {
      minX: Math.min(hoveredShape.x, hoveredShape.x + hoveredShape.width),
      minY: Math.min(hoveredShape.y, hoveredShape.y + hoveredShape.height),
      maxX: Math.max(hoveredShape.x, hoveredShape.x + hoveredShape.width),
      maxY: Math.max(hoveredShape.y, hoveredShape.y + hoveredShape.height),
    }
  }, [hoveredShapeId, previewShapeById])

  const activePathSubSelection = pathSubSelectionHover ?? pathSubSelection
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
    snapGuides,
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
    snapGuides,
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

  const OverlayRenderer = useMemo(() => {
    const overlayMarquee = marqueeBounds
    const overlayHoveredShapeId = hoveredShapeId
    const hideSelectionChrome = activeTransformHandle !== null
    const overlaySnapGuides = snapGuides
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
    hoveredShapeId,
    marqueeBounds,
    pathSubSelection,
    pathSubSelectionHover,
    penDraftPoints,
    overlayInstructions,
    previewInstructions,
    runtimePresentation,
    snapGuides,
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
    marqueeBounds,
    overlayInstructions,
    previewInstructions,
    OverlayRenderer,
  }
}