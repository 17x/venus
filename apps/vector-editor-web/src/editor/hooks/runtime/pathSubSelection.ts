import type {EditorDocument} from '@vector/model'
import type {SceneShapeSnapshot} from '@vector/runtime/shared-memory'
import type {PathSubSelection, SegmentType} from '../../interaction/types.ts'

interface PathAnchorCandidate {
  x: number
  y: number
  inHandle?: {x: number; y: number}
  outHandle?: {x: number; y: number}
}

interface IndexedPathAnchorCandidate extends PathAnchorCandidate {
  sourceIndex: number
}

export function resolvePathSubSelectionAtPoint(
  document: EditorDocument,
  shapes: SceneShapeSnapshot[],
  point: {x: number; y: number},
  options?: {
    tolerance?: number
  },
): PathSubSelection | null {
  const tolerance = options?.tolerance ?? 8
  const selectedPathIds = shapes
    .filter((shape) => shape.isSelected)
    .map((shape) => shape.id)
  const candidatePaths = document.shapes.filter((shape) =>
    shape.type === 'path' && selectedPathIds.includes(shape.id),
  )

  for (const pathShape of candidatePaths) {
    const contours = resolvePathAnchorContours(pathShape)
    const anchors = contours.flatMap((contour) => contour)
    if (anchors.length < 2) {
      continue
    }

    let bestHandle:
      | {
          anchorIndex: number
          handleType: 'inHandle' | 'outHandle'
          x: number
          y: number
          distance: number
        }
      | null = null

    for (let index = 0; index < anchors.length; index += 1) {
      const anchor = anchors[index]
      if (anchor.inHandle) {
        const distance = distanceBetweenPoints(point, anchor.inHandle)
        if (distance <= tolerance && (!bestHandle || distance < bestHandle.distance)) {
          bestHandle = {
            anchorIndex: anchor.sourceIndex,
            handleType: 'inHandle',
            x: anchor.inHandle.x,
            y: anchor.inHandle.y,
            distance,
          }
        }
      }
      if (anchor.outHandle) {
        const distance = distanceBetweenPoints(point, anchor.outHandle)
        if (distance <= tolerance && (!bestHandle || distance < bestHandle.distance)) {
          bestHandle = {
            anchorIndex: anchor.sourceIndex,
            handleType: 'outHandle',
            x: anchor.outHandle.x,
            y: anchor.outHandle.y,
            distance,
          }
        }
      }
    }

    if (bestHandle) {
      return {
        shapeId: pathShape.id,
        hitType: bestHandle.handleType,
        handlePoint: {
          anchorIndex: bestHandle.anchorIndex,
          handleType: bestHandle.handleType,
          x: bestHandle.x,
          y: bestHandle.y,
        },
      }
    }

    let bestAnchor: {index: number; distance: number} | null = null
    for (let index = 0; index < anchors.length; index += 1) {
      const anchor = anchors[index]
      const distance = distanceBetweenPoints(point, anchor)
      if (distance > tolerance) {
        continue
      }
      if (!bestAnchor || distance < bestAnchor.distance) {
        bestAnchor = {index, distance}
      }
    }

    if (bestAnchor) {
      const anchorData = anchors[bestAnchor.index]
      return {
        shapeId: pathShape.id,
        hitType: 'anchorPoint',
        anchorPoint: {
          index: anchorData.sourceIndex,
          x: anchorData.x,
          y: anchorData.y,
          segmentType: resolveSegmentType(pathShape, anchorData.sourceIndex),
          inHandle: anchorData.inHandle,
          outHandle: anchorData.outHandle,
        },
      }
    }

    let bestSegment: {
      index: number
      distance: number
      point: {x: number; y: number}
      segmentType: SegmentType
    } | null = null

    for (const contour of contours) {
      for (let index = 0; index < contour.length - 1; index += 1) {
        const from = contour[index]
        const to = contour[index + 1]
        const nearest = nearestPointOnSegment(point, from, to)
        if (nearest.distance > tolerance) {
          continue
        }
        if (!bestSegment || nearest.distance < bestSegment.distance) {
          bestSegment = {
            index: from.sourceIndex,
            distance: nearest.distance,
            point: nearest.point,
            segmentType: from.outHandle || to.inHandle ? 'curve' : 'line',
          }
        }
      }
    }

    if (bestSegment) {
      return {
        shapeId: pathShape.id,
        hitType: 'segment',
        segment: {
          index: bestSegment.index,
          segmentType: bestSegment.segmentType,
          x: bestSegment.point.x,
          y: bestSegment.point.y,
        },
      }
    }
  }

  return null
}

function resolvePathAnchorContours(pathShape: EditorDocument['shapes'][number]) {
  if (Array.isArray(pathShape.bezierPoints) && pathShape.bezierPoints.length > 0) {
    return [pathShape.bezierPoints.map((point, index): IndexedPathAnchorCandidate => ({
      sourceIndex: index,
      x: point.anchor.x,
      y: point.anchor.y,
      inHandle: point.cp1 ? {x: point.cp1.x, y: point.cp1.y} : undefined,
      outHandle: point.cp2 ? {x: point.cp2.x, y: point.cp2.y} : undefined,
    }))]
  }

  const points = pathShape.points ?? []
  const contours = splitClosedPointContours(points)
  if (contours.length > 1) {
    return contours
  }

  return [points.map((point, index): IndexedPathAnchorCandidate => ({
    sourceIndex: index,
    x: point.x,
    y: point.y,
  }))]
}

function splitClosedPointContours(points: Array<{x: number; y: number}>) {
  const contours: IndexedPathAnchorCandidate[][] = []
  let cursor = 0

  while (cursor < points.length) {
    const start = points[cursor]
    if (!start) {
      break
    }

    const contour: IndexedPathAnchorCandidate[] = [{
      sourceIndex: cursor,
      x: start.x,
      y: start.y,
    }]
    let closedIndex = -1

    for (let index = cursor + 1; index < points.length; index += 1) {
      const point = points[index]
      if (!point) {
        continue
      }

      contour.push({
        sourceIndex: index,
        x: point.x,
        y: point.y,
      })

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

function resolveSegmentType(pathShape: EditorDocument['shapes'][number], anchorIndex: number): SegmentType {
  const bezierPoint = pathShape.bezierPoints?.[anchorIndex]
  return bezierPoint?.cp1 || bezierPoint?.cp2 ? 'curve' : 'line'
}

function distanceBetweenPoints(a: {x: number; y: number}, b: {x: number; y: number}) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function nearestPointOnSegment(
  point: {x: number; y: number},
  start: {x: number; y: number},
  end: {x: number; y: number},
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    const distance = distanceBetweenPoints(point, start)
    return {
      point: {x: start.x, y: start.y},
      distance,
    }
  }

  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  const clampedT = Math.max(0, Math.min(1, t))
  const nearestPoint = {
    x: start.x + clampedT * dx,
    y: start.y + clampedT * dy,
  }

  return {
    point: nearestPoint,
    distance: distanceBetweenPoints(point, nearestPoint),
  }
}
