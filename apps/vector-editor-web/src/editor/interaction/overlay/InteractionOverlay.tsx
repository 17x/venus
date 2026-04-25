import {useMemo} from 'react'
import {
  DEFAULT_CANVAS_PRESENTATION_CONFIG,
  isPathOverlayHitRegion,
  type CanvasPresentationConfig,
  type RuntimeOverlayInstruction,
  type RuntimePreviewInstruction,
} from '@vector/runtime'
import {
  resolveNodeTransform,
} from '@vector/runtime/engine'
import type {EditorDocument} from '@vector/model'
import {resolveSnapGuideLines, type SnapGuide} from '../runtime/index.ts'
import type {CanvasRendererProps} from '../../runtime/canvasAdapter.tsx'
import type {SceneShapeSnapshot} from '@vector/runtime/shared-memory'
import {buildSelectionHandles} from '../selection/handleManager.ts'
import {buildSelectionState} from '../selection/selectionManager.ts'
import type {DraftPrimitive, InteractionBounds, PathSubSelection} from '../types.ts'
import {
  buildRectPolygon,
  projectPoint,
  projectPolygon,
  toSvgPoints,
} from './interactionOverlayGeometry.ts'
import {
  renderDraftPrimitive,
  renderHoveredShapeStroke,
  renderIsolationBackdropShapeStroke,
  renderSelectedShapeStroke,
} from './interactionOverlayRenderers.tsx'
import {InteractionOverlayPathChrome} from './interactionOverlayPathChrome.tsx'

export interface InteractionOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  viewport: CanvasRendererProps['viewport']
  hoveredShapeId?: string | null
  marqueeBounds?: InteractionBounds | null
  isolationBackdropShapes?: EditorDocument['shapes']
  hideSelectionBounds?: boolean
  hideSelectionChrome?: boolean
  snapGuides?: SnapGuide[]
  pathSubSelection?: PathSubSelection | null
  pathSubSelectionHover?: PathSubSelection | null
  draftPrimitive?: DraftPrimitive | null
  penDraftPoints?: Array<{x: number; y: number}> | null
  overlayInstructions?: RuntimeOverlayInstruction[]
  previewInstructions?: RuntimePreviewInstruction[]
  presentation?: CanvasPresentationConfig
}

