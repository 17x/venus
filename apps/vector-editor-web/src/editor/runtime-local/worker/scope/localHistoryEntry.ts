import {nid, type DocumentNode, type EditorDocument} from '@venus/document-core'
import type {MatrixFirstNodeTransform} from '@venus/engine'
import {getSelectedShapeIndices, readSceneStats, type SceneMemory} from '@vector/runtime/shared-memory'
import type {HistoryEntry, HistoryPatch} from '../history.ts'
import type {EditorRuntimeCommand} from '../protocol.ts'
import {cloneCornerRadii, cloneFill, cloneShadow, cloneStroke, findShapeById} from './model.ts'
import {
  convertShapeToPathShape,
  createAlignMovePatches,
  createBooleanReplacePatches,
  createDistributeMovePatches,
} from './shapeCommandHelpers.ts'
import {createTransformPatches, resolveTransformBatchItemToLegacy} from './transformSerde.ts'

function createLogOnlyEntry(id: string, label: string): Omit<HistoryEntry, 'source'> {
  return {id, label, forward: [], backward: []}
}

function getNodeBounds(nodes: DocumentNode[]) {
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
    const candidates = command.rotations.map((item: {shapeId: string; rotation: number}) => ({shape: findShapeById(document, item.shapeId), nextRotation: item.rotation})).filter((item: {shape: DocumentNode | null; nextRotation: number}): item is {shape: DocumentNode; nextRotation: number} => !!item.shape)
    if (candidates.length === 0) return createLogOnlyEntry(command.type, 'Rotate Missing Shape')
    const forward = candidates.map(({shape, nextRotation}: {shape: DocumentNode; nextRotation: number}) => ({type: 'rotate-shape' as const, shapeId: shape.id, prevRotation: shape.rotation ?? 0, nextRotation}))
    const backward = candidates.map(({shape, nextRotation}: {shape: DocumentNode; nextRotation: number}) => ({type: 'rotate-shape' as const, shapeId: shape.id, prevRotation: nextRotation, nextRotation: shape.rotation ?? 0}))
    return {id: `shape.rotate.batch.${Date.now()}`, label: `Rotate ${candidates.length} Shapes`, forward, backward}
  }

  if (command.type === 'shape.transform.batch') {
    const forward: HistoryPatch[] = []
    const backward: HistoryPatch[] = []
    let touchedShapes = 0
    command.transforms.forEach((item: {id: string; fromMatrix: MatrixFirstNodeTransform; toMatrix: MatrixFirstNodeTransform}) => {
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
    command.shapes.forEach((shape: DocumentNode, index: number) => {
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

  if (command.type === 'shape.group') {
    const selectedShapeIds = command.shapeIds && command.shapeIds.length > 0
      ? command.shapeIds
      : getSelectedShapeIndices(scene)
        .map((index) => document.shapes[index]?.id)
        .filter((shapeId): shapeId is string => typeof shapeId === 'string')
    const selectedShapes = selectedShapeIds
      .map((shapeId: string) => findShapeById(document, shapeId))
      .filter((shape: DocumentNode | null): shape is DocumentNode => shape !== null)
    if (selectedShapes.length < 2) return createLogOnlyEntry(command.type, 'Group Noop')

    const selectedIndices = selectedShapes
      .map((shape: DocumentNode) => ({shape, index: document.shapes.findIndex((item) => item.id === shape.id)}))
      .filter((item: {shape: DocumentNode; index: number}) => item.index >= 0)
      .sort((left: {shape: DocumentNode; index: number}, right: {shape: DocumentNode; index: number}) => left.index - right.index)
    if (selectedIndices.length < 2) return createLogOnlyEntry(command.type, 'Group Noop')

    const firstParentId = selectedIndices[0].shape.parentId ?? null
    const commonParentId = selectedIndices.every((item: {shape: DocumentNode; index: number}) => (item.shape.parentId ?? null) === firstParentId)
      ? firstParentId
      : null
    const parentGroup = commonParentId ? findShapeById(document, commonParentId) : null
    const parentPrevChildIds = parentGroup?.childIds?.slice()
    const selectedIdSet = new Set(selectedIndices.map((item: {shape: DocumentNode; index: number}) => item.shape.id))
    const affectedParentGroups = document.shapes
      .filter((shape): shape is DocumentNode => shape.type === 'group' && shape.id !== commonParentId && Array.isArray(shape.childIds) && shape.childIds.some((childId) => selectedIdSet.has(childId)))
      .map((group) => ({
        groupId: group.id,
        prevChildIds: group.childIds?.slice() ?? [],
        nextChildIds: (group.childIds ?? []).filter((childId) => !selectedIdSet.has(childId)),
      }))
    const groupId = command.groupId ?? `group-${nid()}`
    const groupedShapeIds = selectedIndices.map((item: {shape: DocumentNode; index: number}) => item.shape.id)
    const bounds = getNodeBounds(selectedIndices.map((item: {shape: DocumentNode; index: number}) => item.shape))
    const insertIndex = selectedIndices[selectedIndices.length - 1].index + 1
    const previousSelectedIndex = readSceneStats(scene).selectedIndex

    const groupShape: DocumentNode = {
      id: groupId,
      type: 'group',
      name: command.name ?? 'Group',
      parentId: commonParentId,
      childIds: groupedShapeIds,
      ...bounds,
    }

    const forward: HistoryPatch[] = [
      {type: 'insert-shape', index: insertIndex, shape: groupShape},
      {type: 'set-group-children', groupId, prevChildIds: undefined, nextChildIds: groupedShapeIds.slice()},
    ]
    const backward: HistoryPatch[] = [
      {type: 'set-group-children', groupId, prevChildIds: groupedShapeIds.slice(), nextChildIds: undefined},
      {type: 'remove-shape', index: insertIndex, shape: groupShape},
    ]

    affectedParentGroups.forEach((groupPatch) => {
      forward.push({
        type: 'set-group-children',
        groupId: groupPatch.groupId,
        prevChildIds: groupPatch.prevChildIds,
        nextChildIds: groupPatch.nextChildIds,
      })
      backward.unshift({
        type: 'set-group-children',
        groupId: groupPatch.groupId,
        prevChildIds: groupPatch.nextChildIds,
        nextChildIds: groupPatch.prevChildIds,
      })
    })

    if (parentGroup && Array.isArray(parentPrevChildIds)) {
      const nextParentChildIds = parentPrevChildIds.filter((id) => !groupedShapeIds.includes(id))
      nextParentChildIds.push(groupId)
      forward.push({
        type: 'set-group-children',
        groupId: parentGroup.id,
        prevChildIds: parentPrevChildIds,
        nextChildIds: nextParentChildIds,
      })
      backward.unshift({
        type: 'set-group-children',
        groupId: parentGroup.id,
        prevChildIds: nextParentChildIds,
        nextChildIds: parentPrevChildIds,
      })
    }

    selectedIndices.forEach(({shape}: {shape: DocumentNode; index: number}) => {
      forward.push({type: 'set-shape-parent', shapeId: shape.id, prevParentId: shape.parentId, nextParentId: groupId})
      backward.unshift({type: 'set-shape-parent', shapeId: shape.id, prevParentId: groupId, nextParentId: shape.parentId})
    })

    forward.push({type: 'set-selected-index', prev: previousSelectedIndex, next: insertIndex})
    backward.unshift({type: 'set-selected-index', prev: insertIndex, next: previousSelectedIndex})

    return {
      id: `shape.group.${groupId}`,
      label: `Group ${selectedIndices.length} Shapes`,
      forward,
      backward,
    }
  }

  if (command.type === 'shape.ungroup') {
    const selectedPrimaryIndex = readSceneStats(scene).selectedIndex
    const selectedPrimary = selectedPrimaryIndex >= 0 ? document.shapes[selectedPrimaryIndex] : undefined
    const targetGroupId = command.groupId ?? (selectedPrimary?.type === 'group' ? selectedPrimary.id : undefined)
    const groupShape = targetGroupId ? findShapeById(document, targetGroupId) : null
    if (!groupShape || groupShape.type !== 'group') return createLogOnlyEntry(command.type, 'Ungroup Missing Group')

    const groupIndex = document.shapes.findIndex((item) => item.id === groupShape.id)
    if (groupIndex < 0) return createLogOnlyEntry(command.type, 'Ungroup Missing Group')

    const childIds = (groupShape.childIds ?? []).filter((childId) => findShapeById(document, childId) !== null)
    if (childIds.length === 0) return createLogOnlyEntry(command.type, 'Ungroup Empty Group')

    const parentGroup = groupShape.parentId ? findShapeById(document, groupShape.parentId) : null
    const parentPrevChildIds = parentGroup?.childIds?.slice()
    const previousSelectedIndex = readSceneStats(scene).selectedIndex
    const forward: HistoryPatch[] = []
    const backward: HistoryPatch[] = []

    if (parentGroup && Array.isArray(parentPrevChildIds)) {
      const nextParentChildIds: string[] = []
      parentPrevChildIds.forEach((id) => {
        if (id === groupShape.id) {
          nextParentChildIds.push(...childIds)
        } else {
          nextParentChildIds.push(id)
        }
      })

      forward.push({
        type: 'set-group-children',
        groupId: parentGroup.id,
        prevChildIds: parentPrevChildIds,
        nextChildIds: nextParentChildIds,
      })
      backward.unshift({
        type: 'set-group-children',
        groupId: parentGroup.id,
        prevChildIds: nextParentChildIds,
        nextChildIds: parentPrevChildIds,
      })
    }

    childIds.forEach((childId) => {
      forward.push({type: 'set-shape-parent', shapeId: childId, prevParentId: groupShape.id, nextParentId: groupShape.parentId})
      backward.unshift({type: 'set-shape-parent', shapeId: childId, prevParentId: groupShape.parentId, nextParentId: groupShape.id})
    })

    forward.push({type: 'set-group-children', groupId: groupShape.id, prevChildIds: groupShape.childIds?.slice(), nextChildIds: []})
    forward.push({type: 'remove-shape', index: groupIndex, shape: groupShape})
    forward.push({type: 'set-selected-index', prev: previousSelectedIndex, next: -1})

    backward.unshift({type: 'set-selected-index', prev: -1, next: previousSelectedIndex})
    backward.unshift({type: 'insert-shape', index: groupIndex, shape: groupShape})
    backward.unshift({type: 'set-group-children', groupId: groupShape.id, prevChildIds: [], nextChildIds: groupShape.childIds?.slice()})

    return {
      id: `shape.ungroup.${groupShape.id}`,
      label: `Ungroup ${groupShape.name}`,
      forward,
      backward,
    }
  }

  if (command.type === 'shape.convert-to-path') {
    const candidateIds = Array.isArray(command.shapeIds) && command.shapeIds.length > 0
      ? command.shapeIds
      : getSelectedShapeIndices(scene)
        .map((index) => document.shapes[index]?.id)
        .filter((shapeId): shapeId is string => typeof shapeId === 'string')

    const targetShapes = candidateIds
      .map((shapeId: string) => ({
        shape: findShapeById(document, shapeId),
        index: document.shapes.findIndex((item) => item.id === shapeId),
      }))
      .filter((item: {shape: DocumentNode | null; index: number}): item is {shape: DocumentNode; index: number} => item.shape !== null && item.index >= 0)

    const forward: HistoryPatch[] = []
    const backward: HistoryPatch[] = []
    let convertedCount = 0

    targetShapes.forEach(({shape, index}: {shape: DocumentNode; index: number}) => {
      const converted = convertShapeToPathShape(shape)
      if (!converted) return
      convertedCount += 1
      forward.push({type: 'remove-shape', index, shape})
      forward.push({type: 'insert-shape', index, shape: converted})
      backward.push({type: 'remove-shape', index, shape: converted})
      backward.push({type: 'insert-shape', index, shape})
    })

    if (convertedCount === 0) return createLogOnlyEntry(command.type, 'Convert To Path Noop')
    return {
      id: `shape.convert-to-path.${Date.now()}`,
      label: `Convert ${convertedCount} Shapes to Path`,
      forward,
      backward,
    }
  }

  if (command.type === 'shape.boolean') {
    const candidateIds = Array.isArray(command.shapeIds) && command.shapeIds.length > 0
      ? command.shapeIds
      : getSelectedShapeIndices(scene)
        .map((index) => document.shapes[index]?.id)
        .filter((shapeId): shapeId is string => typeof shapeId === 'string')

    const resolved = createBooleanReplacePatches(document, candidateIds, command.mode)
    if (!resolved || resolved.patches.length === 0) {
      return createLogOnlyEntry(command.type, 'Boolean Noop')
    }

    const insertedPatches = resolved.patches.filter(
      (patch): patch is Extract<HistoryPatch, {type: 'insert-shape'}> => patch.type === 'insert-shape',
    )

    const previousSelectedIndex = readSceneStats(scene).selectedIndex
    const forward: HistoryPatch[] = [
      ...resolved.patches,
      {type: 'set-selected-index', prev: previousSelectedIndex, next: resolved.resultIndex},
    ]

    const backward: HistoryPatch[] = [
      {type: 'set-selected-index', prev: resolved.resultIndex, next: previousSelectedIndex},
      ...insertedPatches
        .slice()
        .sort((left, right) => right.index - left.index)
        .map((patch) => ({type: 'remove-shape' as const, index: patch.index, shape: patch.shape})),
      ...resolved.patches
        .filter((patch): patch is Extract<HistoryPatch, {type: 'remove-shape'}> => patch.type === 'remove-shape')
        .sort((left, right) => left.index - right.index)
        .map((patch) => ({type: 'insert-shape' as const, index: patch.index, shape: patch.shape})),
    ]

    return {
      id: `shape.boolean.${command.mode}.${Date.now()}`,
      label: `Boolean ${command.mode} (${resolved.touchedCount})`,
      forward,
      backward,
    }
  }

  if (command.type === 'shape.align') {
    const shapeIds = Array.isArray(command.shapeIds) && command.shapeIds.length > 0
      ? command.shapeIds
      : getSelectedShapeIndices(scene)
        .map((index) => document.shapes[index]?.id)
        .filter((shapeId): shapeId is string => typeof shapeId === 'string')

    const forward = createAlignMovePatches(document, shapeIds, command.mode, command.reference ?? 'selection')
    if (forward.length === 0) return createLogOnlyEntry(command.type, 'Align Noop')
    const backward = forward
      .slice()
      .reverse()
      .map((patch) => ({
        type: 'move-shape' as const,
        shapeId: patch.shapeId,
        prevX: patch.nextX,
        prevY: patch.nextY,
        nextX: patch.prevX,
        nextY: patch.prevY,
      }))

    return {
      id: `shape.align.${command.mode}.${Date.now()}`,
      label: `Align ${forward.length} Shapes`,
      forward,
      backward,
    }
  }

  if (command.type === 'shape.distribute') {
    const shapeIds = Array.isArray(command.shapeIds) && command.shapeIds.length > 0
      ? command.shapeIds
      : getSelectedShapeIndices(scene)
        .map((index) => document.shapes[index]?.id)
        .filter((shapeId): shapeId is string => typeof shapeId === 'string')

    const forward = createDistributeMovePatches(document, shapeIds, command.mode)
    if (forward.length === 0) return createLogOnlyEntry(command.type, 'Distribute Noop')
    const backward = forward
      .slice()
      .reverse()
      .map((patch) => ({
        type: 'move-shape' as const,
        shapeId: patch.shapeId,
        prevX: patch.nextX,
        prevY: patch.nextY,
        nextX: patch.prevX,
        nextY: patch.prevY,
      }))

    return {
      id: `shape.distribute.${command.mode}.${Date.now()}`,
      label: `Distribute ${forward.length} Shapes`,
      forward,
      backward,
    }
  }

  if (command.type === 'viewport.zoomIn') return createLogOnlyEntry('viewport.zoomIn', 'Zoom In')
  if (command.type === 'viewport.zoomOut') return createLogOnlyEntry('viewport.zoomOut', 'Zoom Out')
  if (command.type === 'viewport.fit') return createLogOnlyEntry('viewport.fit', 'Fit Content')
  if (command.type === 'tool.select') return createLogOnlyEntry(`tool.${command.tool}`, `Select Tool: ${command.tool}`)
  if (command.type === 'selection.set') return createLogOnlyEntry('selection.set', 'Set Selection')

  return createLogOnlyEntry(command.type, command.type)
}
