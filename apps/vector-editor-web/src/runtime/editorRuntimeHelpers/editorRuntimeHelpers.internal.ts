import {getNormalizedBoundsFromBox} from '../../runtime/engine-bridge/engine.ts'
import {type ElementProps} from '../../runtime/types/index.ts'
import type {HistorySummary} from '../../runtime/worker/index.ts'
import type {HistoryNodeLike} from '../useEditorRuntime/types.ts'

/**
 * Creates a centered rectangle/ellipse element for click-insert tool flows.
 * @param type Shape type to create.
 * @param name Display name.
 * @param point Insertion point.
 * @param width Default width.
 * @param height Default height.
 * @param id Newly allocated shape id.
 */
export function createCenteredBoxToolElement(
  type: 'rectangle' | 'ellipse',
  name: string,
  point: {x: number; y: number},
  width: number,
  height: number,
  id: string,
): ElementProps {
  return {
    id,
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

/**
 * Creates a centered line-like element for click-insert tool flows.
 * @param name Display name.
 * @param point Insertion point.
 * @param width Default width.
 * @param height Default height.
 * @param strokeColor Stroke color.
 * @param id Newly allocated shape id.
 * @param strokeEndArrowhead Optional arrowhead.
 */
export function createLineLikeToolElement(
  name: string,
  point: {x: number; y: number},
  width: number,
  height: number,
  strokeColor: string,
  id: string,
  strokeEndArrowhead?: ElementProps['strokeEndArrowhead'],
): ElementProps {
  return {
    id,
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

/**
 * Creates a box shape from drag bounds.
 * @param type Shape type.
 * @param name Display name.
 * @param x Left.
 * @param y Top.
 * @param width Width.
 * @param height Height.
 * @param id Newly allocated shape id.
 */
export function createDragBoxShapeElement(
  type: 'rectangle' | 'ellipse',
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  id: string,
): ElementProps {
  return {
    id,
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

/**
 * Creates a line-like shape from pointer drag points.
 * @param name Display name.
 * @param start Drag start.
 * @param end Drag end.
 * @param strokeColor Stroke color.
 * @param id Newly allocated shape id.
 * @param strokeEndArrowhead Optional arrowhead.
 */
export function createDragLineLikeShapeElement(
  name: string,
  start: {x: number; y: number},
  end: {x: number; y: number},
  strokeColor: string,
  id: string,
  strokeEndArrowhead?: ElementProps['strokeEndArrowhead'],
): ElementProps {
  return {
    id,
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

/**
 * Builds polygon points from drag bounds.
 * @param x Left.
 * @param y Top.
 * @param width Width.
 * @param height Height.
 */
export function createPolygonPoints(x: number, y: number, width: number, height: number) {
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

/**
 * Builds star points from drag bounds.
 * @param x Left.
 * @param y Top.
 * @param width Width.
 * @param height Height.
 */
export function createStarPoints(x: number, y: number, width: number, height: number) {
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

/**
 * Deep-clones element point arrays.
 * @param points Source points.
 */
export function cloneElementPoints(points: ElementProps['points']) {
  return Array.isArray(points)
    ? points.map((point) =>
        point && typeof point === 'object'
          ? ({...(point as Record<string, unknown>)})
          : point,
      )
    : undefined
}

/**
 * Deep-clones element bezier point arrays.
 * @param bezierPoints Source bezier points.
 */
export function cloneElementBezierPoints(bezierPoints: ElementProps['bezierPoints']) {
  return Array.isArray(bezierPoints)
    ? bezierPoints.map((point) =>
        point && typeof point === 'object'
          ? ({...(point as Record<string, unknown>)})
          : point,
      )
    : undefined
}

/**
 * Clones style-like objects when present.
 * @param value Source value.
 */
export function cloneStyleLike<T extends object | undefined>(value: T): T {
  return (value ? {...value} : undefined) as T
}

/**
 * Offsets plain points by one delta.
 * @param points Source points.
 * @param deltaX X delta.
 * @param deltaY Y delta.
 */
export function offsetElementPoints(
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

/**
 * Offsets bezier points by one delta.
 * @param bezierPoints Source bezier points.
 * @param deltaX X delta.
 * @param deltaY Y delta.
 */
export function offsetElementBezierPoints(
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

/**
 * Creates one lightweight neighbor entry for history graph rendering.
 * @param label Entry label.
 * @param id Entry id.
 */
export function createHistoryNeighborEntry(
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

/**
 * Creates one history-node projection with adjacent neighbors.
 * @param label Current label.
 * @param index Current index.
 * @param entries Full history entries.
 */
export function createHistoryNodeLikeEntry(
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

/**
 * Simplifies raw draw points for stable path conversion.
 * @param points Input points.
 * @param options Simplification thresholds.
 */
export function simplifyDrawPoints(
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
