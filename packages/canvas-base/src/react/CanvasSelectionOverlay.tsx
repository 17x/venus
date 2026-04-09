import * as React from 'react'
import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  getNormalizedBoundsFromBox,
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
} from '@venus/document-core'
import type {CanvasOverlayProps} from '../renderer/types.ts'
import {buildSelectionHandlesFromBounds} from '../interaction/selectionHandles.ts'
import {applyMatrixToPoint} from '../viewport/matrix.ts'

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function CanvasSelectionOverlay({
  document,
  shapes,
  viewport,
}: CanvasOverlayProps) {
  const handleSize = 8
  const halfHandleSize = handleSize / 2
  const selectedIds = React.useMemo(
    () => shapes.filter((shape) => shape.isSelected).map((shape) => shape.id),
    [shapes],
  )
  const hoveredId = React.useMemo(
    () => shapes.find((shape) => shape.isHovered)?.id ?? null,
    [shapes],
  )
  const selectedBounds = React.useMemo(() => {
    if (selectedIds.length === 0) {
      return null
    }

    return selectedIds
      .map((id) => document.shapes.find((shape) => shape.id === id))
      .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))
      .map((shape) => getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height))
      .reduce<Bounds | null>((acc, bounds) => (acc ? mergeBounds(acc, bounds) : bounds), null)
  }, [document.shapes, selectedIds])
  const singleSelectedShape = React.useMemo(
    () => selectedIds.length === 1
      ? document.shapes.find((shape) => shape.id === selectedIds[0]) ?? null
      : null,
    [document.shapes, selectedIds],
  )
  const hoveredShape = React.useMemo(
    () => hoveredId ? document.shapes.find((shape) => shape.id === hoveredId) ?? null : null,
    [document.shapes, hoveredId],
  )
  const handles = React.useMemo(() => {
    if (!selectedBounds) {
      return []
    }
    return buildSelectionHandlesFromBounds(selectedBounds, {
      rotateOffset: 28,
      rotateDegrees: singleSelectedShape?.rotation ?? 0,
    })
  }, [selectedBounds, singleSelectedShape?.rotation])
  const hoveredPolygon = React.useMemo(() => {
    if (!hoveredShape || selectedIds.includes(hoveredShape.id)) {
      return null
    }
    const bounds = getNormalizedBoundsFromBox(hoveredShape.x, hoveredShape.y, hoveredShape.width, hoveredShape.height)
    const rotation = resolveNodeTransform(hoveredShape).rotation
    return projectPolygon(
      buildRectPolygon(bounds, rotation),
      viewport.matrix,
    )
  }, [hoveredShape, selectedIds, viewport.matrix])
  const selectedShapes = React.useMemo(
    () => selectedIds
      .map((id) => document.shapes.find((shape) => shape.id === id))
      .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape)),
    [document.shapes, selectedIds],
  )
  const selectedPolygon = React.useMemo(() => {
    if (!selectedBounds) {
      return null
    }
    const rotation = singleSelectedShape?.rotation ?? 0
    return projectPolygon(
      buildRectPolygon(selectedBounds, rotation),
      viewport.matrix,
    )
  }, [selectedBounds, singleSelectedShape?.rotation, viewport.matrix])
  const screenHandles = React.useMemo(
    () => handles.map((handle) => ({
      ...handle,
      ...projectPoint(handle, viewport.matrix),
    })),
    [handles, viewport.matrix],
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
          {selectedShapes.map((shape) => renderSelectedShapeStroke(shape))}
        </g>

        {hoveredPolygon && (
          <polygon
            points={toSvgPoints(hoveredPolygon)}
            fill="none"
            stroke="rgba(14, 165, 233, 0.9)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 3"
          />
        )}

        {selectedPolygon && (
          <polygon
            points={toSvgPoints(selectedPolygon)}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {screenHandles.map((handle) => (
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
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  )
}

function mergeBounds(left: Bounds, right: Bounds): Bounds {
  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
  }
}

function buildRectPolygon(
  bounds: Bounds,
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
  matrix: CanvasOverlayProps['viewport']['matrix'],
) {
  return points.map((point) => projectPoint(point, matrix))
}

function projectPoint(
  point: {x: number; y: number},
  matrix: CanvasOverlayProps['viewport']['matrix'],
) {
  return applyMatrixToPoint(matrix, point)
}

function toSvgPoints(points: Array<{x: number; y: number}>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function renderSelectedShapeStroke(shape: CanvasOverlayProps['document']['shapes'][number]) {
  const strokeColor = '#2563eb'
  const strokeWidth = 1
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

function buildPathStrokeD(shape: CanvasOverlayProps['document']['shapes'][number]) {
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
