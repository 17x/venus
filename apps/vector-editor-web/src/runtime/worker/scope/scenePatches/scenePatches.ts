import type {EditorDocument} from '../../../model/index.ts'
import {
  incrementSceneVersion,
  insertShapeIntoScene,
  removeShapeFromScene,
  reorderShapeInScene,
  setSelectedShape,
  type SceneMemory,
} from '../../../shared-memory/index.ts'
import type {HistoryPatch} from '../../history.ts'
import type {WorkerSpatialIndex} from '../types.ts'
import {findShapeById} from '../model.ts'
import {
  cloneBezierPoints,
  cloneCornerRadii,
  cloneFill,
  clonePoints,
  cloneShadow,
  cloneStroke,
} from '../model.ts'
import {applyMaskSchemaPatch} from '../maskGroupSemantics.ts'
import {
  applyShapeMoveDelta,
  getDescendants,
  hasMovedGroupAncestor,
  moveMaskedImagesWithClip,
  rebuildSpatialIndex,
  syncClippedImageRuntimeGeometry,
  syncSpatialRange,
  updateSpatialShape,
  writeRuntimeShapeToScene,
} from '../sceneSpatial.ts'
import {syncDerivedGroupBounds} from '../sceneGroupBounds.ts'
import {
  applyNormalizedGroupChildrenChange,
  applyNormalizedInsertShape,
  applyNormalizedRemoveShape,
  applyNormalizedShapeParentChange,
} from '../../../model/document-runtime/index.ts'

/**
 * Applies worker history patches to document/scene state and keeps runtime buffers synchronized.
 */
