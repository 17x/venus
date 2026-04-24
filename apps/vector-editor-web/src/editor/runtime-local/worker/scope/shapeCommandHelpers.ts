import {nid, type DocumentNode, type EditorDocument, type Point} from '@venus/document-core'
import * as polygonClipping from 'polygon-clipping'
import type {HistoryPatch} from '../history.ts'

export type ShapeAlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
export type ShapeAlignReference = 'selection' | 'first'
export type ShapeDistributeMode = 'hspace' | 'vspace'
export type ShapeBooleanMode = 'union' | 'subtract' | 'intersect'

const polygonBooleanOps = resolvePolygonBooleanOps()

function resolvePolygonBooleanOps() {
  type PolygonBooleanOps = {
    union: typeof polygonClipping.union
    intersection: typeof polygonClipping.intersection
    difference: typeof polygonClipping.difference
  }

  const direct = polygonClipping as unknown as Partial<PolygonBooleanOps>
  if (
    typeof direct.union === 'function' &&
    typeof direct.intersection === 'function' &&
    typeof direct.difference === 'function'
  ) {
    return direct as PolygonBooleanOps
  }

  const nested = (polygonClipping as unknown as {default?: Partial<PolygonBooleanOps>}).default
  if (
    nested &&
    typeof nested.union === 'function' &&
    typeof nested.intersection === 'function' &&
    typeof nested.difference === 'function'
  ) {
    return nested as PolygonBooleanOps
  }

  throw new Error('polygon-clipping boolean functions are not available in current module format')
}

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

function getPointsBounds(points: Point[]) {
  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function signedArea(points: Point[]) {
  if (points.length < 3) {
    return 0
  }
  let area = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    area += current.x * next.y - next.x * current.y
  }
  return area / 2
}

function toClosedRing(points: Point[]) {
  const closed = ensureClosed(clonePoints(points) ?? [])
  if (closed.length < 4) {
    return null
  }
  const area = Math.abs(signedArea(closed))
  if (area <= 1e-6) {
    return null
  }
  return closed.map((point) => [point.x, point.y] as [number, number])
}

function splitClosedContours(points: Point[]) {
  const contours: Point[][] = []
  let cursor = 0

  while (cursor < points.length) {
    const start = points[cursor]
    if (!start) {
      break
    }

    const contour: Point[] = [{x: start.x, y: start.y}]
    let closedIndex = -1

    for (let index = cursor + 1; index < points.length; index += 1) {
      const point = points[index]
      if (!point) {
        continue
      }
      contour.push({x: point.x, y: point.y})
      if (point.x === start.x && point.y === start.y && contour.length >= 4) {
        closedIndex = index
        break
      }
    }

    if (closedIndex < 0) {
      break
    }

    contours.push(contour)
    cursor = closedIndex + 1
  }

  return contours
}

