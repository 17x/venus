import type {DocumentNode, EditorDocument} from '@venus/document-core'
import {getNormalizedBoundsFromBox} from '@venus/engine'
import {incrementSceneVersion, type SceneMemory} from '@venus/runtime/shared-memory'
import type {WorkerSpatialIndex} from './types.ts'
import {updateSpatialShape, writeRuntimeShapeToScene} from './sceneSpatial.ts'

export function syncDerivedGroupBounds(
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
) {
  const changedIds = deriveGroupBoundsFromChildren(document.shapes)
  if (changedIds.length === 0) {
    return
  }

  changedIds.forEach((shapeId) => {
    const index = document.shapes.findIndex((shape) => shape.id === shapeId)
    if (index < 0) {
      return
    }

    writeRuntimeShapeToScene(scene, document, index, document.shapes[index])
    updateSpatialShape(spatialIndex, document, shapeId)
  })

  incrementSceneVersion(scene)
}

function getNormalizedBounds(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const bounds = getNormalizedBoundsFromBox(x, y, width, height)

  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
  }
}

function deriveGroupBoundsFromChildren(shapes: DocumentNode[]) {
  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]))
  const childrenByParent = new Map<string, DocumentNode[]>()
  const changed = new Set<string>()
  const visiting = new Set<string>()
  const cache = new Map<string, ReturnType<typeof getNormalizedBounds> | null>()

  shapes.forEach((shape) => {
    if (!shape.parentId) {
      return
    }
    const parent = shapeById.get(shape.parentId)
    if (!parent) {
      return
    }
    const list = childrenByParent.get(parent.id)
    if (list) {
      list.push(shape)
      return
    }
    childrenByParent.set(parent.id, [shape])
  })

  const visit = (shape: DocumentNode): ReturnType<typeof getNormalizedBounds> | null => {
    if (cache.has(shape.id)) {
      return cache.get(shape.id) ?? null
    }
    if (visiting.has(shape.id)) {
      return getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
    }

    visiting.add(shape.id)
    let bounds: ReturnType<typeof getNormalizedBounds> | null = null

    if (shape.type === 'group') {
      const children = childrenByParent.get(shape.id) ?? []
      for (const child of children) {
        const childBounds = visit(child)
        if (!childBounds) {
          continue
        }
        bounds = bounds
          ? {
              minX: Math.min(bounds.minX, childBounds.minX),
              minY: Math.min(bounds.minY, childBounds.minY),
              maxX: Math.max(bounds.maxX, childBounds.maxX),
              maxY: Math.max(bounds.maxY, childBounds.maxY),
            }
          : childBounds
      }

      if (bounds) {
        const nextBounds = bounds
        const epsilon = 0.0001
        const nextX = nextBounds.minX
        const nextY = nextBounds.minY
        const nextWidth = nextBounds.maxX - nextBounds.minX
        const nextHeight = nextBounds.maxY - nextBounds.minY
        if (
          Math.abs(shape.x - nextX) > epsilon ||
          Math.abs(shape.y - nextY) > epsilon ||
          Math.abs(shape.width - nextWidth) > epsilon ||
          Math.abs(shape.height - nextHeight) > epsilon
        ) {
          shape.x = nextX
          shape.y = nextY
          shape.width = nextWidth
          shape.height = nextHeight
          changed.add(shape.id)
        }
      }
    }

    if (!bounds) {
      bounds = getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
    }

    visiting.delete(shape.id)
    cache.set(shape.id, bounds)
    return bounds
  }

  shapes.forEach((shape) => {
    if (shape.type === 'group') {
      visit(shape)
    }
  })

  return Array.from(changed)
}
