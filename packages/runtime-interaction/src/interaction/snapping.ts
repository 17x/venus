import type {EditorDocument} from '@venus/document-core'
import {applyMatrixToPoint, type Mat3} from '@venus/runtime'
import {createSpatialIndex} from '@venus/spatial-index'
import type {TransformPreview} from './transformSessionManager.ts'

export type SnapAxis = 'x' | 'y'

export interface SnapGuide {
  axis: SnapAxis
  value: number
  kind: 'edge-min' | 'edge-max' | 'center'
}

export interface MoveSnapOptions {
  tolerance?: number
}

export interface SnapGuideLine {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type SnapSpatialIndex = ReturnType<typeof createSpatialIndex<{shapeId: string}>>

const snapIndexCache = new WeakMap<EditorDocument, SnapSpatialIndex>()

export function resolveMoveSnapPreview(
  preview: TransformPreview,
  document: EditorDocument,
  options?: MoveSnapOptions,
): {preview: TransformPreview; guides: SnapGuide[]} {
  const tolerance = options?.tolerance ?? 6
  const previewBounds = resolvePreviewBounds(preview.shapes)
  if (!previewBounds) {
    return {
      preview,
      guides: [],
    }
  }

  const movingIds = new Set(preview.shapes.map((shape) => shape.shapeId))
  const candidates = collectBoundsSnapCandidates(document, movingIds, previewBounds, tolerance)
  const xSources = [
    {value: previewBounds.minX, kind: 'edge-min' as const},
    {value: (previewBounds.minX + previewBounds.maxX) / 2, kind: 'center' as const},
    {value: previewBounds.maxX, kind: 'edge-max' as const},
  ]
  const ySources = [
    {value: previewBounds.minY, kind: 'edge-min' as const},
    {value: (previewBounds.minY + previewBounds.maxY) / 2, kind: 'center' as const},
    {value: previewBounds.maxY, kind: 'edge-max' as const},
  ]
  const snapX = resolveBestAxisSnap(xSources, candidates.x, tolerance)
  const snapY = resolveBestAxisSnap(ySources, candidates.y, tolerance)
  const offsetX = snapX?.delta ?? 0
  const offsetY = snapY?.delta ?? 0
  const snappedPreview = (offsetX !== 0 || offsetY !== 0)
    ? {
        shapes: preview.shapes.map((shape) => ({
          ...shape,
          x: shape.x + offsetX,
          y: shape.y + offsetY,
        })),
      }
    : preview
  const guides: SnapGuide[] = []

  if (snapX) {
    guides.push({
      axis: 'x',
      value: snapX.snapped,
      kind: snapX.kind,
    })
  }
  if (snapY) {
    guides.push({
      axis: 'y',
      value: snapY.snapped,
      kind: snapY.kind,
    })
  }

  return {
    preview: snappedPreview,
    guides,
  }
}

export function resolveSnapGuideLines(options: {
  guides: SnapGuide[]
  documentWidth: number
  documentHeight: number
  matrix: Mat3
}): SnapGuideLine[] {
  const {guides, documentWidth, documentHeight, matrix} = options

  return guides.map((guide) => {
    if (guide.axis === 'x') {
      const top = applyMatrixToPoint(matrix, {x: guide.value, y: 0})
      const bottom = applyMatrixToPoint(matrix, {x: guide.value, y: documentHeight})
      return {
        id: `x-${guide.value}-${guide.kind}`,
        x1: top.x,
        y1: top.y,
        x2: bottom.x,
        y2: bottom.y,
      }
    }

    const left = applyMatrixToPoint(matrix, {x: 0, y: guide.value})
    const right = applyMatrixToPoint(matrix, {x: documentWidth, y: guide.value})
    return {
      id: `y-${guide.value}-${guide.kind}`,
      x1: left.x,
      y1: left.y,
      x2: right.x,
      y2: right.y,
    }
  })
}

function resolvePreviewBounds(
  shapes: TransformPreview['shapes'],
): Bounds | null {
  if (shapes.length === 0) {
    return null
  }

  const first = toBounds(shapes[0].x, shapes[0].y, shapes[0].width, shapes[0].height)
  return shapes
    .slice(1)
    .map((shape) => toBounds(shape.x, shape.y, shape.width, shape.height))
    .reduce(
      (acc, bounds) => ({
        minX: Math.min(acc.minX, bounds.minX),
        minY: Math.min(acc.minY, bounds.minY),
        maxX: Math.max(acc.maxX, bounds.maxX),
        maxY: Math.max(acc.maxY, bounds.maxY),
      }),
      first,
    )
}

function collectBoundsSnapCandidates(
  document: EditorDocument,
  excludeIds: Set<string>,
  previewBounds: Bounds,
  tolerance: number,
) {
  const index = getOrCreateSnapIndex(document)
  const nearby = index.search({
    minX: previewBounds.minX - tolerance,
    minY: previewBounds.minY - tolerance,
    maxX: previewBounds.maxX + tolerance,
    maxY: previewBounds.maxY + tolerance,
  })
  const x = new Set<number>()
  const y = new Set<number>()

  nearby.forEach((item) => {
    if (excludeIds.has(item.meta.shapeId)) {
      return
    }

    x.add(item.minX)
    x.add((item.minX + item.maxX) / 2)
    x.add(item.maxX)
    y.add(item.minY)
    y.add((item.minY + item.maxY) / 2)
    y.add(item.maxY)
  })

  return {
    x: Array.from(x.values()),
    y: Array.from(y.values()),
  }
}

function getOrCreateSnapIndex(document: EditorDocument) {
  const cached = snapIndexCache.get(document)
  if (cached) {
    return cached
  }

  const index = createSpatialIndex<{shapeId: string}>()
  index.load(document.shapes.map((shape) => {
    const bounds = toBounds(shape.x, shape.y, shape.width, shape.height)
    return {
      id: shape.id,
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      meta: {
        shapeId: shape.id,
      },
    }
  }))
  snapIndexCache.set(document, index)
  return index
}

function resolveBestAxisSnap(
  sources: Array<{value: number; kind: SnapGuide['kind']}>,
  candidates: number[],
  tolerance: number,
): {delta: number; snapped: number; kind: SnapGuide['kind']} | null {
  let best: {delta: number; snapped: number; kind: SnapGuide['kind']} | null = null

  for (const source of sources) {
    for (const candidate of candidates) {
      const delta = candidate - source.value
      const absDelta = Math.abs(delta)
      if (absDelta > tolerance) {
        continue
      }

      if (!best || absDelta < Math.abs(best.delta)) {
        best = {
          delta,
          snapped: candidate,
          kind: source.kind,
        }
      }
    }
  }

  return best
}

function toBounds(x: number, y: number, width: number, height: number): Bounds {
  const minX = Math.min(x, x + width)
  const maxX = Math.max(x, x + width)
  const minY = Math.min(y, y + height)
  const maxY = Math.max(y, y + height)
  return {
    minX,
    minY,
    maxX,
    maxY,
  }
}
