import type {CollaborationOperation} from '../collaboration.ts'
import type {EditorDocument} from '@venus/document-core'
import {readSceneStats, type SceneMemory} from '@venus/shared-memory'
import type {HistoryPatch} from '../history.ts'
import {cloneCornerRadii, cloneFill, cloneShadow, cloneStroke, findShapeById} from './model.ts'
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
    return [{type: 'set-shape-clip', shapeId: shape.id, prevClipPathId: shape.clipPathId, nextClipPathId: asOptionalStringOrUndef(operation.payload?.clipPathId), prevClipRule: shape.clipRule, nextClipRule: asClipRuleValue(operation.payload?.clipRule)}]
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

  return []
}
