import {useMemo} from 'react'
import {
  applyMatrixToPoint,
  DEFAULT_CANVAS_PRESENTATION_CONFIG,
  type CanvasPresentationConfig,
} from '@vector/runtime'
import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  getNormalizedBoundsFromBox,
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
} from '@vector/runtime/engine'
import type {EditorDocument} from '@venus/document-core'
import {resolveSnapGuideLines, type SnapGuide} from '../runtime/index.ts'
import type {CanvasRendererProps} from '../../runtime/canvasAdapter.tsx'
import type {SceneShapeSnapshot} from '@vector/runtime/shared-memory'
import {buildSelectionHandles} from '../selection/handleManager.ts'
import {buildSelectionState} from '../selection/selectionManager.ts'
import type {DraftPrimitive, InteractionBounds, PathSubSelection} from '../types.ts'

interface InteractionOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  viewport: CanvasRendererProps['viewport']
  hoveredShapeId?: string | null
  marqueeBounds?: InteractionBounds | null
  hideSelectionChrome?: boolean
  snapGuides?: SnapGuide[]
  pathSubSelection?: PathSubSelection | null
  pathSubSelectionHover?: PathSubSelection | null
  draftPrimitive?: DraftPrimitive | null
  penDraftPoints?: Array<{x: number; y: number}> | null
  presentation?: CanvasPresentationConfig
}

