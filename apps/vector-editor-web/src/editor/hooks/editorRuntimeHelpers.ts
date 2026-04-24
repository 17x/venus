import {
  convertDrawPointsToBezierPoints,
  getBoundingRectFromBezierPoints,
  nid,
  type DocumentNode,
  type ToolId,
  type ToolName,
} from '@venus/document-core'
import {getNormalizedBoundsFromBox} from '@vector/runtime/engine'
import type {ElementProps} from '@lite-u/editor/types'
import type {HistorySummary} from '@vector/runtime/worker'
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
    case 'connector':
      return 'lineSegment'
    case 'polygon':
      return 'polygon'
    case 'star':
      return 'star'
    case 'text':
      return 'text'
    case 'pencil':
    case 'path':
      return 'pen'
    default:
      return 'select'
  }
}

export function createShapeElementFromTool(
  toolName: ToolName,
  point: {x: number; y: number},
): ElementProps | null {
  if (toolName === 'rectangle') {
    const width = 140
    const height = 96
    return {
      id: nid(),
      type: 'rectangle',
      name: 'Rectangle',
      x: point.x - width / 2,
      y: point.y - height / 2,
      width,
      height,
      fill: {enabled: true, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 1},
    }
  }

  if (toolName === 'ellipse') {
    const width = 120
    const height = 120
    return {
      id: nid(),
      type: 'ellipse',
      name: 'Ellipse',
      x: point.x - width / 2,
      y: point.y - height / 2,
      width,
      height,
      fill: {enabled: true, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 1},
    }
  }

  if (toolName === 'lineSegment') {
    return {
      id: nid(),
      type: 'lineSegment',
      name: 'Line',
      x: point.x - 80,
      y: point.y - 20,
      width: 160,
      height: 40,
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 2},
    }
  }

  if (toolName === 'connector') {
    return {
      id: nid(),
      type: 'lineSegment',
      name: 'Connector',
      x: point.x - 96,
      y: point.y - 12,
      width: 192,
      height: 24,
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: true, color: '#0f172a', weight: 2},
      strokeEndArrowhead: 'triangle',
    }
  }

  if (toolName === 'polygon') {
    const width = 140
    const height = 120
    const x = point.x - width / 2
    const y = point.y - height / 2
    return {
      id: nid(),
      type: 'polygon',
      name: 'Polygon',
      x,
      y,
      width,
      height,
      points: createPolygonPoints(x, y, width, height),
      fill: {enabled: true, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 1},
    }
  }

  if (toolName === 'star') {
    const width = 140
    const height = 140
    const x = point.x - width / 2
    const y = point.y - height / 2
    return {
      id: nid(),
      type: 'star',
      name: 'Star',
      x,
      y,
      width,
      height,
      points: createStarPoints(x, y, width, height),
      fill: {enabled: true, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 1},
    }
  }

  if (toolName === 'text') {
    const width = 180
    const height = 40
    return {
      id: nid(),
      type: 'text',
      name: 'Text',
      x: point.x - width / 2,
      y: point.y - height / 2,
      width,
      height,
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: false, color: '#111827', weight: 0},
    }
  }

  return null
}

export function isDragCreateTool(toolName: ToolName) {
  return toolName === 'rectangle' ||
    toolName === 'ellipse' ||
    toolName === 'connector' ||
    toolName === 'lineSegment' ||
    toolName === 'polygon' ||
    toolName === 'star' ||
    toolName === 'text'
}

