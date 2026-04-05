import * as React from 'react'
import type {CanvasOverlayProps} from '../renderer/types.ts'

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
      .map((shape) => normalizeBounds(shape.x, shape.y, shape.width, shape.height))
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
    const centerX = (selectedBounds.minX + selectedBounds.maxX) / 2
    const centerY = (selectedBounds.minY + selectedBounds.maxY) / 2
    const rotateOffset = 28

    const nextHandles = [
      {id: 'nw', x: selectedBounds.minX, y: selectedBounds.minY, round: false},
      {id: 'n', x: centerX, y: selectedBounds.minY, round: false},
      {id: 'ne', x: selectedBounds.maxX, y: selectedBounds.minY, round: false},
      {id: 'e', x: selectedBounds.maxX, y: centerY, round: false},
      {id: 'se', x: selectedBounds.maxX, y: selectedBounds.maxY, round: false},
      {id: 's', x: centerX, y: selectedBounds.maxY, round: false},
      {id: 'sw', x: selectedBounds.minX, y: selectedBounds.maxY, round: false},
      {id: 'w', x: selectedBounds.minX, y: centerY, round: false},
      {id: 'rotate', x: centerX, y: selectedBounds.minY - rotateOffset, round: true},
    ]
    const rotation = singleSelectedShape?.rotation ?? 0
    if (Math.abs(rotation) <= 0.0001) {
      return nextHandles
    }

    return nextHandles.map((handle) => ({
      ...handle,
      ...rotatePointAround(handle.x, handle.y, centerX, centerY, rotation),
    }))
  }, [selectedBounds, singleSelectedShape?.rotation])
  const hoveredPolygon = React.useMemo(() => {
    if (!hoveredShape || selectedIds.includes(hoveredShape.id)) {
      return null
    }
    const bounds = normalizeBounds(hoveredShape.x, hoveredShape.y, hoveredShape.width, hoveredShape.height)
    const rotation = hoveredShape.rotation ?? 0
    return projectPolygon(
      buildRectPolygon(bounds, rotation),
      viewport.matrix,
    )
  }, [hoveredShape, selectedIds, viewport.matrix])
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
            rx={handle.round ? handleSize / 2 : 2}
            ry={handle.round ? handleSize / 2 : 2}
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

function normalizeBounds(x: number, y: number, width: number, height: number): Bounds {
  return {
    minX: Math.min(x, x + width),
    minY: Math.min(y, y + height),
    maxX: Math.max(x, x + width),
    maxY: Math.max(y, y + height),
  }
}

function mergeBounds(left: Bounds, right: Bounds): Bounds {
  return {
    minX: Math.min(left.minX, right.minX),
    minY: Math.min(left.minY, right.minY),
    maxX: Math.max(left.maxX, right.maxX),
    maxY: Math.max(left.maxY, right.maxY),
  }
}

function rotatePointAround(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  rotateDegrees: number,
) {
  const angle = (rotateDegrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = x - centerX
  const dy = y - centerY

  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
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
  return corners.map((point) => rotatePointAround(point.x, point.y, centerX, centerY, rotationDegrees))
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
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}

function toSvgPoints(points: Array<{x: number; y: number}>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}
