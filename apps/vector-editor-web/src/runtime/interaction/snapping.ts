// Keep runtime interaction independent from top-level facade exports.
import {applyMatrixToPoint, type Mat3} from '../viewport/matrix.ts'
import type {TransformPreview} from './transformSessionManager.ts'

/** Declares snap axis values used by vector guide rendering. */
export type SnapAxis = 'x' | 'y'
/** Declares one snap guide emitted by local move-snap resolver. */
export interface SnapGuide {
  /** Stores snapped axis for the guide. */
  axis: SnapAxis
  /** Stores guide semantic kind used by overlay rendering. */
  kind: 'edge-min' | 'edge-max' | 'center'
  /** Stores snapped world coordinate value on guide axis. */
  value: number
}

/** Declares optional options accepted by local move-snap resolver. */
export interface MoveSnapOptions {
  /** Stores snap tolerance in world units. */
  tolerance?: number
}

/** Declares one rendered snap guide line in viewport space. */
export interface SnapGuideLine {
  /** Stores stable guide line id for keyed rendering. */
  id: string
  /** Stores start x coordinate. */
  x1: number
  /** Stores start y coordinate. */
  y1: number
  /** Stores end x coordinate. */
  x2: number
  /** Stores end y coordinate. */
  y2: number
}

/**
 * Resolves snapped preview + guide list using vector-local move snapping.
 * @param preview Current transform preview payload.
 * @param document Current document shape list for static snap targets.
 * @param options Optional snap tolerance configuration.
 */
export function resolveMoveSnapPreview(
  preview: TransformPreview,
  document: {shapes: Array<{id: string; x: number; y: number; width: number; height: number}>},
  options?: MoveSnapOptions,
): {preview: TransformPreview; guides: SnapGuide[]} {
  if (preview.shapes.length === 0) {
    return {preview, guides: []}
  }

  const movingShapeIds = new Set(preview.shapes.map((shape) => shape.shapeId))
  const staticShapes = document.shapes.filter((shape) => !movingShapeIds.has(shape.id))
  if (staticShapes.length === 0) {
    return {preview, guides: []}
  }

  const tolerance = Math.max(0, options?.tolerance ?? 4)
  const previewBounds = preview.shapes.map((shape) => ({
    id: shape.shapeId,
    ...normalizeBounds(shape),
  }))

  const bestX = resolveBestAxisSnap(
    previewBounds.flatMap((shape) => [
      {kind: 'edge-min' as const, value: shape.minX},
      {kind: 'center' as const, value: (shape.minX + shape.maxX) / 2},
      {kind: 'edge-max' as const, value: shape.maxX},
    ]),
    staticShapes.flatMap((shape) => {
      const bounds = normalizeBounds(shape)
      return [bounds.minX, (bounds.minX + bounds.maxX) / 2, bounds.maxX]
    }),
    tolerance,
  )
  const bestY = resolveBestAxisSnap(
    previewBounds.flatMap((shape) => [
      {kind: 'edge-min' as const, value: shape.minY},
      {kind: 'center' as const, value: (shape.minY + shape.maxY) / 2},
      {kind: 'edge-max' as const, value: shape.maxY},
    ]),
    staticShapes.flatMap((shape) => {
      const bounds = normalizeBounds(shape)
      return [bounds.minY, (bounds.minY + bounds.maxY) / 2, bounds.maxY]
    }),
    tolerance,
  )

  const snappedPreview: TransformPreview = {
    shapes: preview.shapes.map((shape) => ({
      ...shape,
      x: shape.x + (bestX?.delta ?? 0),
      y: shape.y + (bestY?.delta ?? 0),
    })),
  }

  const guides: SnapGuide[] = []
  if (bestX) {
    guides.push({axis: 'x', kind: bestX.kind, value: bestX.target})
  }
  if (bestY) {
    guides.push({axis: 'y', kind: bestY.kind, value: bestY.target})
  }

  return {
    preview: snappedPreview,
    guides,
  }
}

/**
 * Resolves the best snap delta for one axis from moving/static anchor sets.
 * @param movingAnchors Moving-shape anchors along one axis.
 * @param staticAnchors Static-shape anchors along one axis.
 * @param tolerance Maximum snap distance.
 */
function resolveBestAxisSnap(
  movingAnchors: Array<{kind: 'edge-min' | 'edge-max' | 'center'; value: number}>,
  staticAnchors: number[],
  tolerance: number,
) {
  let best: {delta: number; target: number; kind: 'edge-min' | 'edge-max' | 'center'} | null = null

  for (const moving of movingAnchors) {
    for (const target of staticAnchors) {
      const delta = target - moving.value
      const absDelta = Math.abs(delta)
      if (absDelta > tolerance) {
        continue
      }
      if (!best || absDelta < Math.abs(best.delta)) {
        best = {delta, target, kind: moving.kind}
      }
    }
  }

  return best
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
