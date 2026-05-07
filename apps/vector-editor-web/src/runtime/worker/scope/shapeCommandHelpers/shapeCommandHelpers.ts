import {nid, type DocumentNode, type EditorDocument} from '../../../model/index.ts'
import type {HistoryPatch} from '../../history.ts'
import {
  flattenContours,
  getPointsBounds,
  getPolygonContours,
  polygonBooleanOps,
  resolvePathPoints,
  toMultiPolygon,
} from './shapeCommandHelpers.polygon.ts'

export type ShapeAlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
export type ShapeAlignReference = 'selection' | 'first'
export type ShapeDistributeMode = 'hspace' | 'vspace'
export type ShapeBooleanMode = 'union' | 'subtract' | 'intersect'


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
