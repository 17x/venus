import {useMemo} from 'react'
import type {CanvasRendererProps} from '@venus/canvas-base'
import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@venus/shared-memory'
import {buildSelectionHandles} from '../selection/handleManager.ts'
import {buildSelectionState} from '../selection/selectionManager.ts'
import type {InteractionBounds} from '../types.ts'

interface InteractionOverlayProps {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  viewport: CanvasRendererProps['viewport']
  marqueeBounds?: InteractionBounds | null
  hideSelectionChrome?: boolean
}

export function InteractionOverlay({
  document,
  shapes,
  viewport,
  marqueeBounds = null,
  hideSelectionChrome = false,
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
    () => selection.hoverId ? document.shapes.find((shape) => shape.id === selection.hoverId) : null,
    [document.shapes, selection.hoverId],
  )
  const hoveredPolygon = useMemo(() => {
    if (!hovered || selection.selectedIds.includes(hovered.id)) {
      return null
    }
    const bounds = getNormalizedBounds(hovered.x, hovered.y, hovered.width, hovered.height)
    const rotation = hovered.rotation ?? 0
    return projectPolygon(
      buildRectPolygon(bounds, rotation),
      viewport.matrix,
    )
  }, [hovered, selection.selectedIds, viewport.matrix])
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
    return projectPolygon(
      buildRectPolygon(selection.selectedBounds, rotation),
      viewport.matrix,
    )
  }, [hideSelectionChrome, selection.selectedBounds, singleSelectedShape?.rotation, viewport.matrix])
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
            strokeWidth={1}
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
      </svg>
    </div>
  )
}

function renderSelectedShapeStroke(shape: EditorDocument['shapes'][number]) {
  const strokeColor = '#2563eb'
  const strokeWidth = 1
  const common = {
    fill: 'none',
    stroke: strokeColor,
    strokeWidth,
    vectorEffect: 'non-scaling-stroke' as const,
  }
  const rotation = shape.rotation ?? 0
  const centerX = shape.x + shape.width / 2
  const centerY = shape.y + shape.height / 2
  const scaleX = shape.flipX ? -1 : 1
  const scaleY = shape.flipY ? -1 : 1
  const needsTransform = Math.abs(rotation) > 0.0001 || shape.flipX || shape.flipY
  const transform = needsTransform
    ? `translate(${centerX} ${centerY}) rotate(${rotation}) scale(${scaleX} ${scaleY}) translate(${-centerX} ${-centerY})`
    : undefined

  if (shape.type === 'group') {
    return null
  }

  if (shape.type === 'ellipse') {
    return (
      <ellipse
        key={`selected-stroke:${shape.id}`}
        cx={shape.x + shape.width / 2}
        cy={shape.y + shape.height / 2}
        rx={Math.abs(shape.width) / 2}
        ry={Math.abs(shape.height) / 2}
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

function getNormalizedBounds(x: number, y: number, width: number, height: number) {
  return {
    minX: Math.min(x, x + width),
    minY: Math.min(y, y + height),
    maxX: Math.max(x, x + width),
    maxY: Math.max(y, y + height),
  }
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
  return corners.map((point) => rotatePointAround(point, centerX, centerY, rotationDegrees))
}

function rotatePointAround(
  point: {x: number; y: number},
  centerX: number,
  centerY: number,
  rotationDegrees: number,
) {
  const angle = (rotationDegrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - centerX
  const dy = point.y - centerY

  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  }
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
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}

function toSvgPoints(points: Array<{x: number; y: number}>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}