export function createShapeElementFromDrag(
  toolName: ToolName,
  start: {x: number; y: number},
  end: {x: number; y: number},
): ElementProps | null {
  const bounds = getNormalizedBoundsFromBox(start.x, start.y, end.x - start.x, end.y - start.y)
  const width = Math.max(1, bounds.width)
  const height = Math.max(1, bounds.height)
  const x = bounds.minX
  const y = bounds.minY

  if (toolName === 'rectangle') {
    return {
      id: nid(),
      type: 'rectangle',
      name: 'Rectangle',
      x,
      y,
      width,
      height,
      fill: {enabled: true, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 1},
    }
  }

  if (toolName === 'ellipse') {
    return {
      id: nid(),
      type: 'ellipse',
      name: 'Ellipse',
      x,
      y,
      width,
      height,
      fill: {enabled: true, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 1},
    }
  }

  if (toolName === 'lineSegment') {
    return {
      id: nid(),
      type: 'lineSegment',
      name: 'Line',
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
      points: [
        {x: start.x, y: start.y},
        {x: end.x, y: end.y},
      ],
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 2},
    }
  }

  if (toolName === 'connector') {
    return {
      id: nid(),
      type: 'lineSegment',
      name: 'Connector',
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
      points: [
        {x: start.x, y: start.y},
        {x: end.x, y: end.y},
      ],
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: true, color: '#0f172a', weight: 2},
      strokeEndArrowhead: 'triangle',
    }
  }

  if (toolName === 'polygon') {
    return {
      id: nid(),
      type: 'polygon',
      name: 'Polygon',
      x,
      y,
      width,
      height,
      points: createPolygonPoints(x, y, width, height),
      fill: {enabled: true, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 1},
    }
  }

  if (toolName === 'star') {
    return {
      id: nid(),
      type: 'star',
      name: 'Star',
      x,
      y,
      width,
      height,
      points: createStarPoints(x, y, width, height),
      fill: {enabled: true, color: '#ffffff'},
      stroke: {enabled: true, color: '#111827', weight: 1},
    }
  }

  if (toolName === 'text') {
    return {
      id: nid(),
      type: 'text',
      name: 'Text',
      x,
      y,
      width,
      height,
      fill: {enabled: false, color: '#ffffff'},
      stroke: {enabled: false, color: '#111827', weight: 0},
    }
  }

  return null
}

