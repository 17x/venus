import type {DocumentNode, EditorDocument} from '@venus/document-core'
import {getSelectedShapeIndices, readSceneStats, type SceneMemory} from '@venus/shared-memory'
import type {HistoryEntry, HistoryPatch} from '../history.ts'
import type {EditorRuntimeCommand} from '../protocol.ts'
import {cloneCornerRadii, cloneFill, cloneShadow, cloneStroke, findShapeById} from './model.ts'
import {createTransformPatches, resolveTransformBatchItemToLegacy} from './transformSerde.ts'

function createLogOnlyEntry(id: string, label: string): Omit<HistoryEntry, 'source'> {
  return {id, label, forward: [], backward: []}
}

export function createLocalHistoryEntry(
  command: EditorRuntimeCommand,
  scene: SceneMemory,
  document: EditorDocument,
): Omit<HistoryEntry, 'source'> {
  if (command.type === 'selection.delete') {
    const selectedIndices = getSelectedShapeIndices(scene).sort((left, right) => left - right)
    const selectedShapes = selectedIndices
      .map((index) => ({index, shape: document.shapes[index]}))
      .filter((item): item is {index: number; shape: DocumentNode} => Boolean(item.shape))

    if (selectedShapes.length === 0) {
      return {
        id: 'selection.delete',
        label: 'Clear Selection',
        forward: [{type: 'set-selected-index', prev: readSceneStats(scene).selectedIndex, next: -1}],
        backward: [{type: 'set-selected-index', prev: -1, next: readSceneStats(scene).selectedIndex}],
      }
    }

    return {
      id: 'selection.delete',
      label: 'Delete Selection',
      forward: [
        ...selectedShapes.slice().sort((left, right) => right.index - left.index).map(({index, shape}) => ({type: 'remove-shape' as const, index, shape})),
        {type: 'set-selected-index', prev: readSceneStats(scene).selectedIndex, next: -1},
      ],
      backward: [
        ...selectedShapes.map(({index, shape}) => ({type: 'insert-shape' as const, index, shape})),
        {type: 'set-selected-index', prev: -1, next: readSceneStats(scene).selectedIndex},
      ],
    }
  }

  if (command.type === 'shape.move') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) return createLogOnlyEntry(command.type, 'Move Missing Shape')
    return {
      id: `shape.move.${shape.id}`,
      label: `Move ${shape.name}`,
      forward: [{type: 'move-shape', shapeId: shape.id, prevX: shape.x, prevY: shape.y, nextX: command.x, nextY: command.y}],
      backward: [{type: 'move-shape', shapeId: shape.id, prevX: command.x, prevY: command.y, nextX: shape.x, nextY: shape.y}],
    }
  }

  if (command.type === 'shape.rename') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) return createLogOnlyEntry(command.type, 'Rename Missing Shape')
    const nextText = command.text ?? (shape.type === 'text' ? command.name : shape.text)
    return {
      id: `shape.rename.${shape.id}`,
      label: `Rename ${shape.name}`,
      forward: [{type: 'rename-shape', shapeId: shape.id, prevName: shape.name, nextName: command.name, prevText: shape.text, nextText}],
      backward: [{type: 'rename-shape', shapeId: shape.id, prevName: command.name, nextName: shape.name, prevText: nextText, nextText: shape.text}],
    }
  }

  if (command.type === 'shape.resize') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) return createLogOnlyEntry(command.type, 'Resize Missing Shape')
    return {
      id: `shape.resize.${shape.id}`,
      label: `Resize ${shape.name}`,
      forward: [{type: 'resize-shape', shapeId: shape.id, prevWidth: shape.width, prevHeight: shape.height, nextWidth: command.width, nextHeight: command.height}],
      backward: [{type: 'resize-shape', shapeId: shape.id, prevWidth: command.width, prevHeight: command.height, nextWidth: shape.width, nextHeight: shape.height}],
    }
  }

  if (command.type === 'shape.rotate') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) return createLogOnlyEntry(command.type, 'Rotate Missing Shape')
    const previousRotation = shape.rotation ?? 0
    return {
      id: `shape.rotate.${shape.id}`,
      label: `Rotate ${shape.name}`,
      forward: [{type: 'rotate-shape', shapeId: shape.id, prevRotation: previousRotation, nextRotation: command.rotation}],
      backward: [{type: 'rotate-shape', shapeId: shape.id, prevRotation: command.rotation, nextRotation: previousRotation}],
    }
  }

  if (command.type === 'shape.rotate.batch') {
    const candidates = command.rotations.map((item) => ({shape: findShapeById(document, item.shapeId), nextRotation: item.rotation})).filter((item): item is {shape: DocumentNode; nextRotation: number} => !!item.shape)
    if (candidates.length === 0) return createLogOnlyEntry(command.type, 'Rotate Missing Shape')
    const forward = candidates.map(({shape, nextRotation}) => ({type: 'rotate-shape' as const, shapeId: shape.id, prevRotation: shape.rotation ?? 0, nextRotation}))
    const backward = candidates.map(({shape, nextRotation}) => ({type: 'rotate-shape' as const, shapeId: shape.id, prevRotation: nextRotation, nextRotation: shape.rotation ?? 0}))
    return {id: `shape.rotate.batch.${Date.now()}`, label: `Rotate ${candidates.length} Shapes`, forward, backward}
  }

  if (command.type === 'shape.transform.batch') {
    const forward: HistoryPatch[] = []
    const backward: HistoryPatch[] = []
    let touchedShapes = 0
    command.transforms.forEach((item) => {
      const shape = findShapeById(document, item.id)
      if (!shape) return
      const resolved = resolveTransformBatchItemToLegacy(item)
      if (!resolved) return
      touchedShapes += 1
      const forwardPatches = createTransformPatches(shape, resolved.from, resolved.to)
      const backwardPatches = createTransformPatches(shape, resolved.to, resolved.from)
      forward.push(...forwardPatches)
      backwardPatches.forEach((patch) => backward.unshift(patch))
    })
    if (forward.length === 0) return createLogOnlyEntry(command.type, 'Transform Noop')
    return {id: `shape.transform.batch.${Date.now()}`, label: `Transform ${touchedShapes} Shapes`, forward, backward}
  }

  if (command.type === 'shape.patch') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) return createLogOnlyEntry(command.type, 'Patch Missing Shape')
    const nextFill = command.patch.fill === undefined ? cloneFill(shape.fill) : cloneFill(command.patch.fill)
    const nextStroke = command.patch.stroke === undefined ? cloneStroke(shape.stroke) : cloneStroke(command.patch.stroke)
    const nextShadow = command.patch.shadow === undefined ? cloneShadow(shape.shadow) : cloneShadow(command.patch.shadow)
    const nextCornerRadius = command.patch.cornerRadius === undefined ? shape.cornerRadius : command.patch.cornerRadius
    const nextCornerRadii = command.patch.cornerRadii === undefined ? cloneCornerRadii(shape.cornerRadii) : cloneCornerRadii(command.patch.cornerRadii)
    const nextEllipseStartAngle = command.patch.ellipseStartAngle === undefined ? shape.ellipseStartAngle : command.patch.ellipseStartAngle
    const nextEllipseEndAngle = command.patch.ellipseEndAngle === undefined ? shape.ellipseEndAngle : command.patch.ellipseEndAngle
    const nextFlipX = command.patch.flipX === undefined ? !!shape.flipX : command.patch.flipX
    const nextFlipY = command.patch.flipY === undefined ? !!shape.flipY : command.patch.flipY
    return {
      id: `shape.patch.${shape.id}`,
      label: `Patch ${shape.name}`,
      forward: [{type: 'patch-shape', shapeId: shape.id, prevFill: cloneFill(shape.fill), nextFill, prevStroke: cloneStroke(shape.stroke), nextStroke, prevShadow: cloneShadow(shape.shadow), nextShadow, prevCornerRadius: shape.cornerRadius, nextCornerRadius, prevCornerRadii: cloneCornerRadii(shape.cornerRadii), nextCornerRadii, prevEllipseStartAngle: shape.ellipseStartAngle, nextEllipseStartAngle, prevEllipseEndAngle: shape.ellipseEndAngle, nextEllipseEndAngle, prevFlipX: !!shape.flipX, nextFlipX, prevFlipY: !!shape.flipY, nextFlipY}],
      backward: [{type: 'patch-shape', shapeId: shape.id, prevFill: nextFill, nextFill: cloneFill(shape.fill), prevStroke: nextStroke, nextStroke: cloneStroke(shape.stroke), prevShadow: nextShadow, nextShadow: cloneShadow(shape.shadow), prevCornerRadius: nextCornerRadius, nextCornerRadius: shape.cornerRadius, prevCornerRadii: nextCornerRadii, nextCornerRadii: cloneCornerRadii(shape.cornerRadii), prevEllipseStartAngle: nextEllipseStartAngle, nextEllipseStartAngle: shape.ellipseStartAngle, prevEllipseEndAngle: nextEllipseEndAngle, nextEllipseEndAngle: shape.ellipseEndAngle, prevFlipX: nextFlipX, nextFlipX: !!shape.flipX, prevFlipY: nextFlipY, nextFlipY: !!shape.flipY}],
    }
  }

  if (command.type === 'shape.set-clip') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) return createLogOnlyEntry(command.type, 'Clip Missing Shape')
    return {
      id: `shape.set-clip.${shape.id}`,
      label: `Mask ${shape.name}`,
      forward: [{type: 'set-shape-clip', shapeId: shape.id, prevClipPathId: shape.clipPathId, nextClipPathId: command.clipPathId, prevClipRule: shape.clipRule, nextClipRule: command.clipRule}],
      backward: [{type: 'set-shape-clip', shapeId: shape.id, prevClipPathId: command.clipPathId, nextClipPathId: shape.clipPathId, prevClipRule: command.clipRule, nextClipRule: shape.clipRule}],
    }
  }

  if (command.type === 'shape.reorder') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) return createLogOnlyEntry(command.type, 'Reorder Missing Shape')
    const fromIndex = document.shapes.findIndex((item) => item.id === shape.id)
    if (fromIndex < 0 || fromIndex === command.toIndex) return createLogOnlyEntry(command.type, 'Reorder Shape')
    return {
      id: `shape.reorder.${shape.id}`,
      label: `Reorder ${shape.name}`,
      forward: [{type: 'reorder-shape', shapeId: shape.id, fromIndex, toIndex: command.toIndex}],
      backward: [{type: 'reorder-shape', shapeId: shape.id, fromIndex: command.toIndex, toIndex: fromIndex}],
    }
  }

  if (command.type === 'shape.insert') {
    const index = command.index ?? document.shapes.length
    return {
      id: `shape.insert.${command.shape.id}`,
      label: `Insert ${command.shape.name}`,
      forward: [{type: 'insert-shape', index, shape: command.shape}],
      backward: [{type: 'remove-shape', index, shape: command.shape}],
    }
  }

  if (command.type === 'shape.insert.batch') {
    if (command.shapes.length === 0) return createLogOnlyEntry(command.type, 'Insert Noop')
    const baseIndex = command.index ?? document.shapes.length
    const forward: HistoryPatch[] = []
    const backward: HistoryPatch[] = []
    command.shapes.forEach((shape, index) => {
      const targetIndex = baseIndex + index
      forward.push({type: 'insert-shape', index: targetIndex, shape})
      backward.unshift({type: 'remove-shape', index: targetIndex, shape})
    })
    return {id: `shape.insert.batch.${Date.now()}`, label: `Insert ${command.shapes.length} Shapes`, forward, backward}
  }

  if (command.type === 'shape.remove') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) return createLogOnlyEntry(command.type, 'Remove Missing Shape')
    const index = document.shapes.findIndex((item) => item.id === shape.id)
    return {
      id: `shape.remove.${shape.id}`,
      label: `Remove ${shape.name}`,
      forward: [{type: 'remove-shape', index, shape}],
      backward: [{type: 'insert-shape', index, shape}],
    }
  }

  if (command.type === 'viewport.zoomIn') return createLogOnlyEntry('viewport.zoomIn', 'Zoom In')
  if (command.type === 'viewport.zoomOut') return createLogOnlyEntry('viewport.zoomOut', 'Zoom Out')
  if (command.type === 'viewport.fit') return createLogOnlyEntry('viewport.fit', 'Fit Content')
  if (command.type === 'tool.select') return createLogOnlyEntry(`tool.${command.tool}`, `Select Tool: ${command.tool}`)
  if (command.type === 'selection.set') return createLogOnlyEntry('selection.set', 'Set Selection')

  return createLogOnlyEntry(command.type, command.type)
}