function isPointInsideRing(point: Point, ring: Point[]) {
  let inside = false

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const current = ring[index]
    const prev = ring[previous]
    const intersects = (
      (current.y > point.y) !== (prev.y > point.y)
    ) && (
      point.x < ((prev.x - current.x) * (point.y - current.y)) / ((prev.y - current.y) || 1e-12) + current.x
    )

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

function ringsToMultiPolygon(rings: Array<Array<[number, number]>>) {
  if (rings.length === 0) {
    return null
  }

  const ringRecords = rings
    .map((ring, index) => {
      const points = ringToPoints(ring)
      const area = Math.abs(signedArea(points))
      if (area <= 1e-6) {
        return null
      }
      return {
        index,
        ring,
        points,
        area,
      }
    })
    .filter((item): item is {index: number; ring: Array<[number, number]>; points: Point[]; area: number} => item !== null)

  if (ringRecords.length === 0) {
    return null
  }

  const byAreaDesc = ringRecords.slice().sort((left, right) => right.area - left.area)
  const parentByIndex = new Map<number, number | null>()

  byAreaDesc.forEach((candidate) => {
    let parent: number | null = null
    for (const container of byAreaDesc) {
      if (container.index === candidate.index || container.area <= candidate.area) {
        continue
      }
      if (isPointInsideRing(candidate.points[0], container.points)) {
        if (parent === null) {
          parent = container.index
          continue
        }
        const parentRecord = ringRecords.find((item) => item.index === parent)
        if (parentRecord && container.area < parentRecord.area) {
          parent = container.index
        }
      }
    }
    parentByIndex.set(candidate.index, parent)
  })

  const depthByIndex = new Map<number, number>()
  const resolveDepth = (index: number): number => {
    const cached = depthByIndex.get(index)
    if (typeof cached === 'number') {
      return cached
    }
    const parent = parentByIndex.get(index)
    const depth = parent === null || typeof parent === 'undefined'
      ? 0
      : resolveDepth(parent) + 1
    depthByIndex.set(index, depth)
    return depth
  }

  const polygonsByExterior = new Map<number, polygonClipping.Polygon>()
  ringRecords.forEach((record) => {
    const depth = resolveDepth(record.index)
    if (depth % 2 === 0) {
      polygonsByExterior.set(record.index, [record.ring])
    }
  })

  ringRecords.forEach((record) => {
    const depth = resolveDepth(record.index)
    if (depth % 2 === 0) {
      return
    }

    let ancestor = parentByIndex.get(record.index)
    while (typeof ancestor === 'number' && !polygonsByExterior.has(ancestor)) {
      ancestor = parentByIndex.get(ancestor)
    }
    if (typeof ancestor !== 'number') {
      return
    }

    polygonsByExterior.get(ancestor)?.push(record.ring)
  })

  const polygons = Array.from(polygonsByExterior.values())
  return polygons.length > 0 ? polygons : null
}

function toMultiPolygon(shape: DocumentNode) {
  const points = resolvePathPoints(shape)
  if (!points || points.length < 3) {
    return null
  }

  const contours = splitClosedContours(points)
  if (contours.length > 1) {
    const rings = contours
      .map((contour) => toClosedRing(contour))
      .filter((ring): ring is Array<[number, number]> => ring !== null)
    return ringsToMultiPolygon(rings)
  }

  const ring = toClosedRing(points)
  if (!ring) {
    return null
  }
  return [ring] as polygonClipping.Polygon
}

function ringToPoints(ring: Array<[number, number]>): Point[] {
  return ensureClosed(ring.map((point) => ({x: point[0], y: point[1]})))
}

function getPolygonContours(result: ReturnType<typeof polygonClipping.union>) {
  if (!Array.isArray(result) || result.length === 0) {
    return [] as Array<{
      exterior: Point[]
      holes: Point[][]
    }>
  }

  const polygons: Array<{exterior: Point[]; holes: Point[][]}> = []

  result.forEach((polygon) => {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      return
    }

    const exterior = polygon[0]
    if (!Array.isArray(exterior) || exterior.length < 4) {
      return
    }

    const exteriorPoints = ringToPoints(exterior as Array<[number, number]>)
    if (Math.abs(signedArea(exteriorPoints)) <= 1e-6) {
      return
    }

    const holes = polygon
      .slice(1)
      .map((ring) => Array.isArray(ring) ? ringToPoints(ring as Array<[number, number]>) : null)
      .filter((points): points is Point[] => Array.isArray(points) && points.length >= 4 && Math.abs(signedArea(points)) > 1e-6)

    polygons.push({
      exterior: exteriorPoints,
      holes,
    })
  })

  return polygons
}

