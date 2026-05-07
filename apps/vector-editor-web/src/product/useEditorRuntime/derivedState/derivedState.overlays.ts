import {useMemo} from 'react'
import {
  buildRuntimeOverlayInstructions,
  buildRuntimePathEditInstructions,
} from '../../../runtime/index.ts'
import type {RuntimeOverlayInstruction} from '../../../runtime/index.ts'
import type {EngineOverlayDrawNode} from '../../../runtime/engine-bridge/engine.ts'
import {
  createEngineOverlayNodesFromSelectorItems,
  createSelectorOverlayItems,
} from '../../../runtime/overlay/selectorOverlayAdapter.ts'
import {
  adaptOverlayModelToInstructions,
  buildVectorOverlayModel,
} from '../../../runtime/primitive/index.ts'
import type {EditorDocument} from '../../../runtime/model/index.ts'
import type {
  PathSubSelection,
  SnapGuide,
  TransformPreview,
} from '../../../runtime/interaction/index.ts'
import type {SelectorOverlayItem} from '@venus/editor-primitive'
import {resolveShapeStyleControls, type ShapeStyleHandleDrag} from '../../runtime/shapeStyleHandles.ts'
import {useEditorRuntimeDerivedPathOverlay} from './derivedState.pathOverlay.ts'
import {
  resolveMarqueeControlStyle,
  resolveOverlayControlSizing,
  toRectPolylineFromBounds,
} from './derivedState.shared.ts'

/**
 * Builds overlay and protected-node outputs from runtime geometry payloads.
 * @param input Runtime/selection/overlay dependencies.
 */
