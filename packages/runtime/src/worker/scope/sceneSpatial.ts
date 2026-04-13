import type {DocumentNode, EditorDocument} from '@venus/document-core'
import {
  getNormalizedBoundsFromBox,
  intersectNormalizedBounds,
  type EngineSpatialItem,
} from '@venus/engine'
import {
  writeShapeToScene,
  type SceneMemory,
} from '@venus/runtime/shared-memory'
import type {WorkerSpatialIndex} from './types.ts'
import {
  findShapeById,
  getBezierPathBounds,
  getPathBounds,
} from './model.ts'

export function rebuildSpatialIndex(
  spatialIndex: WorkerSpatialIndex,
  document: EditorDocument,
) {
  spatialIndex.load(
    document.shapes.map((shape, order) => createSpatialItem(shape, order)),
  )
}

function createSpatialItem(
  shape: DocumentNode,
  order: number,
): EngineSpatialItem<{
  shapeId: string
  type: DocumentNode['type']
  order: number
}> {
  const bounds = getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
  return {
    id: shape.id,
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
    meta: {
      shapeId: shape.id,
      type: shape.type,
      order,
    },
  }
}

export function updateSpatialShape(
  spatialIndex: WorkerSpatialIndex,
  document: EditorDocument,
  shapeId: string,
) {
  const index = document.shapes.findIndex((shape) => shape.id === shapeId)
  if (index < 0) {
    return
  }

  spatialIndex.update(createSpatialItem(document.shapes[index], index))
}

export function syncSpatialRange(
  spatialIndex: WorkerSpatialIndex,
  document: EditorDocument,
  startIndex: number,
  endIndex = document.shapes.length - 1,
) {
  const boundedStart = Math.max(0, startIndex)
  const boundedEnd = Math.min(endIndex, document.shapes.length - 1)

  if (boundedEnd < boundedStart) {
    return
  }

  for (let index = boundedStart; index <= boundedEnd; index += 1) {
    spatialIndex.update(createSpatialItem(document.shapes[index], index))
  }
}

function getNormalizedBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  expand = 0,
) {
  const bounds = getNormalizedBoundsFromBox(x, y, width, height)

  return {
    minX: bounds.minX - expand,
    maxX: bounds.maxX + expand,
    minY: bounds.minY - expand,
    maxY: bounds.maxY + expand,
  }
}

export function applyShapeMoveDelta(
  shape: DocumentNode,
  deltaX: number,
  deltaY: number,
) {
  shape.x += deltaX
  shape.y += deltaY

  if ((shape.type === 'path' || shape.type === 'polygon' || shape.type === 'star') && shape.points) {
    shape.points = shape.points.map((point) => ({
      x: point.x + deltaX,
      y: point.y + deltaY,
    }))
  }

  if (shape.type === 'path' && shape.bezierPoints) {
    shape.bezierPoints = shape.bezierPoints.map((point) => ({
      anchor: {
        x: point.anchor.x + deltaX,
        y: point.anchor.y + deltaY,
      },
      cp1: point.cp1
        ? {
            x: point.cp1.x + deltaX,
            y: point.cp1.y + deltaY,
          }
        : point.cp1,
      cp2: point.cp2
        ? {
            x: point.cp2.x + deltaX,
            y: point.cp2.y + deltaY,
          }
        : point.cp2,
    }))
  }
}

export function getDescendants(parentId: string, shapes: DocumentNode[]) {
  const childrenByParent = new Map<string, DocumentNode[]>()
  shapes.forEach((shape) => {
    if (!shape.parentId) {
      return
    }
    const list = childrenByParent.get(shape.parentId)
    if (list) {
      list.push(shape)
      return
    }
    childrenByParent.set(shape.parentId, [shape])
  })

  const result: DocumentNode[] = []
  const queue = [...(childrenByParent.get(parentId) ?? [])]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }
    result.push(current)
    const children = childrenByParent.get(current.id)
    if (children && children.length > 0) {
      queue.push(...children)
    }
  }

  return result
}

