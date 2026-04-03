import {
  convertDrawPointsToBezierPoints,
  getBoundingRectFromBezierPoints,
  nid,
  type DocumentNode,
  type ToolId,
  type ToolName,
} from '@venus/document-core'
import type {ElementProps} from '@lite-u/editor/types'
import type {HistorySummary} from '@venus/editor-worker'
import type {HistoryNodeLike} from './useEditorRuntime.types.ts'

interface PenDraftState {
  points: Array<{x: number; y: number}>
}

export function mapToolNameToToolId(toolName: ToolName): ToolId {
  switch (toolName) {
    case 'rectangle':
      return 'rectangle'
    case 'ellipse':
      return 'ellipse'
    case 'lineSegment':
      return 'lineSegment'
    case 'text':
      return 'text'
    case 'pencil':
    case 'path':
      return 'pen'
    default:
      return 'select'
  }
}

export function buildSelectedProps(shape: DocumentNode | null): ElementProps | null {
  if (!shape) {
    return null
  }

  return {
    id: shape.id,
    type: shape.type,
    name: shape.name,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    points: shape.points?.map((point) => ({...point})),
    bezierPoints: shape.bezierPoints?.map((point) => ({
      anchor: {...point.anchor},
      cp1: point.cp1 ? {...point.cp1} : point.cp1,
      cp2: point.cp2 ? {...point.cp2} : point.cp2,
    })),
    rotation: 0,
    opacity: 1,
    fill: {
      enabled: shape.type !== 'text' && shape.type !== 'lineSegment' && shape.type !== 'path',
      color: '#ffffff',
    },
    stroke: {
      enabled: true,
      color: '#000000',
      weight: 1,
    },
  }
}

export function cloneElementProps(element: ElementProps): ElementProps {
  return {
    ...element,
    points: Array.isArray(element.points)
      ? element.points.map((point) =>
          point && typeof point === 'object'
            ? ({...(point as Record<string, unknown>)})
            : point,
        )
      : undefined,
    bezierPoints: Array.isArray(element.bezierPoints)
      ? element.bezierPoints.map((point) =>
          point && typeof point === 'object'
            ? ({...(point as Record<string, unknown>)})
            : point,
        )
      : undefined,
    fill: element.fill ? {...element.fill} : undefined,
    stroke: element.stroke ? {...element.stroke} : undefined,
  }
}

export function offsetElementPosition(
  element: ElementProps,
  nextX: number,
  nextY: number,
): ElementProps {
  const prevX = Number(element.x ?? 0)
  const prevY = Number(element.y ?? 0)
  const deltaX = nextX - prevX
  const deltaY = nextY - prevY

  return {
    ...cloneElementProps(element),
    x: nextX,
    y: nextY,
    points: Array.isArray(element.points)
      ? element.points.map((point) =>
          point &&
          typeof point === 'object' &&
          typeof (point as {x?: unknown}).x === 'number' &&
          typeof (point as {y?: unknown}).y === 'number'
            ? {
                x: Number((point as {x: number}).x) + deltaX,
                y: Number((point as {y: number}).y) + deltaY,
              }
            : point,
        )
      : undefined,
    bezierPoints: Array.isArray(element.bezierPoints)
      ? element.bezierPoints.map((point) =>
          point && typeof point === 'object' && point.anchor && typeof point.anchor === 'object'
            ? {
                anchor: {
                  x: Number((point.anchor as {x: number}).x) + deltaX,
                  y: Number((point.anchor as {y: number}).y) + deltaY,
                },
                cp1:
                  point.cp1 && typeof point.cp1 === 'object'
                    ? {
                        x: Number((point.cp1 as {x: number}).x) + deltaX,
                        y: Number((point.cp1 as {y: number}).y) + deltaY,
                      }
                    : point.cp1,
                cp2:
                  point.cp2 && typeof point.cp2 === 'object'
                    ? {
                        x: Number((point.cp2 as {x: number}).x) + deltaX,
                        y: Number((point.cp2 as {y: number}).y) + deltaY,
                      }
                    : point.cp2,
              }
            : point,
        )
      : undefined,
  }
}

export function applyMatrixToPoint(matrix: number[], point: {x: number; y: number}) {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}

export function buildHistoryArray(history: HistorySummary): HistoryNodeLike[] {
  return history.entries.map((entry, index, array) => ({
    id: index,
    prev: index > 0 ? {
      id: index - 1,
      prev: null,
      next: null,
      data: {type: array[index - 1].label},
      label: array[index - 1].label,
    } : null,
    next: index < array.length - 1 ? {
      id: index + 1,
      prev: null,
      next: null,
      data: {type: array[index + 1].label},
      label: array[index + 1].label,
    } : null,
    data: {type: entry.label},
    label: entry.label,
  }))
}

export function isPenTool(toolName: ToolName) {
  return toolName === 'pencil' || toolName === 'path'
}

export function appendPenPoint(
  draft: PenDraftState,
  point: {x: number; y: number},
  minDistance = 4,
) {
  const lastPoint = draft.points[draft.points.length - 1]

  if (!lastPoint) {
    draft.points.push(point)
    return
  }

  const dx = point.x - lastPoint.x
  const dy = point.y - lastPoint.y

  if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
    return
  }

  draft.points.push(point)
}

export function createPathElement(points: Array<{x: number; y: number}>): ElementProps {
  const path = convertDrawPointsToBezierPoints(points)
  const bounds = getBoundingRectFromBezierPoints(path.points)

  return {
    id: nid(),
    type: 'path',
    name: 'Path',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points: points.map((point) => ({...point})),
    bezierPoints: path.points.map((point) => ({
      anchor: {...point.anchor},
      cp1: point.cp1 ? {...point.cp1} : point.cp1,
      cp2: point.cp2 ? {...point.cp2} : point.cp2,
    })),
    rotation: 0,
    opacity: 1,
    fill: {
      enabled: false,
      color: '#ffffff',
    },
    stroke: {
      enabled: true,
      color: '#000000',
      weight: 1,
    },
  }
}