export function InteractionOverlay({
  document,
  shapes,
  viewport,
  hoveredShapeId = null,
  marqueeBounds = null,
  hideSelectionChrome = false,
  snapGuides = [],
  pathSubSelection = null,
  pathSubSelectionHover = null,
  draftPrimitive = null,
  penDraftPoints = null,
  presentation = DEFAULT_CANVAS_PRESENTATION_CONFIG,
}: InteractionOverlayProps) {
  const handleSize = presentation.overlay.handleSize
  const halfHandleSize = handleSize / 2
  const selection = useMemo(
    () => buildSelectionState(document, shapes),
    [document, shapes],
  )
  const handles = useMemo(
    () => buildSelectionHandles(selection, {
      rotateOffset: 28,
      rotateDegrees:
        selection.selectedIds.length === 1
          ? (document.shapes.find((shape) => shape.id === selection.selectedIds[0])?.rotation ?? 0)
          : 0,
    }),
    [document.shapes, selection],
  )
  const singleSelectedShape = useMemo(
    () => selection.selectedIds.length === 1
      ? document.shapes.find((shape) => shape.id === selection.selectedIds[0]) ?? null
      : null,
    [document.shapes, selection.selectedIds],
  )
  const hovered = useMemo(
    () => hoveredShapeId ? document.shapes.find((shape) => shape.id === hoveredShapeId) : null,
    [document.shapes, hoveredShapeId],
  )
  const hoveredSnapshot = useMemo(
    () => hoveredShapeId ? shapes.find((shape) => shape.id === hoveredShapeId) ?? null : null,
    [hoveredShapeId, shapes],
  )
  const hoveredShape = useMemo(
    () => {
      if (!hovered || !hoveredSnapshot) {
        return null
      }
      if (hoveredSnapshot.isSelected || selection.selectedIds.includes(hovered.id)) {
        return null
      }
      return hovered
    },
    [hovered, hoveredSnapshot, selection.selectedIds],
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
      .map((id) => document.shapes.find((shape) => shape.id === id))
      .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape)),
    [document.shapes, selection.selectedIds],
  )
  const shouldHideSelectionPolygon = useMemo(
    () => selectedShapes.length === 1 && selectedShapes[0].type === 'image' && Boolean(selectedShapes[0].clipPathId),
    [selectedShapes],
  )
  const selectedPolygon = useMemo(() => {
    if (!selection.selectedBounds || hideSelectionChrome || shouldHideSelectionPolygon) {
      return null
    }
    return buildRectPolygon(selection.selectedBounds, {
      rotationDegrees: singleSelectedShape?.rotation ?? 0,
      flipX: singleSelectedShape?.flipX ?? false,
      flipY: singleSelectedShape?.flipY ?? false,
    })
  }, [
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
    const shape = document.shapes.find((item) => item.id === activePathSubSelection.shapeId)
    if (!shape || shape.type !== 'path') {
      return null
    }
    return shape
  }, [activePathSubSelection, document.shapes])
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
          {hoveredShape && renderHoveredShapeStroke(hoveredShape, presentation)}
          {selectedShapes.map((shape) => renderSelectedShapeStroke(shape, presentation))}
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

          {highlightedSegment && (
            <line
              role="presentation"
              x1={highlightedSegment.from.x}
              y1={highlightedSegment.from.y}
              x2={highlightedSegment.to.x}
              y2={highlightedSegment.to.y}
              stroke={presentation.overlay.hoverStroke}
              strokeWidth={presentation.overlay.selectionStrokeWidth + 0.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {activePathAnchors.map((anchor, index) => {
            const selectedAnchor = activePathSubSelection?.hitType === 'anchorPoint' && activePathSubSelection.anchorPoint?.index === index
            return (
              <circle
                role="presentation"
                key={`path-anchor:${activePathShape?.id}:${index}`}
                cx={anchor.x}
                cy={anchor.y}
                r={selectedAnchor ? 4 : 3}
                fill={selectedAnchor ? presentation.overlay.selectionStroke : '#ffffff'}
                stroke={selectedAnchor ? '#ffffff' : presentation.overlay.hoverStroke}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}

          {activePathHandleLinks.map((link) => {
            const selectedHandle =
              activePathSubSelection?.hitType === link.handleType &&
              activePathSubSelection.handlePoint?.anchorIndex === link.anchorIndex

            return (
              <g key={`path-handle:${activePathShape?.id}:${link.anchorIndex}:${link.handleType}`}>
                <line
                  role="presentation"
                  x1={link.anchor.x}
                  y1={link.anchor.y}
                  x2={link.handle.x}
                  y2={link.handle.y}
                  stroke={presentation.overlay.hoverStroke}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  role="presentation"
                  cx={link.handle.x}
                  cy={link.handle.y}
                  r={selectedHandle ? 4 : 3}
                  fill={selectedHandle ? presentation.overlay.selectionStroke : '#ffffff'}
                  stroke={presentation.overlay.hoverStroke}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )
          })}

          {selectedPolygon && (
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

        {marqueePolygon && (
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
        {snapLines.map((line) => (
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

function renderDraftPrimitive(
  draftPrimitive: DraftPrimitive,
  presentation: CanvasPresentationConfig,
) {
  const stroke = presentation.overlay.selectionStroke
  const strokeWidth = presentation.overlay.selectionStrokeWidth
  const fill = 'rgba(56, 189, 248, 0.08)'
  const bounds = draftPrimitive.bounds
  const width = Math.max(1, bounds.maxX - bounds.minX)
  const height = Math.max(1, bounds.maxY - bounds.minY)

  if (draftPrimitive.type === 'lineSegment') {
    const from = draftPrimitive.points[0] ?? {x: bounds.minX, y: bounds.minY}
    const to = draftPrimitive.points[draftPrimitive.points.length - 1] ?? {x: bounds.maxX, y: bounds.maxY}
    return (
      <line
        role="presentation"
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (draftPrimitive.type === 'ellipse') {
    return (
      <ellipse
        role="presentation"
        cx={bounds.minX + width / 2}
        cy={bounds.minY + height / 2}
        rx={width / 2}
        ry={height / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (draftPrimitive.type === 'polygon') {
    const points = buildDraftPolygonPoints(bounds.minX, bounds.minY, width, height)
    return (
      <polygon
        role="presentation"
        points={toSvgPoints(points)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (draftPrimitive.type === 'star') {
    const points = buildDraftStarPoints(bounds.minX, bounds.minY, width, height)
    return (
      <polygon
        role="presentation"
        points={toSvgPoints(points)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  return (
    <rect
      role="presentation"
      x={bounds.minX}
      y={bounds.minY}
      width={width}
      height={height}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray="6 4"
      vectorEffect="non-scaling-stroke"
    />
  )
}

function buildDraftPolygonPoints(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const radius = Math.min(width, height) / 2
  const sides = 5

  return Array.from({length: sides}, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

function buildDraftStarPoints(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const outerRadius = Math.min(width, height) / 2
  const innerRadius = outerRadius * 0.46

  return Array.from({length: 10}, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI / 5) * index
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

function renderSelectedShapeStroke(
  shape: EditorDocument['shapes'][number],
  presentation: CanvasPresentationConfig,
) {
  const strokeColor = presentation.overlay.selectionStroke
  const strokeWidth = presentation.overlay.selectionStrokeWidth
  const common = {
    role: 'presentation' as const,
    fill: 'none',
    stroke: strokeColor,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }
  const transformState = resolveNodeTransform(shape)
  const transform = toResolvedNodeSvgTransform(transformState)

  if (shape.type === 'group') {
    return null
  }

  if (shape.type === 'image' && shape.clipPathId) {
    // Masked images already expose clip-shape chrome; suppress host bounds box to avoid duplicate selection frames.
    return null
  }

  if (shape.type === 'ellipse') {
    return (
      <ellipse
        key={`selected-stroke:${shape.id}`}
        cx={transformState.center.x}
        cy={transformState.center.y}
        rx={transformState.bounds.width / 2}
        ry={transformState.bounds.height / 2}
        transform={transform}
        {...common}
      />
    )
  }

  if ((shape.type === 'polygon' || shape.type === 'star') && shape.points && shape.points.length >= 3) {
    return (
      <polygon
        key={`selected-stroke:${shape.id}`}
        points={shape.points.map((point) => `${point.x},${point.y}`).join(' ')}
        transform={transform}
        {...common}
      />
    )
  }

  if (shape.type === 'lineSegment') {
    const points = Array.isArray(shape.points) && shape.points.length >= 2
      ? shape.points
      : null
    const start = points ? points[0] : {x: shape.x, y: shape.y}
    const end = points ? points[points.length - 1] : {x: shape.x + shape.width, y: shape.y + shape.height}
    return (
      <line
        key={`selected-stroke:${shape.id}`}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        transform={transform}
        {...common}
      />
    )
  }

  if (shape.type === 'path') {
    const d = buildPathStrokeD(shape)
    if (!d) {
      return null
    }
    return (
      <path
        key={`selected-stroke:${shape.id}`}
        d={d}
        transform={transform}
        {...common}
      />
    )
  }

  if (shape.type === 'rectangle' || shape.type === 'frame') {
    const roundedRectD = buildRoundedRectStrokeD(shape)
    if (roundedRectD) {
      return (
        <path
          key={`selected-stroke:${shape.id}`}
          d={roundedRectD}
          transform={transform}
          {...common}
        />
      )
    }
  }

  return (
    <rect
      key={`selected-stroke:${shape.id}`}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      transform={transform}
      {...common}
    />
  )
}

function renderHoveredShapeStroke(
  shape: EditorDocument['shapes'][number],
  presentation: CanvasPresentationConfig,
) {
  const strokeColor = presentation.overlay.hoverStroke
  const strokeWidth = presentation.overlay.selectionStrokeWidth
  const common = {
    role: 'presentation' as const,
    fill: 'none',
    stroke: strokeColor,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }
  const transformState = resolveNodeTransform(shape)
  const transform = toResolvedNodeSvgTransform(transformState)

  if (shape.type === 'group') {
    return null
  }

  if (shape.type === 'image' && shape.clipPathId) {
    return null
  }

  if (shape.type === 'ellipse') {
    return (
      <ellipse
        key={`hover-stroke:${shape.id}`}
        cx={transformState.center.x}
        cy={transformState.center.y}
        rx={transformState.bounds.width / 2}
        ry={transformState.bounds.height / 2}
        transform={transform}
        {...common}
      />
    )
  }

  if ((shape.type === 'polygon' || shape.type === 'star') && shape.points && shape.points.length >= 3) {
    return (
      <polygon
        key={`hover-stroke:${shape.id}`}
        points={shape.points.map((point) => `${point.x},${point.y}`).join(' ')}
        transform={transform}
        {...common}
      />
    )
  }

  if (shape.type === 'lineSegment') {
    const points = Array.isArray(shape.points) && shape.points.length >= 2
      ? shape.points
      : null
    const start = points ? points[0] : {x: shape.x, y: shape.y}
    const end = points ? points[points.length - 1] : {x: shape.x + shape.width, y: shape.y + shape.height}
    return (
      <line
        key={`hover-stroke:${shape.id}`}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        transform={transform}
        {...common}
      />
    )
  }

  if (shape.type === 'path') {
    const d = buildPathStrokeD(shape)
    if (!d) {
      return null
    }
    return (
      <path
        key={`hover-stroke:${shape.id}`}
        d={d}
        transform={transform}
        {...common}
      />
    )
  }

  if (shape.type === 'rectangle' || shape.type === 'frame') {
    const roundedRectD = buildRoundedRectStrokeD(shape)
    if (roundedRectD) {
      return (
        <path
          key={`hover-stroke:${shape.id}`}
          d={roundedRectD}
          transform={transform}
          {...common}
        />
      )
    }
  }

  return (
    <rect
      key={`hover-stroke:${shape.id}`}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      transform={transform}
      {...common}
    />
  )
}

function buildPathStrokeD(shape: EditorDocument['shapes'][number]) {
  if (shape.bezierPoints && shape.bezierPoints.length > 1) {
    const first = shape.bezierPoints[0]
    let d = `M ${first.anchor.x} ${first.anchor.y}`
    for (let index = 0; index < shape.bezierPoints.length - 1; index += 1) {
      const current = shape.bezierPoints[index]
      const next = shape.bezierPoints[index + 1]
      const cp1 = current.cp2 ?? current.anchor
      const cp2 = next.cp1 ?? next.anchor
      d += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.anchor.x} ${next.anchor.y}`
    }
    return d
  }

  if (shape.points && shape.points.length > 1) {
    const [first, ...rest] = shape.points
    return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(' ')}`
  }

  return null
}

function buildRoundedRectStrokeD(shape: EditorDocument['shapes'][number]) {
  const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)
  const width = Math.max(0, bounds.width)
  const height = Math.max(0, bounds.height)
  if (width <= 0 || height <= 0) {
    return null
  }

  const radii = resolveRoundedRectCornerRadii(shape, bounds)
  const hasRoundedCorners = radii.topLeft > 0 || radii.topRight > 0 || radii.bottomRight > 0 || radii.bottomLeft > 0
  if (!hasRoundedCorners) {
    return null
  }

  const minX = bounds.minX
  const minY = bounds.minY
  const maxX = bounds.maxX
  const maxY = bounds.maxY

  return [
    `M ${minX + radii.topLeft} ${minY}`,
    `L ${maxX - radii.topRight} ${minY}`,
    `A ${radii.topRight} ${radii.topRight} 0 0 1 ${maxX} ${minY + radii.topRight}`,
    `L ${maxX} ${maxY - radii.bottomRight}`,
    `A ${radii.bottomRight} ${radii.bottomRight} 0 0 1 ${maxX - radii.bottomRight} ${maxY}`,
    `L ${minX + radii.bottomLeft} ${maxY}`,
    `A ${radii.bottomLeft} ${radii.bottomLeft} 0 0 1 ${minX} ${maxY - radii.bottomLeft}`,
    `L ${minX} ${minY + radii.topLeft}`,
    `A ${radii.topLeft} ${radii.topLeft} 0 0 1 ${minX + radii.topLeft} ${minY}`,
    'Z',
  ].join(' ')
}

interface RoundedRectCornerRadii {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

function resolveRoundedRectCornerRadii(
  shape: Pick<EditorDocument['shapes'][number], 'cornerRadius' | 'cornerRadii'>,
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
): RoundedRectCornerRadii {
  const width = Math.max(0, bounds.maxX - bounds.minX)
  const height = Math.max(0, bounds.maxY - bounds.minY)
  const fallback = Math.max(0, shape.cornerRadius ?? 0)
  const requested: RoundedRectCornerRadii = {
    topLeft: Math.max(0, shape.cornerRadii?.topLeft ?? fallback),
    topRight: Math.max(0, shape.cornerRadii?.topRight ?? fallback),
    bottomRight: Math.max(0, shape.cornerRadii?.bottomRight ?? fallback),
    bottomLeft: Math.max(0, shape.cornerRadii?.bottomLeft ?? fallback),
  }

  if (width <= 0 || height <= 0) {
    return {
      topLeft: 0,
      topRight: 0,
      bottomRight: 0,
      bottomLeft: 0,
    }
  }

  const horizontalTop = requested.topLeft + requested.topRight
  const horizontalBottom = requested.bottomLeft + requested.bottomRight
  const verticalLeft = requested.topLeft + requested.bottomLeft
  const verticalRight = requested.topRight + requested.bottomRight
  const scale = Math.min(
    1,
    horizontalTop > 0 ? width / horizontalTop : 1,
    horizontalBottom > 0 ? width / horizontalBottom : 1,
    verticalLeft > 0 ? height / verticalLeft : 1,
    verticalRight > 0 ? height / verticalRight : 1,
  )

  return {
    topLeft: requested.topLeft * scale,
    topRight: requested.topRight * scale,
    bottomRight: requested.bottomRight * scale,
    bottomLeft: requested.bottomLeft * scale,
  }
}

function buildRectPolygon(
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
  options: {
    rotationDegrees: number
    flipX?: boolean
    flipY?: boolean
  },
) {
  const rotationDegrees = options.rotationDegrees
  const flipX = options.flipX ? -1 : 1
  const flipY = options.flipY ? -1 : 1
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const corners = [
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
  ]
  if (Math.abs(rotationDegrees) <= 0.0001 && flipX === 1 && flipY === 1) {
    return corners
  }
  const matrix = createAffineMatrixAroundPoint(
    {x: centerX, y: centerY},
    {
      rotationDegrees,
      scaleX: flipX,
      scaleY: flipY,
    },
  )
  return corners.map((point) => applyAffineMatrixToPoint(matrix, point))
}

function projectPolygon(
  points: Array<{x: number; y: number}>,
  matrix: CanvasRendererProps['viewport']['matrix'],
) {
  return points.map((point) => projectPoint(point, matrix))
}

function projectPoint(
  point: {x: number; y: number},
  matrix: CanvasRendererProps['viewport']['matrix'],
) {
  return applyMatrixToPoint(matrix, point)
}

function toSvgPoints(points: Array<{x: number; y: number}>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}
