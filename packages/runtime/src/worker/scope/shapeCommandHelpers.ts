import type {DocumentNode, EditorDocument, Point} from '@venus/document-core'
import type {HistoryPatch} from '../history.ts'

export type ShapeAlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
export type ShapeAlignReference = 'selection' | 'first'
export type ShapeDistributeMode = 'hspace' | 'vspace'

function clonePoints(points: Point[] | undefined): Point[] | undefined {
  if (!Array.isArray(points)) return undefined
  return points.map((point) => ({x: point.x, y: point.y}))
}

function isClosed(points: Point[]) {
  if (points.length < 2) return false
  const first = points[0]
  const last = points[points.length - 1]
  return first.x === last.x && first.y === last.y
}

function ensureClosed(points: Point[]) {
  if (points.length === 0) return points
  if (isClosed(points)) return points
  const first = points[0]
  return [...points, {x: first.x, y: first.y}]
}

function toRectPoints(shape: DocumentNode): Point[] {
  const x1 = shape.x
  const y1 = shape.y
  const x2 = shape.x + shape.width
  const y2 = shape.y + shape.height
  return [
    {x: x1, y: y1},
    {x: x2, y: y1},
    {x: x2, y: y2},
    {x: x1, y: y2},
    {x: x1, y: y1},
  ]
}

function toEllipsePoints(shape: DocumentNode, segments = 16): Point[] {
  const centerX = shape.x + shape.width / 2
  const centerY = shape.y + shape.height / 2
  const radiusX = Math.abs(shape.width / 2)
  const radiusY = Math.abs(shape.height / 2)
  const points: Point[] = []

  for (let index = 0; index <= segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments
    points.push({
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle),
    })
  }

  return points
}

function toLinePoints(shape: DocumentNode): Point[] {
  if (Array.isArray(shape.points) && shape.points.length >= 2) {
    return [{x: shape.points[0].x, y: shape.points[0].y}, {x: shape.points[shape.points.length - 1].x, y: shape.points[shape.points.length - 1].y}]
  }

  return [
    {x: shape.x, y: shape.y},
    {x: shape.x + shape.width, y: shape.y + shape.height},
  ]
}

function resolvePathPoints(shape: DocumentNode): Point[] | null {
  if (shape.type === 'rectangle') return toRectPoints(shape)
  if (shape.type === 'ellipse') return toEllipsePoints(shape)
  if (shape.type === 'lineSegment') return toLinePoints(shape)
  if (shape.type === 'polygon' || shape.type === 'star') {
    if (Array.isArray(shape.points) && shape.points.length >= 2) {
      return ensureClosed(clonePoints(shape.points) ?? [])
    }
    return toRectPoints(shape)
  }

  if (shape.type === 'path') {
    if (!Array.isArray(shape.points) || shape.points.length < 2) return null
    return clonePoints(shape.points) ?? null
  }

  return null
}

export function convertShapeToPathShape(shape: DocumentNode): DocumentNode | null {
  if (shape.type === 'group' || shape.type === 'frame' || shape.type === 'text' || shape.type === 'image') {
    return null
  }

  if (shape.type === 'path') {
    return null
  }

  const points = resolvePathPoints(shape)
  if (!points || points.length < 2) return null

  return {
    ...shape,
    type: 'path',
    points,
    bezierPoints: undefined,
    cornerRadius: undefined,
    cornerRadii: undefined,
    ellipseStartAngle: undefined,
    ellipseEndAngle: undefined,
  }
}

function resolveAlignTargets(document: EditorDocument, shapeIds: string[]): DocumentNode[] {
  const seen = new Set<string>()
  const targets: DocumentNode[] = []

  shapeIds.forEach((shapeId) => {
    if (seen.has(shapeId)) return
    const shape = document.shapes.find((item) => item.id === shapeId)
    if (!shape || shape.type === 'frame') return
    seen.add(shapeId)
    targets.push(shape)
  })

  return targets
}

function getTargetBounds(targets: DocumentNode[]) {
  const minX = Math.min(...targets.map((shape) => shape.x))
  const minY = Math.min(...targets.map((shape) => shape.y))
  const maxX = Math.max(...targets.map((shape) => shape.x + shape.width))
  const maxY = Math.max(...targets.map((shape) => shape.y + shape.height))
  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: minX + (maxX - minX) / 2,
    centerY: minY + (maxY - minY) / 2,
  }
}

function getCenter(shape: DocumentNode, mode: ShapeDistributeMode) {
  return mode === 'hspace'
    ? shape.x + shape.width / 2
    : shape.y + shape.height / 2
}

export function createAlignMovePatches(
  document: EditorDocument,
  shapeIds: string[],
  mode: ShapeAlignMode,
  reference: ShapeAlignReference,
): Array<Extract<HistoryPatch, {type: 'move-shape'}>> {
  const targets = resolveAlignTargets(document, shapeIds)
  if (targets.length < 2) return []

  const referenceBounds = reference === 'first'
    ? getTargetBounds([targets[0]])
    : getTargetBounds(targets)

  return targets
    .map((shape) => {
      // Keep the first shape pinned when explicit first-shape alignment is requested.
      if (reference === 'first' && shape.id === targets[0].id) {
        return null
      }

      let nextX = shape.x
      let nextY = shape.y

      if (mode === 'left') {
        nextX = referenceBounds.minX
      } else if (mode === 'hcenter') {
        nextX = referenceBounds.centerX - shape.width / 2
      } else if (mode === 'right') {
        nextX = referenceBounds.maxX - shape.width
      } else if (mode === 'top') {
        nextY = referenceBounds.minY
      } else if (mode === 'vcenter') {
        nextY = referenceBounds.centerY - shape.height / 2
      } else if (mode === 'bottom') {
        nextY = referenceBounds.maxY - shape.height
      }

      if (nextX === shape.x && nextY === shape.y) return null

      return {
        type: 'move-shape' as const,
        shapeId: shape.id,
        prevX: shape.x,
        prevY: shape.y,
        nextX,
        nextY,
      }
    })
    .filter((patch): patch is Extract<HistoryPatch, {type: 'move-shape'}> => patch !== null)
}

export function createDistributeMovePatches(
  document: EditorDocument,
  shapeIds: string[],
  mode: ShapeDistributeMode,
): Array<Extract<HistoryPatch, {type: 'move-shape'}>> {
  const targets = resolveAlignTargets(document, shapeIds)
  if (targets.length < 3) return []

  const sorted = [...targets].sort((left, right) => getCenter(left, mode) - getCenter(right, mode))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const span = getCenter(last, mode) - getCenter(first, mode)
  const step = span / (sorted.length - 1)
  if (!Number.isFinite(step) || step === 0) {
    return []
  }

  return sorted
    .map((shape, index) => {
      if (index === 0 || index === sorted.length - 1) {
        return null
      }

      const expectedCenter = getCenter(first, mode) + step * index
      const nextX = mode === 'hspace'
        ? expectedCenter - shape.width / 2
        : shape.x
      const nextY = mode === 'vspace'
        ? expectedCenter - shape.height / 2
        : shape.y

      if (nextX === shape.x && nextY === shape.y) {
        return null
      }

      return {
        type: 'move-shape' as const,
        shapeId: shape.id,
        prevX: shape.x,
        prevY: shape.y,
        nextX,
        nextY,
      }
    })
    .filter((patch): patch is Extract<HistoryPatch, {type: 'move-shape'}> => patch !== null)
}
