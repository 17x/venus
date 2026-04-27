import {type ReactNode} from 'react'
import type {EditorDocument} from '@vector/model'
import {
  resolveNodeTransform,
  toResolvedNodeSvgTransform,
} from '@vector/runtime/engine'
import type {CanvasPresentationConfig} from '@vector/runtime'
import type {DraftPrimitive} from '../types.ts'
import {
  buildDraftPolygonPoints,
  buildDraftStarPoints,
  buildPathStrokeD,
  buildRoundedRectStrokeD,
  toSvgPoints,
} from './interactionOverlayGeometry.ts'

function renderShapeStroke(
  shape: EditorDocument['shapes'][number],
  presentation: CanvasPresentationConfig,
  tone: 'selected' | 'hover' | 'isolation',
) {
  const strokeColor = tone === 'selected'
    ? presentation.overlay.selectionStroke
    : tone === 'hover'
      ? presentation.overlay.hoverStroke
      : 'rgba(100, 116, 139, 0.42)'
  const strokeWidth = tone === 'isolation'
    ? Math.max(1, presentation.overlay.selectionStrokeWidth - 0.5)
    : presentation.overlay.selectionStrokeWidth
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
    if (tone === 'selected' || tone === 'hover') {
      // Masked images already expose clip-shape chrome; suppress host bounds box to avoid duplicate selection frames.
      return null
    }
  }

  if (shape.type === 'ellipse') {
    return (
      <ellipse
        key={`${tone}-stroke:${shape.id}`}
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
        key={`${tone}-stroke:${shape.id}`}
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
        key={`${tone}-stroke:${shape.id}`}
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
        key={`${tone}-stroke:${shape.id}`}
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
          key={`${tone}-stroke:${shape.id}`}
          d={roundedRectD}
          transform={transform}
          {...common}
        />
      )
    }
  }

  return (
    <rect
      key={`${tone}-stroke:${shape.id}`}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      transform={transform}
      {...common}
    />
  )
}

export function renderSelectedShapeStroke(
  shape: EditorDocument['shapes'][number],
  presentation: CanvasPresentationConfig,
) {
  return renderShapeStroke(shape, presentation, 'selected')
}

export function renderHoveredShapeStroke(
  shape: EditorDocument['shapes'][number],
  presentation: CanvasPresentationConfig,
) {
  return renderShapeStroke(shape, presentation, 'hover')
}

export function renderIsolationBackdropShapeStroke(
  shape: EditorDocument['shapes'][number],
  presentation: CanvasPresentationConfig,
) {
  return renderShapeStroke(shape, presentation, 'isolation')
}

export function renderDraftPrimitive(
  draftPrimitive: DraftPrimitive,
  presentation: CanvasPresentationConfig,
): ReactNode {
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