export function applyPatches(
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  patches: HistoryPatch[],
) {
  const selectionPatches: HistoryPatch[] = []
  let needsGroupBoundsSync = false
  const movedGroupIds = new Set<string>()
  const changedShapeIds = new Set<string>()
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const explicitlyMovedShapeIds = new Set(
    patches
      .filter((patch): patch is Extract<HistoryPatch, {type: 'move-shape'}> => patch.type === 'move-shape')
      .map((patch) => patch.shapeId),
  )

  patches.forEach((patch) => {
    if (patch.type === 'set-selected-index') {
      selectionPatches.push(patch)
      return
    }

    if (patch.type === 'move-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }
      if (hasMovedGroupAncestor(shape, movedGroupIds, shapeById)) {
        return
      }

      const deltaX = patch.nextX - patch.prevX
      const deltaY = patch.nextY - patch.prevY
      applyShapeMoveDelta(shape, deltaX, deltaY)
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      updateSpatialShape(spatialIndex, document, shape.id)
      changedShapeIds.add(shape.id)
      moveMaskedImagesWithClip(
        scene,
        document,
        spatialIndex,
        shape.id,
        deltaX,
        deltaY,
        explicitlyMovedShapeIds,
        changedShapeIds,
      )

      if (shape.type === 'group') {
        movedGroupIds.add(shape.id)
        const descendants = getDescendants(shape.id, document.shapes)
        descendants.forEach((child) => {
          applyShapeMoveDelta(child, deltaX, deltaY)
          const childIndex = document.shapes.findIndex((item) => item.id === child.id)
          writeRuntimeShapeToScene(scene, document, childIndex, child)
          updateSpatialShape(spatialIndex, document, child.id)
          changedShapeIds.add(child.id)
          moveMaskedImagesWithClip(
            scene,
            document,
            spatialIndex,
            child.id,
            deltaX,
            deltaY,
            explicitlyMovedShapeIds,
            changedShapeIds,
          )
        })
      }

      incrementSceneVersion(scene)
      needsGroupBoundsSync = true
      return
    }

    if (patch.type === 'rename-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      shape.name = patch.nextName
      shape.text = patch.nextText
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      return
    }

    if (patch.type === 'resize-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      const scaleX = patch.prevWidth === 0 ? 1 : patch.nextWidth / patch.prevWidth
      const scaleY = patch.prevHeight === 0 ? 1 : patch.nextHeight / patch.prevHeight

      if (shape.type === 'group') {
        getDescendants(shape.id, document.shapes).forEach((child) => {
          scaleShapeGeometry(child, shape.x, shape.y, scaleX, scaleY)
          const childIndex = document.shapes.findIndex((item) => item.id === child.id)
          writeRuntimeShapeToScene(scene, document, childIndex, child)
          updateSpatialShape(spatialIndex, document, child.id)
          changedShapeIds.add(child.id)
        })
      }

      if ((shape.type === 'lineSegment' || shape.type === 'path' || shape.type === 'polygon' || shape.type === 'star') && shape.points && shape.points.length > 0) {
        shape.points = shape.points.map((point) => ({
          x: shape.x + (point.x - shape.x) * scaleX,
          y: shape.y + (point.y - shape.y) * scaleY,
        }))
      }
      if (shape.type === 'path' && shape.bezierPoints && shape.bezierPoints.length > 0) {
        shape.bezierPoints = shape.bezierPoints.map((point) => ({
          anchor: {
            x: shape.x + (point.anchor.x - shape.x) * scaleX,
            y: shape.y + (point.anchor.y - shape.y) * scaleY,
          },
          cp1: point.cp1
            ? {
                x: shape.x + (point.cp1.x - shape.x) * scaleX,
                y: shape.y + (point.cp1.y - shape.y) * scaleY,
              }
            : point.cp1,
          cp2: point.cp2
            ? {
                x: shape.x + (point.cp2.x - shape.x) * scaleX,
                y: shape.y + (point.cp2.y - shape.y) * scaleY,
              }
            : point.cp2,
        }))
      }

      shape.width = patch.nextWidth
      shape.height = patch.nextHeight
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      changedShapeIds.add(shape.id)
      needsGroupBoundsSync = true
      return
    }

    if (patch.type === 'rotate-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      const rotationDelta = patch.nextRotation - patch.prevRotation
      const center = {
        x: shape.x + shape.width / 2,
        y: shape.y + shape.height / 2,
      }
      if (shape.type === 'group') {
        getDescendants(shape.id, document.shapes).forEach((child) => {
          rotateShapeGeometry(child, center, rotationDelta)
          const childIndex = document.shapes.findIndex((item) => item.id === child.id)
          writeRuntimeShapeToScene(scene, document, childIndex, child)
          updateSpatialShape(spatialIndex, document, child.id)
          changedShapeIds.add(child.id)
        })
      } else {
        rotatePointGeometry(shape, center, rotationDelta)
      }
      shape.rotation = patch.nextRotation
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      changedShapeIds.add(shape.id)
      return
    }

    if (patch.type === 'patch-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      shape.fill = patch.nextFill
      shape.stroke = patch.nextStroke
      shape.shadow = patch.nextShadow
      shape.textRuns = patch.nextTextRuns
      shape.cornerRadius = patch.nextCornerRadius
      shape.cornerRadii = patch.nextCornerRadii
      shape.ellipseStartAngle = patch.nextEllipseStartAngle
      shape.ellipseEndAngle = patch.nextEllipseEndAngle
      shape.flipX = patch.nextFlipX
      shape.flipY = patch.nextFlipY

      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      changedShapeIds.add(shape.id)
      return
    }

    if (patch.type === 'set-shape-clip') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      shape.clipPathId = patch.nextClipPathId
      shape.clipRule = patch.nextClipRule
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      changedShapeIds.add(shape.id)
      return
    }

    if (patch.type === 'set-shape-mask-schema') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      applyMaskSchemaPatch(shape, patch)
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      changedShapeIds.add(shape.id)
      return
    }

    if (patch.type === 'set-shape-parent') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      // Apply structural parent update through normalized runtime so parent child-lists stay coherent.
      applyNormalizedShapeParentChange({
        document,
        shapeId: patch.shapeId,
        nextParentId: patch.nextParentId,
      })

      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      changedShapeIds.add(shape.id)
      needsGroupBoundsSync = true
      return
    }

    if (patch.type === 'set-group-children') {
      const group = findShapeById(document, patch.groupId)
      if (!group || group.type !== 'group') {
        return
      }

      // Apply child-order update through normalized runtime so parent pointers and sibling order stay aligned.
      applyNormalizedGroupChildrenChange({
        document,
        groupId: patch.groupId,
        nextChildIds: patch.nextChildIds,
      })

      const index = document.shapes.findIndex((item) => item.id === group.id)
      writeRuntimeShapeToScene(scene, document, index, group)
      incrementSceneVersion(scene)
      changedShapeIds.add(group.id)
      needsGroupBoundsSync = true
      return
    }

    if (patch.type === 'insert-shape') {
      const insertedShape = {
        ...patch.shape,
        type: patch.shape.type as import('../../../model/index.ts').DocumentNode['type'],
        parentId: patch.shape.parentId,
        childIds: patch.shape.childIds?.slice(),
        text: patch.shape.text,
        assetId: patch.shape.assetId,
        assetUrl: patch.shape.assetUrl,
        clipPathId: patch.shape.clipPathId,
        clipRule: patch.shape.clipRule,
        rotation: patch.shape.rotation,
        flipX: patch.shape.flipX,
        flipY: patch.shape.flipY,
        fill: cloneFill(patch.shape.fill),
        stroke: cloneStroke(patch.shape.stroke),
        shadow: cloneShadow(patch.shape.shadow),
        cornerRadius: patch.shape.cornerRadius,
        cornerRadii: cloneCornerRadii(patch.shape.cornerRadii),
        ellipseStartAngle: patch.shape.ellipseStartAngle,
        ellipseEndAngle: patch.shape.ellipseEndAngle,
        points: clonePoints(patch.shape.points),
        bezierPoints: cloneBezierPoints(patch.shape.bezierPoints),
      }

      // Apply insertion through normalized runtime helper so structural ownership stays canonical.
      const insertedIndex = applyNormalizedInsertShape({
        document,
        index: patch.index,
        shape: insertedShape,
      })
      insertShapeIntoScene(scene, insertedIndex, document.shapes[insertedIndex])
      writeRuntimeShapeToScene(scene, document, insertedIndex, document.shapes[insertedIndex])
      syncSpatialRange(spatialIndex, document, insertedIndex)
      changedShapeIds.add(document.shapes[insertedIndex].id)
      needsGroupBoundsSync = true
      return
    }

    if (patch.type === 'reorder-shape') {
      const currentIndex = document.shapes.findIndex((item) => item.id === patch.shapeId)
      if (currentIndex < 0) {
        return
      }

      const [shape] = document.shapes.splice(currentIndex, 1)
      const boundedIndex = Math.max(0, Math.min(patch.toIndex, document.shapes.length))
      document.shapes.splice(boundedIndex, 0, shape)
      reorderShapeInScene(scene, currentIndex, boundedIndex)
      syncSpatialRange(
        spatialIndex,
        document,
        Math.min(currentIndex, boundedIndex),
        Math.max(currentIndex, boundedIndex),
      )
      changedShapeIds.add(shape.id)
      needsGroupBoundsSync = true
      return
    }

    if (patch.type === 'remove-shape') {
      // Apply removal through normalized runtime helper so parent/children links remain consistent.
      const removed = applyNormalizedRemoveShape({
        document,
        index: patch.index,
        shapeId: patch.shape.id,
      })
      if (!removed) {
        return
      }

      changedShapeIds.add(removed.removedShape.id)
      spatialIndex.remove(removed.removedShape.id)
      removeShapeFromScene(scene, removed.removedIndex)
      syncSpatialRange(spatialIndex, document, removed.removedIndex)
      needsGroupBoundsSync = true
    }
  })

  if (needsGroupBoundsSync) {
    syncDerivedGroupBounds(scene, document, spatialIndex)
  }

  if (changedShapeIds.size > 0) {
    syncClippedImageRuntimeGeometry(scene, document, spatialIndex, changedShapeIds)
  }

  selectionPatches.forEach((patch) => {
    if (patch.type === 'set-selected-index') {
      setSelectedShape(scene, patch.next)
    }
  })
}