export function buildSelectedProps(shape: DocumentNode | null): ElementProps | null {
  if (!shape) {
    return null
  }

  return {
    id: shape.id,
    type: shape.type,
    name: shape.text ?? shape.name,
    asset: shape.assetId,
    assetUrl: shape.assetUrl,
    clipPathId: shape.clipPathId,
    clipRule: shape.clipRule,
    schemaMeta: shape.schema
      ? {
          sourceNodeType: shape.schema.sourceNodeType,
          sourceNodeKind: shape.schema.sourceNodeKind,
          sourceFeatureKinds: shape.schema.sourceFeatureKinds?.slice(),
        }
      : undefined,
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
    strokeStartArrowhead: shape.strokeStartArrowhead,
    strokeEndArrowhead: shape.strokeEndArrowhead,
    rotation: shape.rotation ?? 0,
    flipX: shape.flipX ?? false,
    flipY: shape.flipY ?? false,
    opacity: 1,
    fill: shape.fill
      ? {...shape.fill}
      : {
          enabled: shape.type !== 'text' && shape.type !== 'lineSegment' && shape.type !== 'path',
          color: '#ffffff',
        },
    stroke: shape.stroke
      ? {...shape.stroke}
      : {
          enabled: true,
          color: '#000000',
          weight: 1,
        },
    shadow: shape.shadow ? {...shape.shadow} : undefined,
    cornerRadius: shape.cornerRadius,
    cornerRadii: shape.cornerRadii ? {...shape.cornerRadii} : undefined,
    ellipseStartAngle: shape.ellipseStartAngle,
    ellipseEndAngle: shape.ellipseEndAngle,
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
    shadow: element.shadow ? {...element.shadow} : undefined,
    cornerRadii: element.cornerRadii ? {...element.cornerRadii} : undefined,
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
          point && typeof point === 'object'
            ? (() => {
                const candidate = point as {
                  anchor?: unknown
                  cp1?: unknown
                  cp2?: unknown
                }
                if (!candidate.anchor || typeof candidate.anchor !== 'object') {
                  return point
                }

                return {
                  anchor: {
                    x: Number((candidate.anchor as {x: number}).x) + deltaX,
                    y: Number((candidate.anchor as {y: number}).y) + deltaY,
                  },
                  cp1:
                    candidate.cp1 && typeof candidate.cp1 === 'object'
                      ? {
                          x: Number((candidate.cp1 as {x: number}).x) + deltaX,
                          y: Number((candidate.cp1 as {y: number}).y) + deltaY,
                        }
                      : candidate.cp1,
                  cp2:
                    candidate.cp2 && typeof candidate.cp2 === 'object'
                      ? {
                          x: Number((candidate.cp2 as {x: number}).x) + deltaX,
                          y: Number((candidate.cp2 as {y: number}).y) + deltaY,
                        }
                      : candidate.cp2,
                }
              })()
            : point,
        )
      : undefined,
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

function createPolygonPoints(x: number, y: number, width: number, height: number) {
  const bounds = getNormalizedBoundsFromBox(x, y, width, height)
  const centerX = bounds.minX + bounds.width / 2
  const centerY = bounds.minY + bounds.height / 2
  const radius = Math.min(bounds.width, bounds.height) / 2
  const sides = 5

  return Array.from({length: sides}, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

function createStarPoints(x: number, y: number, width: number, height: number) {
  const bounds = getNormalizedBoundsFromBox(x, y, width, height)
  const centerX = bounds.minX + bounds.width / 2
  const centerY = bounds.minY + bounds.height / 2
  const outerRadius = Math.min(bounds.width, bounds.height) / 2
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

export function appendPenPoint(
  draft: PenDraftState,
  point: {x: number; y: number},
  minDistance = 3,
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

function simplifyDrawPoints(
  points: Array<{x: number; y: number}>,
  options: {
    minDistance?: number
    maxSegmentLength?: number
    minCornerCos?: number
  } = {},
) {
  const {
    minDistance = 3,
    maxSegmentLength = 28,
    minCornerCos = 0.985,
  } = options

  if (points.length <= 2) {
    return points.map((point) => ({...point}))
  }

  const simplified = [{...points[0]}]

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = simplified[simplified.length - 1]
    const current = points[index]
    const next = points[index + 1]
    const dx = current.x - previous.x
    const dy = current.y - previous.y
    const distance = Math.hypot(dx, dy)

    if (distance >= maxSegmentLength) {
      simplified.push({...current})
      continue
    }

    if (distance < minDistance) {
      continue
    }

    const prevVectorX = current.x - previous.x
    const prevVectorY = current.y - previous.y
    const nextVectorX = next.x - current.x
    const nextVectorY = next.y - current.y
    const prevLength = Math.hypot(prevVectorX, prevVectorY)
    const nextLength = Math.hypot(nextVectorX, nextVectorY)

    if (prevLength === 0 || nextLength === 0) {
      continue
    }

    const cornerCos =
      (prevVectorX * nextVectorX + prevVectorY * nextVectorY) /
      (prevLength * nextLength)

    if (cornerCos <= minCornerCos) {
      simplified.push({...current})
    }
  }

  simplified.push({...points[points.length - 1]})
  return simplified
}

export function createPencilPathElement(points: Array<{x: number; y: number}>): ElementProps {
  // Freehand input is intentionally simplified before bezier conversion so the
  // resulting path stays editable and visually smoother instead of preserving
  // every noisy pointer sample.
  const simplifiedPoints = simplifyDrawPoints(points)
  const path = convertDrawPointsToBezierPoints(simplifiedPoints)
  const bounds = getBoundingRectFromBezierPoints(path.points)

  return {
    id: nid(),
    type: 'path',
    name: 'Path',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points: simplifiedPoints.map((point) => ({...point})),
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

export function createPolylinePathElement(points: Array<{x: number; y: number}>): ElementProps {
  const normalizedPoints = points.map((point) => ({...point}))
  const bounds = normalizedPoints.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxX: Math.max(acc.maxX, point.x),
      maxY: Math.max(acc.maxY, point.y),
    }),
    {
      minX: normalizedPoints[0].x,
      minY: normalizedPoints[0].y,
      maxX: normalizedPoints[0].x,
      maxY: normalizedPoints[0].y,
    },
  )

  return {
    id: nid(),
    type: 'path',
    name: 'Path',
    x: bounds.minX,
    y: bounds.minY,
    width: Math.max(1, bounds.maxX - bounds.minX),
    height: Math.max(1, bounds.maxY - bounds.minY),
    points: normalizedPoints,
    bezierPoints: undefined,
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

export const createPathElement = createPencilPathElement
