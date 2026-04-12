import {createEngineSpatialIndex} from '../spatial/index.ts'

export type EngineSnapAxis = 'x' | 'y'

export interface EngineSnapGuide {
  axis: EngineSnapAxis
  value: number
  kind: 'edge-min' | 'edge-max' | 'center'
}

export interface EngineMoveSnapOptions {
  tolerance?: number
}

export interface EngineSnapGuideLine {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

interface EngineBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface EngineMoveSnapShape {
  shapeId: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
}

export interface EngineMoveSnapPreview {
  shapes: EngineMoveSnapShape[]
}

export interface EngineSnapSceneShape {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface EngineSnapScene {
  shapes: EngineSnapSceneShape[]
}

type EngineSnapSpatialIndex = ReturnType<typeof createEngineSpatialIndex<{shapeId: string}>>

const snapIndexCache = new WeakMap<EngineSnapScene, EngineSnapSpatialIndex>()

export function resolveEngineMoveSnapPreview<TShape extends EngineMoveSnapShape>(
  preview: {shapes: TShape[]},
  scene: EngineSnapScene,
  options?: EngineMoveSnapOptions,
): {preview: {shapes: TShape[]}; guides: EngineSnapGuide[]} {
  const tolerance = options?.tolerance ?? 6
  const previewBounds = resolvePreviewBounds(preview.shapes)
  if (!previewBounds) {
    return {
      preview,
      guides: [],
    }
  }

  const movingIds = new Set(preview.shapes.map((shape) => shape.shapeId))
  const candidates = collectBoundsSnapCandidates(scene, movingIds, previewBounds, tolerance)
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
  const guides: EngineSnapGuide[] = []

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

export function resolveEngineSnapGuideLines(options: {
  guides: EngineSnapGuide[]
  documentWidth: number
  documentHeight: number
  projectPoint: (point: {x: number; y: number}) => {x: number; y: number}
}): EngineSnapGuideLine[] {
  const {guides, documentWidth, documentHeight, projectPoint} = options

  return guides.map((guide) => {
    if (guide.axis === 'x') {
      const top = projectPoint({x: guide.value, y: 0})
      const bottom = projectPoint({x: guide.value, y: documentHeight})
      return {
        id: `x-${guide.value}-${guide.kind}`,
        x1: top.x,
        y1: top.y,
        x2: bottom.x,
        y2: bottom.y,
      }
    }

    const left = projectPoint({x: 0, y: guide.value})
    const right = projectPoint({x: documentWidth, y: guide.value})
    return {
      id: `y-${guide.value}-${guide.kind}`,
      x1: left.x,
      y1: left.y,
      x2: right.x,
      y2: right.y,
    }
  })
}

function resolvePreviewBounds<TShape extends EngineMoveSnapShape>(
  shapes: TShape[],
): EngineBounds | null {
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
  scene: EngineSnapScene,
  excludeIds: Set<string>,
  previewBounds: EngineBounds,
  tolerance: number,
) {
  const index = getOrCreateSnapIndex(scene)
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

function getOrCreateSnapIndex(scene: EngineSnapScene) {
  const cached = snapIndexCache.get(scene)
  if (cached) {
    return cached
  }

  const index = createEngineSpatialIndex<{shapeId: string}>()
  index.load(scene.shapes.map((shape) => {
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
  snapIndexCache.set(scene, index)
  return index
}

function resolveBestAxisSnap(
  sources: Array<{value: number; kind: EngineSnapGuide['kind']}>,
  candidates: number[],
  tolerance: number,
): {delta: number; snapped: number; kind: EngineSnapGuide['kind']} | null {
  let best: {delta: number; snapped: number; kind: EngineSnapGuide['kind']} | null = null

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

function toBounds(x: number, y: number, width: number, height: number): EngineBounds {
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
