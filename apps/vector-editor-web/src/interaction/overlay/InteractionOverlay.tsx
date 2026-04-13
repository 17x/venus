import {useMemo} from 'react'
import {
  applyMatrixToPoint,
  DEFAULT_CANVAS_PRESENTATION_CONFIG,
  type CanvasPresentationConfig,
} from '@venus/runtime'
import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  getNormalizedBoundsFromBox,
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
} from '@venus/runtime/engine'
import type {EditorDocument} from '@venus/document-core'
import {resolveSnapGuideLines, type SnapGuide} from '@venus/runtime/interaction'
import type {CanvasRendererProps} from '../../runtime/canvasAdapter.tsx'
import type {SceneShapeSnapshot} from '@venus/runtime/shared-memory'
import {buildSelectionHandles} from '../selection/handleManager.ts'
import {buildSelectionState} from '../selection/selectionManager.ts'
import type {InteractionBounds} from '../types.ts'

interface InteractionOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  viewport: CanvasRendererProps['viewport']
  hoveredShapeId?: string | null
  marqueeBounds?: InteractionBounds | null
  hideSelectionChrome?: boolean
  snapGuides?: SnapGuide[]
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
  const selectedPolygon = useMemo(() => {
    if (!selection.selectedBounds || hideSelectionChrome) {
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
      documentWidth: document.width,
      documentHeight: document.height,
      matrix: viewport.matrix,
    }),
    [document.height, document.width, snapGuides, viewport.matrix],
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
    return (
      <line
        key={`selected-stroke:${shape.id}`}
        x1={shape.x}
        y1={shape.y}
        x2={shape.x + shape.width}
        y2={shape.y + shape.height}
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
    return (
      <line
        key={`hover-stroke:${shape.id}`}
        x1={shape.x}
        y1={shape.y}
        x2={shape.x + shape.width}
        y2={shape.y + shape.height}
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