export function InteractionOverlay({
  document,
  shapes,
  viewport,
  hoveredShapeId = null,
  marqueeBounds = null,
  isolationBackdropShapes = [],
  hideSelectionBounds = false,
  hideSelectionChrome = false,
  snapGuides = [],
  pathSubSelection = null,
  pathSubSelectionHover = null,
  draftPrimitive = null,
  penDraftPoints = null,
  overlayInstructions = [],
  previewInstructions = [],
  presentation = DEFAULT_CANVAS_PRESENTATION_CONFIG,
}: InteractionOverlayProps) {
  const handleSize = presentation.overlay.handleSize
  const halfHandleSize = handleSize / 2
  const documentShapeById = useMemo(
    () => new Map(document.shapes.map((shape) => [shape.id, shape])),
    [document.shapes],
  )
  const snapshotShapeById = useMemo(
    () => new Map(shapes.map((shape) => [shape.id, shape])),
    [shapes],
  )
  const selection = useMemo(
    () => buildSelectionState(document, shapes),
    [document, shapes],
  )
  const selectedIdSet = useMemo(() => new Set(selection.selectedIds), [selection.selectedIds])
  const handles = useMemo(
    () => buildSelectionHandles(selection, {
      rotateOffset: 28,
      rotateDegrees:
        selection.selectedIds.length === 1
          ? (documentShapeById.get(selection.selectedIds[0])?.rotation ?? 0)
          : 0,
    }),
    [documentShapeById, selection],
  )
  const singleSelectedShape = useMemo(
    () => selection.selectedIds.length === 1
      ? documentShapeById.get(selection.selectedIds[0]) ?? null
      : null,
    [documentShapeById, selection.selectedIds],
  )
  const hovered = useMemo(
    () => hoveredShapeId ? documentShapeById.get(hoveredShapeId) ?? null : null,
    [documentShapeById, hoveredShapeId],
  )
  const hoveredSnapshot = useMemo(
    () => hoveredShapeId ? snapshotShapeById.get(hoveredShapeId) ?? null : null,
    [hoveredShapeId, snapshotShapeById],
  )
  const hoveredShape = useMemo(
    () => {
      if (!hovered || !hoveredSnapshot) {
        return null
      }
      if (hoveredSnapshot.isSelected || selectedIdSet.has(hovered.id)) {
        return null
      }
      return hovered
    },
    [hovered, hoveredSnapshot, selectedIdSet],
  )
  const hoveredCenterScreen = useMemo(() => {
    if (!hoveredShape || hoveredShape.type === 'path') {
      return null
    }
    const center = resolveNodeTransform(hoveredShape).center
    return projectPoint(center, viewport.matrix)
  }, [hoveredShape, viewport.matrix])
  const selectedShapes = useMemo(
    () => selection.selectedIds
      .map((id) => documentShapeById.get(id))
      .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape)),
    [documentShapeById, selection.selectedIds],
  )
  const shouldHideSelectionPolygon = useMemo(
    () => selectedShapes.length === 1 && selectedShapes[0].type === 'image' && Boolean(selectedShapes[0].clipPathId),
    [selectedShapes],
  )
  const selectedPolygon = useMemo(() => {
    if (!selection.selectedBounds || hideSelectionBounds || hideSelectionChrome || shouldHideSelectionPolygon) {
      return null
    }
    return buildRectPolygon(selection.selectedBounds, {
      rotationDegrees: singleSelectedShape?.rotation ?? 0,
      flipX: singleSelectedShape?.flipX ?? false,
      flipY: singleSelectedShape?.flipY ?? false,
    })
  }, [
    hideSelectionBounds,
    hideSelectionChrome,
    selection.selectedBounds,
    shouldHideSelectionPolygon,
    singleSelectedShape?.flipX,
    singleSelectedShape?.flipY,
    singleSelectedShape?.rotation,
  ])
  const screenHandles = useMemo(
    () => handles.map((handle) => ({
      ...handle,
      ...projectPoint(handle, viewport.matrix),
    })),
    [handles, viewport.matrix],
  )
  const marqueePolygon = useMemo(
    () => marqueeBounds
      ? projectPolygon(buildRectPolygon(marqueeBounds, {rotationDegrees: 0}), viewport.matrix)
      : null,
    [marqueeBounds, viewport.matrix],
  )
  const snapLines = useMemo(
    () => resolveSnapGuideLines({
      guides: snapGuides,
      shapes: document.shapes,
      movingShapeIds: selection.selectedIds,
      matrix: viewport.matrix,
    }),
    [document.shapes, selection.selectedIds, snapGuides, viewport.matrix],
  )
  const staticShapeAnchors = useMemo(() => {
    const anchors: Array<{key: string; tone: 'selected' | 'hover'; shapeId: string}> = []
    selectedShapes.forEach((shape) => {
      anchors.push({
        key: `selected-stroke:${shape.id}`,
        tone: 'selected',
        shapeId: shape.id,
      })
    })
    if (hoveredShape) {
      anchors.push({
        key: `hover-stroke:${hoveredShape.id}`,
        tone: 'hover',
        shapeId: hoveredShape.id,
      })
    }
    return anchors
  }, [hoveredShape, selectedShapes])
  const activePathSubSelection = pathSubSelectionHover ?? pathSubSelection
  const activePathShape = useMemo(() => {
    if (!activePathSubSelection) {
      return null
    }
    const shape = documentShapeById.get(activePathSubSelection.shapeId)
    if (!shape || shape.type !== 'path') {
      return null
    }
    return shape
  }, [activePathSubSelection, documentShapeById])
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
  const hasRuntimeInstructionOverlay = overlayInstructions.length > 0 || previewInstructions.length > 0

  const runtimeInstructions = useMemo(
    () => [...overlayInstructions, ...previewInstructions],
    [overlayInstructions, previewInstructions],
  )
  const hasRuntimePathChrome = useMemo(
    () => runtimeInstructions.some((instruction) => isPathOverlayHitRegion(instruction.hitRegion)),
    [runtimeInstructions],
  )

  const renderInstruction = (instruction: RuntimeOverlayInstruction | RuntimePreviewInstruction) => {
    const points = instruction.points ?? []
    const strokeDasharray = instruction.style?.strokeDash?.join(' ')
    const stroke = instruction.style?.strokeColor ?? presentation.overlay.selectionStroke
    const strokeWidth = instruction.style?.strokeWidth ?? presentation.overlay.selectionStrokeWidth
    const fill = instruction.style?.fillColor ?? 'none'

    if (instruction.primitive === 'line' && points.length >= 2) {
      return (
        <line
          role="presentation"
          key={instruction.id}
          x1={points[0].x}
          y1={points[0].y}
          x2={points[1].x}
          y2={points[1].y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          vectorEffect={instruction.style?.nonScalingStroke ? 'non-scaling-stroke' : undefined}
          opacity={instruction.style?.fillOpacity}
        />
      )
    }

    if (instruction.primitive === 'polygon' && points.length >= 3) {
      return (
        <polygon
          role="presentation"
          key={instruction.id}
          points={toSvgPoints(points)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          vectorEffect={instruction.style?.nonScalingStroke ? 'non-scaling-stroke' : undefined}
          opacity={instruction.style?.fillOpacity}
        />
      )
    }

    if (instruction.primitive === 'polyline' && points.length >= 2) {
      return (
        <polyline
          role="presentation"
          key={instruction.id}
          points={toSvgPoints(points)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          vectorEffect={instruction.style?.nonScalingStroke ? 'non-scaling-stroke' : undefined}
          opacity={instruction.style?.fillOpacity}
        />
      )
    }

    if (instruction.primitive === 'handle' && points.length >= 1) {
      return (
        <circle
          role="presentation"
          key={instruction.id}
          cx={points[0].x}
          cy={points[0].y}
          r={3}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect={instruction.style?.nonScalingStroke ? 'non-scaling-stroke' : undefined}
          opacity={instruction.style?.fillOpacity}
        />
      )
    }

    return null
  }

  return (
    <div
      role="region"
      aria-label="interaction-overlay-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        role="img"
        aria-label="interaction-overlay-svg"
        style={{
          position: 'absolute',
          inset: 0,
        }}
        width="100%"
        height="100%"
      >
        <g
          role="group"
          aria-label="interaction-overlay-world-group"
          transform={`matrix(${viewport.matrix[0]}, ${viewport.matrix[3]}, ${viewport.matrix[1]}, ${viewport.matrix[4]}, ${viewport.matrix[2]}, ${viewport.matrix[5]})`}
        >
          {isolationBackdropShapes.map((shape) => renderIsolationBackdropShapeStroke(shape, presentation))}
          {hoveredShape && renderHoveredShapeStroke(hoveredShape, presentation)}
          {!hideSelectionChrome && selectedShapes.map((shape) => renderSelectedShapeStroke(shape, presentation))}
          {draftPrimitive && renderDraftPrimitive(draftPrimitive, presentation)}
          {penDraftPoints && penDraftPoints.length >= 2 && (
            <polyline
              role="presentation"
              points={toSvgPoints(penDraftPoints)}
              fill="none"
              stroke={presentation.overlay.selectionStroke}
              strokeWidth={presentation.overlay.selectionStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {!hasRuntimePathChrome && (
            <InteractionOverlayPathChrome
              activePathShapeId={activePathShape?.id}
              activePathAnchors={activePathAnchors}
              activePathHandleLinks={activePathHandleLinks}
              activePathSubSelection={activePathSubSelection}
              highlightedSegment={highlightedSegment}
              presentation={presentation}
            />
          )}

          {!hasRuntimeInstructionOverlay && selectedPolygon && (
            <polygon
              role="presentation"
              points={toSvgPoints(selectedPolygon)}
              fill="none"
              stroke={presentation.overlay.selectionStroke}
              strokeWidth={presentation.overlay.selectionStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {hasRuntimeInstructionOverlay && runtimeInstructions.map((instruction) => renderInstruction(instruction))}
        </g>

        {hoveredCenterScreen && (
          <circle
            role="presentation"
            cx={hoveredCenterScreen.x}
            cy={hoveredCenterScreen.y}
            r={4}
            fill={presentation.overlay.hoverCenterFill}
            stroke={presentation.overlay.hoverCenterStroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {!hideSelectionChrome && screenHandles.map((handle) => (
          <rect
            role="presentation"
            key={handle.id}
            x={handle.x - halfHandleSize}
            y={handle.y - halfHandleSize}
            width={handleSize}
            height={handleSize}
            rx={handle.kind === 'rotate' ? handleSize / 2 : 2}
            ry={handle.kind === 'rotate' ? handleSize / 2 : 2}
            fill={presentation.overlay.handleFill}
            stroke={presentation.overlay.handleStroke}
            strokeWidth={presentation.overlay.selectionStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {!hasRuntimeInstructionOverlay && marqueePolygon && (
          <polygon
            role="presentation"
            points={toSvgPoints(marqueePolygon)}
            fill={presentation.marquee.fill}
            stroke={presentation.marquee.stroke}
            strokeWidth={presentation.marquee.strokeWidth}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={presentation.marquee.strokeDasharray}
          />
        )}
        {!hasRuntimeInstructionOverlay && snapLines.map((line) => (
          <line
            role="presentation"
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={presentation.overlay.snapGuideStroke}
            strokeWidth={1}
            strokeDasharray={presentation.overlay.snapGuideDasharray}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <g role="group" aria-label="interaction-overlay-static-anchors">
          {staticShapeAnchors.map((anchor) => (
            <g
              key={`static-anchor:${anchor.key}`}
              role="presentation"
              data-overlay-layer="static"
              data-overlay-tone={anchor.tone}
              data-overlay-shape-id={anchor.shapeId}
              data-overlay-for={anchor.key}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
