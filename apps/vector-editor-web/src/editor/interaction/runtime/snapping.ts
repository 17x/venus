import {
  resolveEngineMoveSnapPreview,
  type EngineMoveSnapOptions,
  type EngineMoveSnapPreview,
  type EngineSnapAxis,
  type EngineSnapGuide,
  type EngineSnapGuideLine,
} from '@vector/runtime/engine'
import {applyMatrixToPoint, type Mat3} from '@vector/runtime'
import type {TransformPreview as RuntimeTransformPreview} from '@vector/runtime/interaction'

export type SnapAxis = EngineSnapAxis
export type SnapGuide = EngineSnapGuide
export type MoveSnapOptions = EngineMoveSnapOptions
export type SnapGuideLine = EngineSnapGuideLine
export type TransformPreview = RuntimeTransformPreview

/**
 * Runtime-interaction keeps the document-aware adapter for compatibility,
 * while engine owns the move-snap solving mechanism.
 */
export function resolveMoveSnapPreview(
  preview: TransformPreview,
  document: {shapes: Array<{id: string; x: number; y: number; width: number; height: number}>},
  options?: MoveSnapOptions,
): {preview: TransformPreview; guides: SnapGuide[]} {
  const result = resolveEngineMoveSnapPreview(
    preview as EngineMoveSnapPreview,
    document,
    options,
  )

  return {
    preview: result.preview as TransformPreview,
    guides: result.guides,
  }
}

export function resolveSnapGuideLines(options: {
  guides: SnapGuide[]
  shapes: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
  }>
  movingShapeIds: string[]
  matrix: Mat3
}): SnapGuideLine[] {
  const {guides, shapes, movingShapeIds, matrix} = options
  if (guides.length === 0 || shapes.length === 0 || movingShapeIds.length === 0) {
    return []
  }

  const movingSet = new Set(movingShapeIds)
  const movingShapes = shapes.filter((shape) => movingSet.has(shape.id))
  const staticShapes = shapes.filter((shape) => !movingSet.has(shape.id))
  if (movingShapes.length === 0 || staticShapes.length === 0) {
    return []
  }

  const movingBounds = mergeBounds(movingShapes)
  if (!movingBounds) {
    return []
  }

  return guides.flatMap((guide, index) => {
    const connector = resolveGuideConnector(guide, movingBounds, staticShapes)
    if (!connector) {
      return []
    }

    const from = applyMatrixToPoint(matrix, connector.from)
    const to = applyMatrixToPoint(matrix, connector.to)

    return [{
      id: `${guide.axis}-${guide.kind}-${index}`,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    }]
  })
}

function mergeBounds(shapes: Array<{x: number; y: number; width: number; height: number}>) {
  if (shapes.length === 0) {
    return null
  }

  const first = normalizeBounds(shapes[0])
  return shapes
    .slice(1)
    .reduce((acc, shape) => {
      const next = normalizeBounds(shape)
      return {
        minX: Math.min(acc.minX, next.minX),
        minY: Math.min(acc.minY, next.minY),
        maxX: Math.max(acc.maxX, next.maxX),
        maxY: Math.max(acc.maxY, next.maxY),
      }
    }, first)
}

function normalizeBounds(shape: {x: number; y: number; width: number; height: number}) {
  return {
    minX: Math.min(shape.x, shape.x + shape.width),
    minY: Math.min(shape.y, shape.y + shape.height),
    maxX: Math.max(shape.x, shape.x + shape.width),
    maxY: Math.max(shape.y, shape.y + shape.height),
  }
}

function resolveGuideConnector(
  guide: SnapGuide,
  movingBounds: {minX: number; minY: number; maxX: number; maxY: number},
  staticShapes: Array<{x: number; y: number; width: number; height: number}>,
) {
  const tolerance = 1.5
  const movingCenter = {
    x: (movingBounds.minX + movingBounds.maxX) / 2,
    y: (movingBounds.minY + movingBounds.maxY) / 2,
  }

  let bestTarget: {x: number; y: number; distance: number} | null = null

  for (const shape of staticShapes) {
    const bounds = normalizeBounds(shape)
    const anchors = guide.axis === 'x'
      ? [bounds.minX, (bounds.minX + bounds.maxX) / 2, bounds.maxX]
      : [bounds.minY, (bounds.minY + bounds.maxY) / 2, bounds.maxY]

    if (!anchors.some((value) => Math.abs(value - guide.value) <= tolerance)) {
      continue
    }

    const targetCenter = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    }
    const distance = guide.axis === 'x'
      ? Math.abs(targetCenter.y - movingCenter.y)
      : Math.abs(targetCenter.x - movingCenter.x)

    if (!bestTarget || distance < bestTarget.distance) {
      bestTarget = {
        x: targetCenter.x,
        y: targetCenter.y,
        distance,
      }
    }
  }

  const resolvedTarget = bestTarget
  if (!resolvedTarget) {
    return null
  }

  if (guide.axis === 'x') {
    return {
      from: {x: guide.value, y: movingCenter.y},
      to: {x: guide.value, y: resolvedTarget.y},
    }
  }

  return {
    from: {x: movingCenter.x, y: guide.value},
    to: {x: resolvedTarget.x, y: guide.value},
  }
}
