import {
  convertDrawPointsToBezierPoints,
  getBoundingRectFromBezierPoints,
  nid,
  type DocumentNode,
  type ToolId,
  type ToolName,
} from '@vector/model'
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
    return createCenteredBoxToolElement('rectangle', 'Rectangle', point, 140, 96)
  }

  if (toolName === 'ellipse') {
    return createCenteredBoxToolElement('ellipse', 'Ellipse', point, 120, 120)
  }

  if (toolName === 'lineSegment') {
    return createLineLikeToolElement('Line', point, 160, 40, '#111827')
  }

  if (toolName === 'connector') {
    return createLineLikeToolElement('Connector', point, 192, 24, '#0f172a', 'triangle')
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
    return createDragBoxShapeElement('rectangle', 'Rectangle', x, y, width, height)
  }

  if (toolName === 'ellipse') {
    return createDragBoxShapeElement('ellipse', 'Ellipse', x, y, width, height)
  }

  if (toolName === 'lineSegment') {
    return createDragLineLikeShapeElement('Line', start, end, '#111827')
  }

  if (toolName === 'connector') {
    return createDragLineLikeShapeElement('Connector', start, end, '#0f172a', 'triangle')
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
    schemaMeta: resolveSelectedSchemaMeta(shape),
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
    fill: resolveSelectedFill(shape),
    stroke: resolveSelectedStroke(shape),
    shadow: shape.shadow ? {...shape.shadow} : undefined,
    cornerRadius: shape.cornerRadius,
    cornerRadii: shape.cornerRadii ? {...shape.cornerRadii} : undefined,
    ellipseStartAngle: shape.ellipseStartAngle,
    ellipseEndAngle: shape.ellipseEndAngle,
  }
}

function resolveSelectedSchemaMeta(shape: DocumentNode) {
  return shape.schema
    ? {
        sourceNodeType: shape.schema.sourceNodeType,
        sourceNodeKind: shape.schema.sourceNodeKind,
        sourceFeatureKinds: shape.schema.sourceFeatureKinds?.slice(),
      }
    : undefined
}

function resolveSelectedFill(shape: DocumentNode) {
  return shape.fill
    ? {...shape.fill}
    : {
        enabled: shape.type !== 'text' && shape.type !== 'lineSegment' && shape.type !== 'path',
        color: '#ffffff',
      }
}

function resolveSelectedStroke(shape: DocumentNode) {
  return shape.stroke
    ? {...shape.stroke}
    : {
        enabled: true,
        color: '#000000',
        weight: 1,
      }
}

export function cloneElementProps(element: ElementProps): ElementProps {
  return {
    ...element,
    points: cloneElementPoints(element.points),
    bezierPoints: cloneElementBezierPoints(element.bezierPoints),
    fill: cloneStyleLike(element.fill),
    stroke: cloneStyleLike(element.stroke),
    shadow: cloneStyleLike(element.shadow),
    cornerRadii: cloneStyleLike(element.cornerRadii),
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
    points: offsetElementPoints(element.points, deltaX, deltaY),
    bezierPoints: offsetElementBezierPoints(element.bezierPoints, deltaX, deltaY),
  }
}

export function buildHistoryArray(history: HistorySummary): HistoryNodeLike[] {
  return history.entries.map((entry, index, array) => createHistoryNodeLikeEntry(entry.label, index, array))
}

export function isPenTool(toolName: ToolName) {
  return toolName === 'pencil' || toolName === 'path'
}

function createCenteredBoxToolElement(
  type: 'rectangle' | 'ellipse',
  name: string,
  point: {x: number; y: number},
  width: number,
  height: number,
): ElementProps {
  return {
    id: nid(),
    type,
    name,
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height,
    fill: {enabled: true, color: '#ffffff'},
    stroke: {enabled: true, color: '#111827', weight: 1},
  }
}

function createLineLikeToolElement(
  name: string,
  point: {x: number; y: number},
  width: number,
  height: number,
  strokeColor: string,
  strokeEndArrowhead?: ElementProps['strokeEndArrowhead'],
): ElementProps {
  return {
    id: nid(),
    type: 'lineSegment',
    name,
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height,
    fill: {enabled: false, color: '#ffffff'},
    stroke: {enabled: true, color: strokeColor, weight: 2},
    strokeEndArrowhead,
  }
}

function createDragBoxShapeElement(
  type: 'rectangle' | 'ellipse',
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
): ElementProps {
  return {
    id: nid(),
    type,
    name,
    x,
    y,
    width,
    height,
    fill: {enabled: true, color: '#ffffff'},
    stroke: {enabled: true, color: '#111827', weight: 1},
  }
}

function createDragLineLikeShapeElement(
  name: string,
  start: {x: number; y: number},
  end: {x: number; y: number},
  strokeColor: string,
  strokeEndArrowhead?: ElementProps['strokeEndArrowhead'],
): ElementProps {
  return {
    id: nid(),
    type: 'lineSegment',
    name,
    x: start.x,
    y: start.y,
    width: end.x - start.x,
    height: end.y - start.y,
    points: [
      {x: start.x, y: start.y},
      {x: end.x, y: end.y},
    ],
    fill: {enabled: false, color: '#ffffff'},
    stroke: {enabled: true, color: strokeColor, weight: 2},
    strokeEndArrowhead,
  }
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

function cloneElementPoints(points: ElementProps['points']) {
  return Array.isArray(points)
    ? points.map((point) =>
        point && typeof point === 'object'
          ? ({...(point as Record<string, unknown>)})
          : point,
      )
    : undefined
}

function cloneElementBezierPoints(bezierPoints: ElementProps['bezierPoints']) {
  return Array.isArray(bezierPoints)
    ? bezierPoints.map((point) =>
        point && typeof point === 'object'
          ? ({...(point as Record<string, unknown>)})
          : point,
      )
    : undefined
}

function cloneStyleLike<T extends object | undefined>(value: T): T {
  return (value ? {...value} : undefined) as T
}

function offsetElementPoints(
  points: ElementProps['points'],
  deltaX: number,
  deltaY: number,
) {
  return Array.isArray(points)
    ? points.map((point) =>
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
    : undefined
}

function offsetElementBezierPoints(
  bezierPoints: ElementProps['bezierPoints'],
  deltaX: number,
  deltaY: number,
) {
  return Array.isArray(bezierPoints)
    ? bezierPoints.map((point) => {
        if (!point || typeof point !== 'object') {
          return point
        }

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
      })
    : undefined
}

function createHistoryNeighborEntry(
  label: string,
  id: number,
): HistoryNodeLike {
  return {
    id,
    prev: null,
    next: null,
    data: {type: label},
    label,
  }
}

function createHistoryNodeLikeEntry(
  label: string,
  index: number,
  entries: HistorySummary['entries'],
): HistoryNodeLike {
  return {
    id: index,
    prev: index > 0 ? createHistoryNeighborEntry(entries[index - 1].label, index - 1) : null,
    next: index < entries.length - 1 ? createHistoryNeighborEntry(entries[index + 1].label, index + 1) : null,
    data: {type: label},
    label,
  }
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
