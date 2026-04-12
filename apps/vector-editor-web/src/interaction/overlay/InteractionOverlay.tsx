import {useMemo} from 'react'
import {applyMatrixToPoint} from '@venus/runtime'
import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
} from '@venus/engine'
import type {EditorDocument} from '@venus/document-core'
import {resolveSnapGuideLines, type SnapGuide} from '@venus/runtime/interaction'
import type {CanvasRendererProps} from '../../runtime/canvasAdapter.tsx'
import type {SceneShapeSnapshot} from '@venus/shared-memory'
import {buildSelectionHandles} from '../selection/handleManager.ts'
import {buildSelectionState} from '../selection/selectionManager.ts'
import type {InteractionBounds} from '../types.ts'

const SELECTED_STROKE_WIDTH = 1
const HOVER_STROKE_WIDTH = 1

interface InteractionOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  viewport: CanvasRendererProps['viewport']
  hoveredShapeId?: string | null
  marqueeBounds?: InteractionBounds | null
  hideSelectionChrome?: boolean
  snapGuides?: SnapGuide[]
}

export function InteractionOverlay({
  document,
  shapes,
  viewport,
  hoveredShapeId = null,
  marqueeBounds = null,
  hideSelectionChrome = false,
  snapGuides = [],
}: InteractionOverlayProps) {
  const handleSize = 8
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
    const rotation = singleSelectedShape?.rotation ?? 0
    return buildRectPolygon(selection.selectedBounds, rotation)
  }, [hideSelectionChrome, selection.selectedBounds, singleSelectedShape?.rotation])
  const screenHandles = useMemo(
    () => handles.map((handle) => ({
      ...handle,
      ...projectPoint(handle, viewport.matrix),
    })),
    [handles, viewport.matrix],
  )
  const marqueePolygon = useMemo(
    () => marqueeBounds ? projectPolygon(buildRectPolygon(marqueeBounds, 0), viewport.matrix) : null,
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

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        style={{
          position: 'absolute',
          inset: 0,
        }}
        width="100%"
        height="100%"
      >
        <g transform={`matrix(${viewport.matrix[0]}, ${viewport.matrix[3]}, ${viewport.matrix[1]}, ${viewport.matrix[4]}, ${viewport.matrix[2]}, ${viewport.matrix[5]})`}>
          {hoveredShape && renderHoveredShapeStroke(hoveredShape)}
          {selectedShapes.map((shape) => renderSelectedShapeStroke(shape))}

          {selectedPolygon && (
            <polygon
              points={toSvgPoints(selectedPolygon)}
              fill="none"
              stroke="#2563eb"
              strokeWidth={SELECTED_STROKE_WIDTH}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>

        {hoveredCenterScreen && (
          <circle
            cx={hoveredCenterScreen.x}
            cy={hoveredCenterScreen.y}
            r={4}
            fill="rgba(14, 165, 233, 0.95)"
            stroke="rgba(14, 165, 233, 0.95)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {!hideSelectionChrome && screenHandles.map((handle) => (
          <rect
            key={handle.id}
            x={handle.x - halfHandleSize}
            y={handle.y - halfHandleSize}
            width={handleSize}
            height={handleSize}
            rx={handle.kind === 'rotate' ? handleSize / 2 : 2}
            ry={handle.kind === 'rotate' ? handleSize / 2 : 2}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={SELECTED_STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {marqueePolygon && (
          <polygon
            points={toSvgPoints(marqueePolygon)}
            fill="rgba(37, 99, 235, 0.12)"
            stroke="rgba(37, 99, 235, 0.95)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 3"
          />
        )}
        {snapLines.map((line) => (
          <line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(248, 113, 113, 0.95)"
            strokeWidth={1}
            strokeDasharray="5 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  )
}

function renderSelectedShapeStroke(shape: EditorDocument['shapes'][number]) {
  const strokeColor = '#2563eb'
  const strokeWidth = SELECTED_STROKE_WIDTH
  const common = {
    fill: 'none',
    stroke: strokeColor,
    strokeWidth,
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

function renderHoveredShapeStroke(shape: EditorDocument['shapes'][number]) {
  const strokeColor = 'rgba(14, 165, 233, 0.9)'
  const strokeWidth = HOVER_STROKE_WIDTH
  const common = {
    fill: 'none',
    stroke: strokeColor,
    strokeWidth,
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

function buildRectPolygon(
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
  rotationDegrees: number,
) {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const corners = [
    {x: bounds.minX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.minY},
    {x: bounds.maxX, y: bounds.maxY},
    {x: bounds.minX, y: bounds.maxY},
  ]
  if (Math.abs(rotationDegrees) <= 0.0001) {
    return corners
  }
  const matrix = createAffineMatrixAroundPoint(
    {x: centerX, y: centerY},
    {rotationDegrees},
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