export function useEditorRuntimeDerivedStateOverlays(input: {
  canvasRuntime: any
  editingMode: string
  transformPreviewActive: boolean
  selectedShapeIds: string[]
  selectedNode: EditorDocument['shapes'][number] | null
  selectionState: any
  interactionDocument: EditorDocument
  previewShapeById: Map<string, EditorDocument['shapes'][number]>
  shapeStyleHandleDrag: ShapeStyleHandleDrag | null
  engineGeometryPayload: {
    hovered: any
    selected: any[]
    marqueeCandidateNodeIds: string[]
  }
  selectorOverlayItems: SelectorOverlayItem[]
  effectiveSnapGuides: SnapGuide[]
  activeTransformHandle: string | null
  activePathSubSelection: PathSubSelection | null
  activePathShape: EditorDocument['shapes'][number] | null
  pathSubSelection: PathSubSelection | null
  pathSubSelectionHover: PathSubSelection | null
  pathHandleDrag: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null
  shapeStyleHandleDragForProtection: ShapeStyleHandleDrag | null
  transformPreview: TransformPreview | null
  hoverDisplayShapeId: string | null
}) {
  const {
    activePathAnchors,
    activePathHandleLinks,
    highlightedSegment,
    highlightedCurvePoints,
  } = useEditorRuntimeDerivedPathOverlay({
    activePathShape: input.activePathShape,
    activePathSubSelection: input.activePathSubSelection,
  })

  const shouldSuppressSelectionBoundsOverlay = (
    !input.transformPreviewActive &&
    (input.editingMode === 'dragging' || input.activeTransformHandle === 'move')
  )

  const hoverOverlayInstructions = useMemo<RuntimeOverlayInstruction[]>(() => {
    const hoveredPayload = input.engineGeometryPayload.hovered
    if (!hoveredPayload) {
      return []
    }

    const hoveredShape = input.interactionDocument.shapes.find((shape) => shape.id === hoveredPayload.nodeId) ?? null
    const suppressMaskInnerOutlines = Boolean(
      hoveredShape && (
        hoveredShape.schema?.maskRole === 'source' ||
        hoveredShape.schema?.maskRole === 'host' ||
        (hoveredShape.type === 'image' && hoveredShape.clipPathId)
      )
    )

    const hoveredIsSelected = input.selectedShapeIds.includes(hoveredPayload.nodeId)
    if (hoveredIsSelected && hoveredShape?.type === 'group') {
      return []
    }

    const hoverOutlines = [
      hoveredPayload.outline,
      ...(suppressMaskInnerOutlines ? [] : hoveredPayload.detailOutlines ?? []),
    ]
    const instructions: RuntimeOverlayInstruction[] = []

    if (!hoveredIsSelected) {
      hoverOutlines.forEach((outline, index) => {
        const hoverWorldPoints = outline.kind === 'polyline'
          ? (outline.points ?? [])
          : toRectPolylineFromBounds(outline.bounds ?? hoveredPayload.bounds)
        if (hoverWorldPoints.length < 2) {
          return
        }

        const hoverPoints = (
          outline.closed &&
          hoverWorldPoints.length >= 2 &&
          (hoverWorldPoints[0]?.x !== hoverWorldPoints[hoverWorldPoints.length - 1]?.x ||
            hoverWorldPoints[0]?.y !== hoverWorldPoints[hoverWorldPoints.length - 1]?.y)
        )
          ? [...hoverWorldPoints, hoverWorldPoints[0]]
          : hoverWorldPoints

        instructions.push({
          id: index === 0 ? 'hover-bounds-world' : `hover-detail:${index}`,
          layerId: 'overlay.hover' as const,
          primitive: hoverPoints.length === 2 ? 'line' as const : 'polyline' as const,
          coordinate: 'world' as const,
          points: hoverPoints,
          style: {
            strokeColor: 'rgba(14, 165, 233, 0.95)',
            strokeWidth: index === 0 ? 2 : 1.5,
          },
        })
      })
    }

    hoveredPayload.hints.forEach((hint: {kind: string; point: {x: number; y: number}}, index: number) => {
      instructions.push({
        id: `hover-hint:${hint.kind}:${index}`,
        layerId: 'overlay.guides' as const,
        primitive: 'circle' as const,
        coordinate: 'world' as const,
        points: [hint.point],
        style: {
          strokeColor: 'rgba(14, 165, 233, 0.95)',
          fillColor: 'rgba(14, 165, 233, 0.35)',
          pointRadius: hint.kind === 'hover-anchor' ? 4 : 3,
        },
      })
    })

    return instructions
  }, [
    input.engineGeometryPayload.hovered,
    input.interactionDocument.shapes,
    input.selectedShapeIds,
  ])

  const baseOverlayInstructions = useMemo(() => {
    const base = buildRuntimeOverlayInstructions({
      selectedBounds: null,
      marqueeBounds: null,
      hoveredShapeBounds: null,
      hoveredShapePolygon: null,
      snapGuides: input.effectiveSnapGuides,
      canvasBounds: {
        minX: 0,
        minY: 0,
        maxX: input.interactionDocument.width,
        maxY: input.interactionDocument.height,
      },
    })

    if (shouldSuppressSelectionBoundsOverlay || !input.selectionState.selectedBounds) {
      return base
    }

    const sizing = resolveOverlayControlSizing(input.canvasRuntime.viewport.scale)
    const styleControls = resolveShapeStyleControls({
      selectedShapeIds: input.selectedShapeIds,
      previewShapeById: input.previewShapeById,
      handleToleranceWorld: sizing.cornerToleranceWorld,
      minRectHandleInsetWorld: sizing.cornerVisualSizeWorld,
      activeDrag: input.shapeStyleHandleDrag,
    })
    const singleSelectionRotation = input.selectedShapeIds.length === 1
      ? (input.selectedNode?.rotation ?? 0)
      : 0
    const overlayModel = buildVectorOverlayModel({
      selectedBounds: input.selectionState.selectedBounds,
      selectionRotationDegrees: singleSelectionRotation,
      selectedShapeIds: input.selectedShapeIds,
      marqueeBounds: null,
      hoveredShapeBounds: null,
      hoveredShapePolygon: null,
      hoveredShapeId: null,
      edgeToleranceWorld: sizing.edgeToleranceWorld,
      cornerToleranceWorld: sizing.cornerToleranceWorld,
      rotateSectorInnerRadiusWorld: sizing.rotateSectorInnerRadiusWorld,
      rotateSectorOuterRadiusWorld: sizing.rotateSectorOuterRadiusWorld,
      rotateCornerOffsetWorld: sizing.rotateCornerOffsetWorld,
      extraControls: styleControls,
      version: input.canvasRuntime.stats.version,
    })

    const marqueeInstructions = adaptOverlayModelToInstructions(overlayModel, {
      resolveControlStyle: (control) => resolveMarqueeControlStyle(control, sizing.cornerVisualSizeWorld),
    })

    return [...base, ...marqueeInstructions]
  }, [
    input.canvasRuntime.stats.version,
    input.canvasRuntime.viewport.scale,
    input.effectiveSnapGuides,
    input.interactionDocument.height,
    input.interactionDocument.width,
    input.previewShapeById,
    input.selectedNode?.rotation,
    input.selectedShapeIds,
    input.selectionState.selectedBounds,
    input.shapeStyleHandleDrag,
    shouldSuppressSelectionBoundsOverlay,
  ])

  const selectedOutlineOverlayInstructions = useMemo<RuntimeOverlayInstruction[]>(() => {
    if (input.transformPreviewActive) {
      return []
    }

    const instructions: RuntimeOverlayInstruction[] = []

    input.engineGeometryPayload.selected.forEach((payload, selectionIndex) => {
      if (payload.nodeType === 'group') {
        return
      }

      const selectedOutlines = [payload.outline, ...(payload.detailOutlines ?? [])]
      selectedOutlines.forEach((outline, outlineIndex) => {
        const worldPoints = outline.kind === 'polyline'
          ? (outline.points ?? [])
          : toRectPolylineFromBounds(outline.bounds ?? payload.bounds)
        if (worldPoints.length < 2) {
          return
        }

        const points = (
          outline.closed &&
          worldPoints.length >= 2 &&
          (worldPoints[0]?.x !== worldPoints[worldPoints.length - 1]?.x ||
            worldPoints[0]?.y !== worldPoints[worldPoints.length - 1]?.y)
        )
          ? [...worldPoints, worldPoints[0]]
          : worldPoints

        instructions.push({
          id: `selection-outline:${payload.nodeId}:${selectionIndex}:${outlineIndex}`,
          layerId: 'overlay.selection' as const,
          primitive: points.length === 2 ? 'line' as const : 'polyline' as const,
          coordinate: 'world' as const,
          points,
          style: {
            strokeColor: '#2563eb',
            strokeWidth: 1,
          },
        })
      })
    })

    return instructions
  }, [input.engineGeometryPayload.selected, input.transformPreviewActive])

  const selectedTextDetailOverlayInstructions = useMemo<RuntimeOverlayInstruction[]>(() => {
    if (input.transformPreviewActive) {
      return []
    }

    const instructions: RuntimeOverlayInstruction[] = []

    input.engineGeometryPayload.selected.forEach((payload) => {
      if (payload.nodeType !== 'text' || payload.detailOutlines.length === 0) {
        return
      }

      payload.detailOutlines.forEach((outline: {kind: 'polyline' | 'bounds'; points?: Array<{x: number; y: number}>; bounds?: {minX: number; minY: number; maxX: number; maxY: number}}, index: number) => {
        const points = outline.kind === 'polyline'
          ? (outline.points ?? [])
          : toRectPolylineFromBounds(outline.bounds ?? payload.bounds)
        if (points.length < 2) {
          return
        }

        instructions.push({
          id: `selection-text-detail:${payload.nodeId}:${index}`,
          layerId: 'overlay.selection' as const,
          primitive: points.length === 2 ? 'line' as const : 'polyline' as const,
          coordinate: 'world' as const,
          points,
          style: {
            strokeColor: '#2563eb',
            strokeWidth: 1.25,
          },
        })
      })
    })

    return instructions
  }, [input.engineGeometryPayload.selected, input.transformPreviewActive])

  const pathEditInstructions = useMemo(() => buildRuntimePathEditInstructions({
    activePathShapeId: input.activePathShape?.id,
    activePathAnchors,
    activePathHandleLinks,
    highlightedSegment,
    highlightedCurvePoints,
    activePathSubSelection: input.activePathSubSelection,
  }), [
    activePathAnchors,
    activePathHandleLinks,
    highlightedCurvePoints,
    input.activePathShape?.id,
    input.activePathSubSelection,
    highlightedSegment,
  ])

  const overlayInstructions = useMemo(
    () => [
      ...baseOverlayInstructions,
      ...selectedOutlineOverlayInstructions,
      ...selectedTextDetailOverlayInstructions,
      ...hoverOverlayInstructions,
      ...pathEditInstructions,
    ],
    [
      baseOverlayInstructions,
      selectedOutlineOverlayInstructions,
      selectedTextDetailOverlayInstructions,
      hoverOverlayInstructions,
      pathEditInstructions,
    ],
  )

  const previewInstructions = useMemo(() => {
    return []
  }, [])

  const runtimeOverlayNodes = useMemo<EngineOverlayDrawNode[]>(() => {
    const selectorItems = createSelectorOverlayItems([
      ...overlayInstructions,
      ...previewInstructions,
    ])
    return createEngineOverlayNodesFromSelectorItems(selectorItems, 'world')
  }, [overlayInstructions, previewInstructions])

  const effectiveSelectorOverlayItems = useMemo(() => {
    if (!input.transformPreviewActive) {
      return input.selectorOverlayItems
    }

    return input.selectorOverlayItems.filter((item) => (
      item.type !== 'marquee' && item.type !== 'selectionBox'
    ))
  }, [input.selectorOverlayItems, input.transformPreviewActive])

  const selectorOverlayNodes = useMemo<EngineOverlayDrawNode[]>(() => {
    return createEngineOverlayNodesFromSelectorItems(effectiveSelectorOverlayItems, 'world')
  }, [effectiveSelectorOverlayItems])

  const engineOverlayNodes = useMemo<EngineOverlayDrawNode[]>(() => {
    return [...runtimeOverlayNodes, ...selectorOverlayNodes]
  }, [runtimeOverlayNodes, selectorOverlayNodes])

  const protectedNodeIds = useMemo(() => {
    const ids = new Set<string>(input.selectedShapeIds)
    for (const previewShape of input.transformPreview?.shapes ?? []) {
      ids.add(previewShape.shapeId)
    }
    if (input.pathSubSelection?.shapeId) {
      ids.add(input.pathSubSelection.shapeId)
    }
    if (input.pathSubSelectionHover?.shapeId) {
      ids.add(input.pathSubSelectionHover.shapeId)
    }
    if (input.pathHandleDrag?.shapeId) {
      ids.add(input.pathHandleDrag.shapeId)
    }
    if (input.shapeStyleHandleDragForProtection?.payload.shapeId) {
      ids.add(input.shapeStyleHandleDragForProtection.payload.shapeId)
    }
    return Array.from(ids)
  }, [
    input.pathHandleDrag?.shapeId,
    input.pathSubSelection?.shapeId,
    input.pathSubSelectionHover?.shapeId,
    input.selectedShapeIds,
    input.shapeStyleHandleDragForProtection,
    input.transformPreview?.shapes,
  ])

  const guideHintLabels = useMemo(
    () => input.engineGeometryPayload.hovered?.hints.map((hint: {label: string}) => hint.label) ?? [],
    [input.engineGeometryPayload.hovered],
  )

  return {
    overlayInstructions,
    previewInstructions,
    guideHintLabels,
    engineOverlayNodes,
    protectedNodeIds,
  }
}
