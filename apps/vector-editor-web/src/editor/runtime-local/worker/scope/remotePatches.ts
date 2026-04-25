import type {CollaborationOperation} from '../collaboration.ts'
import type {EditorDocument} from '@venus/document-core'
import {readSceneStats, type SceneMemory} from '@vector/runtime/shared-memory'
import type {HistoryPatch} from '../history.ts'
import {cloneCornerRadii, cloneFill, cloneShadow, cloneStroke, findShapeById} from './model.ts'
import {
  convertShapeToPathShape,
  createAlignMovePatches,
  createBooleanReplacePatches,
  createDistributeMovePatches,
  type ShapeAlignMode,
  type ShapeBooleanMode,
  type ShapeAlignReference,
} from './shapeCommandHelpers.ts'
import {
  asBooleanOrNull,
  asClipRuleValue,
  asCornerRadiiValue,
  asDocumentNodeList,
  asFillValue,
  asNumberOrNull,
  asOptionalNumberOrUndef,
  asOptionalStringOrUndef,
  asRotateBatch,
  asShadowValue,
  asStringOrNull,
  asStrokeValue,
  asTransformBatch,
  createTransformPatches,
} from './transformSerde.ts'
import {resolveMaskSchemaPatches} from './maskGroupSemantics.ts'

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asAlignMode(value: unknown): ShapeAlignMode | null {
  if (value === 'left' || value === 'hcenter' || value === 'right' || value === 'top' || value === 'vcenter' || value === 'bottom') {
    return value
  }
  return null
}

function asAlignReference(value: unknown): ShapeAlignReference {
  return value === 'first' ? 'first' : 'selection'
}

function asDistributeMode(value: unknown): 'hspace' | 'vspace' | null {
  if (value === 'hspace' || value === 'vspace') {
    return value
  }
  return null
}

function asBooleanMode(value: unknown): ShapeBooleanMode | null {
  if (value === 'union' || value === 'subtract' || value === 'intersect') {
    return value
  }
  return null
}