function flattenContours(exterior: Point[], holes: Point[][]) {
  const combined: Point[] = []
  const appendRing = (ring: Point[]) => {
    const closed = ensureClosed(clonePoints(ring) ?? [])
    if (closed.length < 4) {
      return
    }
    combined.push(...closed)
  }

  appendRing(exterior)
  holes.forEach((ring) => appendRing(ring))
  return combined
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

export function createBooleanReplacePatches(
  document: EditorDocument,
  shapeIds: string[],
  mode: ShapeBooleanMode,
): {
  patches: HistoryPatch[]
  resultIndex: number
  resultIndices: number[]
  touchedCount: number
} | null {
  const seen = new Set<string>()
  const targets = shapeIds
    .map((shapeId) => {
      if (seen.has(shapeId)) return null
      seen.add(shapeId)
      const shape = document.shapes.find((item) => item.id === shapeId)
      if (!shape || shape.type === 'frame') return null
      const pathShape = shape.type === 'path' ? shape : convertShapeToPathShape(shape)
      if (!pathShape || !Array.isArray(pathShape.points) || pathShape.points.length < 2) {
        return null
      }
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      if (index < 0) return null
      return {
        source: shape,
        pathShape,
        index,
      }
    })
    .filter((item): item is {source: DocumentNode; pathShape: DocumentNode; index: number} => item !== null)
    .sort((left, right) => left.index - right.index)

  if (targets.length < 2) {
    return null
  }

  const polygons = targets
    .map((target) => toMultiPolygon(target.pathShape))
    .filter((polygon): polygon is NonNullable<ReturnType<typeof toMultiPolygon>> => polygon !== null)

  if (polygons.length < 2) {
    return null
  }

  const first = targets[0]
  const [basePolygon, ...restPolygons] = polygons
  const resultGeometry = mode === 'union'
    ? polygonBooleanOps.union(basePolygon, ...restPolygons)
    : mode === 'intersect'
      ? polygonBooleanOps.intersection(basePolygon, ...restPolygons)
      : polygonBooleanOps.difference(basePolygon, ...restPolygons)

  const resultPolygons = getPolygonContours(resultGeometry)
  if (resultPolygons.length === 0) {
    return null
  }

  const commonParentId = targets.every((target) => target.source.parentId === first.source.parentId)
    ? first.source.parentId
    : null
  const resultShapes = resultPolygons
    .map((polygon, polygonIndex) => {
      const combinedPoints = flattenContours(polygon.exterior, polygon.holes)
      if (combinedPoints.length < 4) {
        return null
      }

      const resultBounds = getPointsBounds(combinedPoints)
      const name = resultPolygons.length === 1
        ? `Boolean ${mode}`
        : `Boolean ${mode} ${polygonIndex + 1}`

      const resultShape: DocumentNode = {
        ...first.pathShape,
        id: `boolean-${nid()}`,
        type: 'path',
        name,
        parentId: commonParentId,
        x: resultBounds.x,
        y: resultBounds.y,
        width: resultBounds.width,
        height: resultBounds.height,
        points: combinedPoints,
        bezierPoints: undefined,
        cornerRadius: undefined,
        cornerRadii: undefined,
        ellipseStartAngle: undefined,
        ellipseEndAngle: undefined,
      }

      return resultShape
    })
    .filter((shape): shape is DocumentNode => shape !== null)

  if (resultShapes.length === 0) {
    return null
  }

  const resultIndex = targets[0].index
  const resultIndices = resultShapes.map((_, offset) => resultIndex + offset)
  const patches: HistoryPatch[] = [
    ...targets
      .slice()
      .sort((left, right) => right.index - left.index)
      .map((target) => ({
        type: 'remove-shape' as const,
        index: target.index,
        shape: target.source,
      })),
    {
      type: 'insert-shape',
      index: resultIndex,
      shape: resultShapes[0],
    },
    ...resultShapes.slice(1).map((shape, offset) => ({
      type: 'insert-shape' as const,
      index: resultIndex + offset + 1,
      shape,
    })),
  ]

  return {
    patches,
    resultIndex,
    resultIndices,
    touchedCount: targets.length,
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
