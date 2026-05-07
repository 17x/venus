import type {DocumentNode, Point} from '../../../model/index.ts'
import * as polygonClipping from 'polygon-clipping'

type PolygonBooleanOps = {
  union: typeof polygonClipping.union
  intersection: typeof polygonClipping.intersection
  difference: typeof polygonClipping.difference
}

/**
 * Resolves polygon-clipping exports across CJS/ESM interop variants.
 */
function resolvePolygonBooleanOps(): PolygonBooleanOps {
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

export const polygonBooleanOps = resolvePolygonBooleanOps()

/**
 * Clones point arrays to avoid mutating source shape geometry.
 * @param points Source points.
 */
function clonePoints(points: Point[] | undefined): Point[] | undefined {
  if (!Array.isArray(points)) return undefined
  return points.map((point) => ({x: point.x, y: point.y}))
}

/**
 * Returns whether the point list is already closed.
 * @param points Candidate ring points.
 */
function isClosed(points: Point[]): boolean {
  if (points.length < 2) return false
  const first = points[0]
  const last = points[points.length - 1]
  return first.x === last.x && first.y === last.y
}

/**
 * Ensures ring closure by appending first point when needed.
 * @param points Candidate ring points.
 */
function ensureClosed(points: Point[]): Point[] {
  if (points.length === 0) return points
  if (isClosed(points)) return points
  const first = points[0]
  return [...points, {x: first.x, y: first.y}]
}

/**
 * Converts rectangle-like shapes to one closed polygon.
 * @param shape Source shape.
 */
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

/**
 * Approximates ellipse geometry as one closed polyline.
 * @param shape Source ellipse.
 * @param segments Segment count for tessellation.
 */
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

/**
 * Resolves line shapes to two explicit points.
 * @param shape Source line shape.
 */
function toLinePoints(shape: DocumentNode): Point[] {
  if (Array.isArray(shape.points) && shape.points.length >= 2) {
    return [{x: shape.points[0].x, y: shape.points[0].y}, {x: shape.points[shape.points.length - 1].x, y: shape.points[shape.points.length - 1].y}]
  }

  return [
    {x: shape.x, y: shape.y},
    {x: shape.x + shape.width, y: shape.y + shape.height},
  ]
}

/**
 * Resolves generic shape geometry into plain point lists.
 * @param shape Source shape.
 */
export function resolvePathPoints(shape: DocumentNode): Point[] | null {
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

/**
 * Computes axis-aligned bounds for one point list.
 * @param points Input points.
 */
export function getPointsBounds(points: Point[]) {
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

/**
 * Computes signed polygon area for winding/degeneracy checks.
 * @param points Ring points.
 */
function signedArea(points: Point[]): number {
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

/**
 * Converts points into one valid polygon-clipping ring.
 * @param points Candidate contour points.
 */
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

/**
 * Splits one flattened path into closed contour chunks.
 * @param points Flattened points that may contain multiple contours.
 */
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

/**
 * Tests whether one point lies inside one closed ring.
 * @param point Probe point.
 * @param ring Closed ring points.
 */
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

/**
 * Groups rings into polygon exteriors with nested holes by winding containment.
 * @param rings Rings converted to polygon-clipping coordinate tuples.
 */
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

/**
 * Converts one shape to polygon-clipping multipolygon representation.
 * @param shape Source shape.
 */
export function toMultiPolygon(shape: DocumentNode) {
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

/**
 * Converts one polygon ring tuple format back to points.
 * @param ring Polygon-clipping ring representation.
 */
function ringToPoints(ring: Array<[number, number]>): Point[] {
  return ensureClosed(ring.map((point) => ({x: point[0], y: point[1]})))
}

/**
 * Normalizes polygon-clipping output into exterior+holes contour records.
 * @param result Raw polygon-clipping operation result.
 */
export function getPolygonContours(result: ReturnType<typeof polygonClipping.union>) {
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

/**
 * Flattens one exterior with hole rings into single points payload for path shapes.
 * @param exterior Exterior contour.
 * @param holes Hole contours.
 */
export function flattenContours(exterior: Point[], holes: Point[][]) {
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