export {
  rebuildSpatialIndex,
  syncClippedImageRuntimeGeometry,
}

function scaleShapeGeometry(
  shape: EditorDocument['shapes'][number],
  originX: number,
  originY: number,
  scaleX: number,
  scaleY: number,
) {
  shape.x = originX + (shape.x - originX) * scaleX
  shape.y = originY + (shape.y - originY) * scaleY
  shape.width *= scaleX
  shape.height *= scaleY
  shape.points = shape.points?.map((point) => ({
    x: originX + (point.x - originX) * scaleX,
    y: originY + (point.y - originY) * scaleY,
  }))
  shape.bezierPoints = shape.bezierPoints?.map((point) => ({
    anchor: {
      x: originX + (point.anchor.x - originX) * scaleX,
      y: originY + (point.anchor.y - originY) * scaleY,
    },
    cp1: point.cp1 ? {
      x: originX + (point.cp1.x - originX) * scaleX,
      y: originY + (point.cp1.y - originY) * scaleY,
    } : point.cp1,
    cp2: point.cp2 ? {
      x: originX + (point.cp2.x - originX) * scaleX,
      y: originY + (point.cp2.y - originY) * scaleY,
    } : point.cp2,
  }))
}

function rotateShapeGeometry(
  shape: EditorDocument['shapes'][number],
  center: {x: number; y: number},
  degrees: number,
) {
  const shapeCenter = rotatePoint({
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2,
  }, center, degrees)
  shape.x = shapeCenter.x - shape.width / 2
  shape.y = shapeCenter.y - shape.height / 2
  rotatePointGeometry(shape, center, degrees)
  shape.rotation = (shape.rotation ?? 0) + degrees
}

function rotatePointGeometry(
  shape: EditorDocument['shapes'][number],
  center: {x: number; y: number},
  degrees: number,
) {
  shape.points = shape.points?.map((point) => rotatePoint(point, center, degrees))
  shape.bezierPoints = shape.bezierPoints?.map((point) => ({
    anchor: rotatePoint(point.anchor, center, degrees),
    cp1: point.cp1 ? rotatePoint(point.cp1, center, degrees) : point.cp1,
    cp2: point.cp2 ? rotatePoint(point.cp2, center, degrees) : point.cp2,
  }))
}

function rotatePoint(
  point: {x: number; y: number},
  center: {x: number; y: number},
  degrees: number,
) {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}
