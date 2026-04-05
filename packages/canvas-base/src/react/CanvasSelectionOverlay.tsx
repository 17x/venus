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

  const viewportTransform = `matrix(${viewport.matrix[0]}, ${viewport.matrix[3]}, ${viewport.matrix[1]}, ${viewport.matrix[4]}, ${viewport.matrix[2]}, ${viewport.matrix[5]})`

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: viewportTransform,
          transformOrigin: '0 0',
        }}
      >
        {hoveredShape && !selectedIds.includes(hoveredShape.id) && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(hoveredShape.x, hoveredShape.x + hoveredShape.width),
              top: Math.min(hoveredShape.y, hoveredShape.y + hoveredShape.height),
              width: Math.abs(hoveredShape.width),
              height: Math.abs(hoveredShape.height),
              border: '1px dashed rgba(14, 165, 233, 0.9)',
              boxSizing: 'border-box',
            }}
          />
        )}

        {selectedBounds && (
          <div
            style={{
              position: 'absolute',
              left: selectedBounds.minX,
              top: selectedBounds.minY,
              width: selectedBounds.maxX - selectedBounds.minX,
              height: selectedBounds.maxY - selectedBounds.minY,
              border: '1px solid #2563eb',
              boxSizing: 'border-box',
              // Keep single-selection chrome aligned with element-local rotation.
              transform:
                singleSelectedShape && (singleSelectedShape.rotation ?? 0) !== 0
                  ? `rotate(${singleSelectedShape.rotation ?? 0}deg)`
                  : undefined,
              transformOrigin: 'center',
            }}
          />
        )}

        {handles.map((handle) => (
          <div
            key={handle.id}
            style={{
              position: 'absolute',
              left: handle.x - 4,
              top: handle.y - 4,
              width: 8,
              height: 8,
              borderRadius: handle.round ? '50%' : 2,
              background: '#ffffff',
              border: '1px solid #2563eb',
              boxSizing: 'border-box',
            }}
          />
        ))}
      </div>
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