function getNodeBounds(nodes: import('@venus/document-core').DocumentNode[]) {
  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxX = Math.max(...nodes.map((node) => node.x + node.width))
  const maxY = Math.max(...nodes.map((node) => node.y + node.height))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function createRemotePatches(operation: CollaborationOperation, scene: SceneMemory, document: EditorDocument): HistoryPatch[] {
  if (operation.type === 'selection.delete') {
    return [{type: 'set-selected-index', prev: readSceneStats(scene).selectedIndex, next: -1}]
  }

  if (operation.type === 'shape.move') {
    const shapeId = asStringOrNull(operation.payload?.shapeId)
    const nextX = asNumberOrNull(operation.payload?.x)
    const nextY = asNumberOrNull(operation.payload?.y)
    const shape = shapeId ? findShapeById(document, shapeId) : null
    if (!shape || nextX === null || nextY === null) return []
    return [{type: 'move-shape', shapeId: shape.id, prevX: shape.x, prevY: shape.y, nextX, nextY}]
  }

  if (operation.type === 'shape.rename') {
    const shapeId = asStringOrNull(operation.payload?.shapeId)
    const nextName = asStringOrNull(operation.payload?.name)
    const nextText = asOptionalStringOrUndef(operation.payload?.text)
    const shape = shapeId ? findShapeById(document, shapeId) : null
    if (!shape || nextName === null) return []
    return [{type: 'rename-shape', shapeId: shape.id, prevName: shape.name, nextName, prevText: shape.text, nextText: nextText ?? (shape.type === 'text' ? nextName : shape.text)}]
  }

  if (operation.type === 'shape.resize') {
    const shapeId = asStringOrNull(operation.payload?.shapeId)
    const nextWidth = asNumberOrNull(operation.payload?.width)
    const nextHeight = asNumberOrNull(operation.payload?.height)
    const shape = shapeId ? findShapeById(document, shapeId) : null
    if (!shape || nextWidth === null || nextHeight === null) return []
    return [{type: 'resize-shape', shapeId: shape.id, prevWidth: shape.width, prevHeight: shape.height, nextWidth, nextHeight}]
  }

  if (operation.type === 'shape.rotate') {
    const shapeId = asStringOrNull(operation.payload?.shapeId)
    const nextRotation = asNumberOrNull(operation.payload?.rotation)
    const shape = shapeId ? findShapeById(document, shapeId) : null
    if (!shape || nextRotation === null) return []
    return [{type: 'rotate-shape', shapeId: shape.id, prevRotation: shape.rotation ?? 0, nextRotation}]
  }

  if (operation.type === 'shape.rotate.batch') {
    const rotationItems = asRotateBatch(operation.payload?.rotations)
    if (rotationItems.length === 0) return []
    return rotationItems
      .map((item) => {
        const shape = findShapeById(document, item.shapeId)
        if (!shape) return null
        return {type: 'rotate-shape' as const, shapeId: shape.id, prevRotation: shape.rotation ?? 0, nextRotation: item.rotation}
      })
      .filter((patch): patch is Extract<HistoryPatch, {type: 'rotate-shape'}> => patch !== null)
  }

  if (operation.type === 'shape.transform.batch') {
    const transformItems = asTransformBatch(operation.payload?.transforms)
    if (transformItems.length === 0) return []
    const patches: HistoryPatch[] = []
    transformItems.forEach((item) => {
      const shape = findShapeById(document, item.id)
      if (!shape) return
      patches.push(...createTransformPatches(shape, item.from, item.to))
    })
    return patches
  }

  if (operation.type === 'shape.patch') {
    const shapeId = asStringOrNull(operation.payload?.shapeId)
    const shape = shapeId ? findShapeById(document, shapeId) : null
    if (!shape) return []

    const patchRecord = operation.payload?.patch && typeof operation.payload.patch === 'object'
      ? operation.payload.patch as Record<string, unknown>
      : {}

    const nextFill = Object.prototype.hasOwnProperty.call(patchRecord, 'fill') ? asFillValue(patchRecord.fill) : cloneFill(shape.fill)
    const nextStroke = Object.prototype.hasOwnProperty.call(patchRecord, 'stroke') ? asStrokeValue(patchRecord.stroke) : cloneStroke(shape.stroke)
    const nextShadow = Object.prototype.hasOwnProperty.call(patchRecord, 'shadow') ? asShadowValue(patchRecord.shadow) : cloneShadow(shape.shadow)
    const nextCornerRadius = Object.prototype.hasOwnProperty.call(patchRecord, 'cornerRadius') ? asOptionalNumberOrUndef(patchRecord.cornerRadius) : shape.cornerRadius
    const nextCornerRadii = Object.prototype.hasOwnProperty.call(patchRecord, 'cornerRadii') ? asCornerRadiiValue(patchRecord.cornerRadii) : cloneCornerRadii(shape.cornerRadii)
    const nextEllipseStartAngle = Object.prototype.hasOwnProperty.call(patchRecord, 'ellipseStartAngle') ? asOptionalNumberOrUndef(patchRecord.ellipseStartAngle) : shape.ellipseStartAngle
    const nextEllipseEndAngle = Object.prototype.hasOwnProperty.call(patchRecord, 'ellipseEndAngle') ? asOptionalNumberOrUndef(patchRecord.ellipseEndAngle) : shape.ellipseEndAngle
    const nextFlipX = Object.prototype.hasOwnProperty.call(patchRecord, 'flipX') ? asBooleanOrNull(patchRecord.flipX) ?? !!shape.flipX : !!shape.flipX
    const nextFlipY = Object.prototype.hasOwnProperty.call(patchRecord, 'flipY') ? asBooleanOrNull(patchRecord.flipY) ?? !!shape.flipY : !!shape.flipY

    return [{
      type: 'patch-shape',
      shapeId: shape.id,
      prevFill: cloneFill(shape.fill),
      nextFill,
      prevStroke: cloneStroke(shape.stroke),
      nextStroke,
      prevShadow: cloneShadow(shape.shadow),
      nextShadow,
      prevCornerRadius: shape.cornerRadius,
      nextCornerRadius,
      prevCornerRadii: cloneCornerRadii(shape.cornerRadii),
      nextCornerRadii,
      prevEllipseStartAngle: shape.ellipseStartAngle,
      nextEllipseStartAngle,
      prevEllipseEndAngle: shape.ellipseEndAngle,
      nextEllipseEndAngle,
      prevFlipX: !!shape.flipX,
      nextFlipX,
      prevFlipY: !!shape.flipY,
      nextFlipY,
    }]
  }

  if (operation.type === 'shape.set-clip') {
    const shapeId = asStringOrNull(operation.payload?.shapeId)
    const shape = shapeId ? findShapeById(document, shapeId) : null
    if (!shape) return []
    const nextClipPathId = asOptionalStringOrUndef(operation.payload?.clipPathId)
    return [
      {type: 'set-shape-clip', shapeId: shape.id, prevClipPathId: shape.clipPathId, nextClipPathId, prevClipRule: shape.clipRule, nextClipRule: asClipRuleValue(operation.payload?.clipRule)},
      ...resolveMaskSchemaPatches({
        document,
        hostShapeId: shape.id,
        nextClipPathId,
      }),
    ]
  }

  if (operation.type === 'shape.insert') {
    const shape = asDocumentNodeList([operation.payload?.shape])[0]
    const index = asNumberOrNull(operation.payload?.index) ?? document.shapes.length
    if (!shape) return []
    return [{type: 'insert-shape', index, shape}]
  }

  if (operation.type === 'shape.insert.batch') {
    const shapes = asDocumentNodeList(operation.payload?.shapes)
    const baseIndex = asNumberOrNull(operation.payload?.index) ?? document.shapes.length
    if (shapes.length === 0) return []
    return shapes.map((shape, index) => ({type: 'insert-shape' as const, index: baseIndex + index, shape}))
  }

  if (operation.type === 'shape.remove') {
    const shapeId = asStringOrNull(operation.payload?.shapeId)
    const shape = shapeId ? findShapeById(document, shapeId) : null
    if (!shape) return []
    return [{type: 'remove-shape', index: document.shapes.findIndex((item) => item.id === shape.id), shape}]
  }

  if (operation.type === 'shape.reorder') {
    const shapeId = asStringOrNull(operation.payload?.shapeId)
    const toIndex = asNumberOrNull(operation.payload?.toIndex)
    const shape = shapeId ? findShapeById(document, shapeId) : null
    if (!shape || toIndex === null) return []
    return [{type: 'reorder-shape', shapeId: shape.id, fromIndex: document.shapes.findIndex((item) => item.id === shape.id), toIndex}]
  }

  if (operation.type === 'shape.group') {
    const selectedShapeIds = asStringArray(operation.payload?.shapeIds)
    const groupId = asStringOrNull(operation.payload?.groupId)
    const groupName = asStringOrNull(operation.payload?.name) ?? 'Group'
    if (selectedShapeIds.length < 2 || groupId === null) return []

    const selectedShapes = selectedShapeIds
      .map((shapeId) => findShapeById(document, shapeId))
      .filter((shape): shape is import('@venus/document-core').DocumentNode => shape !== null)
    if (selectedShapes.length < 2) return []

    const selectedIndices = selectedShapes
      .map((shape) => ({shape, index: document.shapes.findIndex((item) => item.id === shape.id)}))
      .filter((item) => item.index >= 0)
      .sort((left, right) => left.index - right.index)
    if (selectedIndices.length < 2) return []

    const firstParentId = selectedIndices[0].shape.parentId ?? null
    const commonParentId = selectedIndices.every((item) => (item.shape.parentId ?? null) === firstParentId)
      ? firstParentId
      : null
    const parentGroup = commonParentId ? findShapeById(document, commonParentId) : null
    const parentPrevChildIds = parentGroup?.childIds?.slice()
    const selectedIdSet = new Set(selectedIndices.map((item) => item.shape.id))
    const affectedParentGroups = document.shapes
      .filter((shape): shape is import('@venus/document-core').DocumentNode => shape.type === 'group' && shape.id !== commonParentId && Array.isArray(shape.childIds) && shape.childIds.some((childId) => selectedIdSet.has(childId)))
      .map((group) => ({
        groupId: group.id,
        prevChildIds: group.childIds?.slice() ?? [],
        nextChildIds: (group.childIds ?? []).filter((childId) => !selectedIdSet.has(childId)),
      }))
    const groupedShapeIds = selectedIndices.map((item) => item.shape.id)
    const bounds = getNodeBounds(selectedIndices.map((item) => item.shape))
    const insertIndex = selectedIndices[selectedIndices.length - 1].index + 1

    const patches: HistoryPatch[] = [
      {
        type: 'insert-shape',
        index: insertIndex,
        shape: {
          id: groupId,
          type: 'group',
          name: groupName,
          parentId: commonParentId,
          childIds: groupedShapeIds,
          ...bounds,
        },
      },
      {type: 'set-group-children', groupId, prevChildIds: undefined, nextChildIds: groupedShapeIds.slice()},
    ]

    affectedParentGroups.forEach((groupPatch) => {
      patches.push({
        type: 'set-group-children',
        groupId: groupPatch.groupId,
        prevChildIds: groupPatch.prevChildIds,
        nextChildIds: groupPatch.nextChildIds,
      })
    })

    if (parentGroup && Array.isArray(parentPrevChildIds)) {
      const nextParentChildIds = parentPrevChildIds.filter((id) => !groupedShapeIds.includes(id))
      nextParentChildIds.push(groupId)
      patches.push({
        type: 'set-group-children',
        groupId: parentGroup.id,
        prevChildIds: parentPrevChildIds,
        nextChildIds: nextParentChildIds,
      })
    }

    selectedIndices.forEach(({shape}) => {
      patches.push({type: 'set-shape-parent', shapeId: shape.id, prevParentId: shape.parentId, nextParentId: groupId})
    })
    return patches
  }

  if (operation.type === 'shape.ungroup') {
    const groupId = asStringOrNull(operation.payload?.groupId)
    if (groupId === null) return []

    const groupShape = findShapeById(document, groupId)
    if (!groupShape || groupShape.type !== 'group') return []
    const groupIndex = document.shapes.findIndex((item) => item.id === groupShape.id)
    if (groupIndex < 0) return []

    const childIds = (groupShape.childIds ?? []).filter((childId) => findShapeById(document, childId) !== null)
    const patches: HistoryPatch[] = []
    const parentGroup = groupShape.parentId ? findShapeById(document, groupShape.parentId) : null
    const parentPrevChildIds = parentGroup?.childIds?.slice()

    if (parentGroup && Array.isArray(parentPrevChildIds)) {
      const nextParentChildIds: string[] = []
      parentPrevChildIds.forEach((id) => {
        if (id === groupShape.id) {
          nextParentChildIds.push(...childIds)
        } else {
          nextParentChildIds.push(id)
        }
      })
      patches.push({
        type: 'set-group-children',
        groupId: parentGroup.id,
        prevChildIds: parentPrevChildIds,
        nextChildIds: nextParentChildIds,
      })
    }

    childIds.forEach((childId) => {
      patches.push({type: 'set-shape-parent', shapeId: childId, prevParentId: groupShape.id, nextParentId: groupShape.parentId})
    })

    patches.push({type: 'set-group-children', groupId: groupShape.id, prevChildIds: groupShape.childIds?.slice(), nextChildIds: []})
    patches.push({type: 'remove-shape', index: groupIndex, shape: groupShape})
    return patches
  }

  if (operation.type === 'shape.convert-to-path') {
    const shapeIds = asStringArray(operation.payload?.shapeIds)
    if (shapeIds.length === 0) return []

    const patches: HistoryPatch[] = []
    shapeIds.forEach((shapeId) => {
      const shape = findShapeById(document, shapeId)
      if (!shape) return
      const converted = convertShapeToPathShape(shape)
      if (!converted) return
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      if (index < 0) return
      patches.push({type: 'remove-shape', index, shape})
      patches.push({type: 'insert-shape', index, shape: converted})
    })
    return patches
  }

  if (operation.type === 'shape.boolean') {
    const shapeIds = asStringArray(operation.payload?.shapeIds)
    const mode = asBooleanMode(operation.payload?.mode)
    if (shapeIds.length < 2 || mode === null) return []
    const resolved = createBooleanReplacePatches(document, shapeIds, mode)
    return resolved?.patches ?? []
  }

  if (operation.type === 'shape.align') {
    const shapeIds = asStringArray(operation.payload?.shapeIds)
    const mode = asAlignMode(operation.payload?.mode)
    if (shapeIds.length < 2 || mode === null) return []
    return createAlignMovePatches(document, shapeIds, mode, asAlignReference(operation.payload?.reference))
  }

  if (operation.type === 'shape.distribute') {
    const shapeIds = asStringArray(operation.payload?.shapeIds)
    const mode = asDistributeMode(operation.payload?.mode)
    if (shapeIds.length < 3 || mode === null) return []
    return createDistributeMovePatches(document, shapeIds, mode)
  }

  return []
}