export function moveMaskedImagesWithClip(
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  clipShapeId: string,
  deltaX: number,
  deltaY: number,
  explicitlyMovedShapeIds: Set<string>,
  changedShapeIds: Set<string>,
) {
  if (deltaX === 0 && deltaY === 0) {
    return
  }

  document.shapes.forEach((shape) => {
    if (shape.type !== 'image' || shape.clipPathId !== clipShapeId) {
      return
    }
    if (explicitlyMovedShapeIds.has(shape.id)) {
      return
    }

    applyShapeMoveDelta(shape, deltaX, deltaY)
    const imageIndex = document.shapes.findIndex((item) => item.id === shape.id)
    writeRuntimeShapeToScene(scene, document, imageIndex, shape)
    updateSpatialShape(spatialIndex, document, shape.id)
    changedShapeIds.add(shape.id)
  })
}

export function hasMovedGroupAncestor(
  shape: DocumentNode,
  movedGroupIds: Set<string>,
  shapeById: Map<string, DocumentNode>,
) {
  if (!shape.parentId || movedGroupIds.size === 0) {
    return false
  }

  let currentParentId: string | null | undefined = shape.parentId
  while (currentParentId) {
    if (movedGroupIds.has(currentParentId)) {
      return true
    }
    const parent = shapeById.get(currentParentId)
    currentParentId = parent?.parentId
  }

  return false
}

export function writeRuntimeShapeToScene(
  scene: SceneMemory,
  document: EditorDocument,
  index: number,
  shape: DocumentNode,
) {
  if (index < 0) {
    return
  }

  const runtimeBounds = resolveRuntimeShapeBounds(shape, document)
  if (!runtimeBounds) {
    writeShapeToScene(scene, index, shape)
    return
  }

  writeShapeToScene(scene, index, {
    ...shape,
    x: runtimeBounds.minX,
    y: runtimeBounds.minY,
    width: runtimeBounds.maxX - runtimeBounds.minX,
    height: runtimeBounds.maxY - runtimeBounds.minY,
  })
}

export function syncClippedImageRuntimeGeometry(
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  changedShapeIds?: Set<string>,
) {
  document.shapes.forEach((shape, index) => {
    if (shape.type !== 'image') {
      return
    }
    const clipId = shape.clipPathId
    const shouldSync = !changedShapeIds ||
      changedShapeIds.has(shape.id) ||
      (!!clipId && changedShapeIds.has(clipId))
    if (!shouldSync) {
      return
    }

    writeRuntimeShapeToScene(scene, document, index, shape)
    updateSpatialShape(spatialIndex, document, shape.id)
  })
}

function resolveRuntimeShapeBounds(
  shape: DocumentNode,
  document: EditorDocument,
) {
  const shapeBounds = resolveShapeBounds(shape)
  if (shape.type !== 'image' || !shape.clipPathId) {
    return shapeBounds
  }

  const clipSource = findShapeById(document, shape.clipPathId)
  if (!clipSource) {
    return shapeBounds
  }

  const clipBounds = resolveShapeBounds(clipSource)
  const intersection = intersectNormalizedBounds(shapeBounds, clipBounds)
  if (!intersection) {
    return shapeBounds
  }

  return intersection
}

function resolveShapeBounds(shape: DocumentNode) {
  if (shape.type === 'path' && shape.bezierPoints && shape.bezierPoints.length > 0) {
    const bezierBounds = getBezierPathBounds(shape.bezierPoints)
    return getNormalizedBounds(
      bezierBounds.x,
      bezierBounds.y,
      bezierBounds.width,
      bezierBounds.height,
    )
  }

  if ((shape.type === 'path' || shape.type === 'polygon' || shape.type === 'star') && shape.points && shape.points.length > 0) {
    const pointBounds = getPathBounds(shape.points)
    return getNormalizedBounds(
      pointBounds.x,
      pointBounds.y,
      pointBounds.width,
      pointBounds.height,
    )
  }

  return getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
}
