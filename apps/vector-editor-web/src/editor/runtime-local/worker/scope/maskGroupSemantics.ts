import type {DocumentNode, EditorDocument} from '@venus/document-core'
import type {HistoryPatch} from '../history.ts'
import {findShapeById} from './model.ts'

function resolveMaskGroupId(hostShapeId: string, sourceShapeId: string) {
  return `mask-group:${hostShapeId}:${sourceShapeId}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function resolveMaskLinkedShapeIds(
  document: EditorDocument,
  shapeId: string,
) {
  const shape = findShapeById(document, shapeId)
  if (!shape) {
    return [] as string[]
  }

  // Prefer persisted mask-group metadata, then fall back to legacy clip links.
  if (shape.schema?.maskGroupId) {
    return document.shapes
      .filter((candidate) => candidate.schema?.maskGroupId === shape.schema?.maskGroupId)
      .map((candidate) => candidate.id)
  }

  const linkedShapeIds = new Set<string>([shape.id])
  if (shape.type === 'image' && shape.clipPathId) {
    linkedShapeIds.add(shape.clipPathId)
  }

  for (const candidate of document.shapes) {
    if (candidate.type === 'image' && candidate.clipPathId === shape.id) {
      linkedShapeIds.add(candidate.id)
    }
  }

  return [...linkedShapeIds]
}

export function expandMaskLinkedShapeIds(
  document: EditorDocument,
  shapeIds: string[],
) {
  const expandedShapeIds = new Set<string>()
  for (const shapeId of shapeIds) {
    resolveMaskLinkedShapeIds(document, shapeId).forEach((linkedShapeId) => {
      expandedShapeIds.add(linkedShapeId)
    })
  }

  return [...expandedShapeIds]
}

export function includesMaskLinkedShapeIds(
  document: EditorDocument,
  shapeIds: string[],
) {
  return shapeIds.some((shapeId) => resolveMaskLinkedShapeIds(document, shapeId).some((linkedShapeId) => linkedShapeId !== shapeId))
}

export function createMaskLinkedReorderPatches(input: {
  document: EditorDocument
  shapeId: string
  toIndex: number
}) {
  const shape = findShapeById(input.document, input.shapeId)
  if (!shape) {
    return [] as HistoryPatch[]
  }

  const currentOrder = input.document.shapes.map((candidate) => candidate.id)
  const blockIds = resolveMaskLinkedShapeIds(input.document, input.shapeId)
    .sort((left, right) => currentOrder.indexOf(left) - currentOrder.indexOf(right))
  const primaryOffset = blockIds.indexOf(input.shapeId)
  if (primaryOffset < 0) {
    return [] as HistoryPatch[]
  }

  const blockIdSet = new Set(blockIds)
  const remainingOrder = currentOrder.filter((candidate) => !blockIdSet.has(candidate))
  // Keep the reserved base layer behavior while moving linked mask members as one block.
  const minInsertIndex = currentOrder.length > blockIds.length ? 1 : 0
  const maxInsertIndex = Math.max(minInsertIndex, remainingOrder.length)
  const insertIndex = clamp(input.toIndex - primaryOffset, minInsertIndex, maxInsertIndex)
  const nextOrder = [
    ...remainingOrder.slice(0, insertIndex),
    ...blockIds,
    ...remainingOrder.slice(insertIndex),
  ]

  const patches: HistoryPatch[] = []
  const mutableOrder = currentOrder.slice()
  for (const [desiredIndex, desiredShapeId] of nextOrder.entries()) {
    const fromIndex = mutableOrder.indexOf(desiredShapeId)
    if (fromIndex === desiredIndex) {
      continue
    }

    patches.push({
      type: 'reorder-shape',
      shapeId: desiredShapeId,
      fromIndex,
      toIndex: desiredIndex,
    })

    mutableOrder.splice(fromIndex, 1)
    mutableOrder.splice(desiredIndex, 0, desiredShapeId)
  }

  return patches
}

export function resolveMaskSchemaPatches(input: {
  document: EditorDocument
  hostShapeId: string
  nextClipPathId?: string
}) {
  const hostShape = findShapeById(input.document, input.hostShapeId)
  if (!hostShape) {
    return [] as HistoryPatch[]
  }

  const nextClipByHost = new Map<string, string>()
  for (const shape of input.document.shapes) {
    if (shape.type === 'image' && shape.clipPathId && shape.id !== input.hostShapeId) {
      nextClipByHost.set(shape.id, shape.clipPathId)
    }
  }

  if (input.nextClipPathId) {
    nextClipByHost.set(input.hostShapeId, input.nextClipPathId)
  }

  const nextHostsBySource = new Map<string, string[]>()
  for (const [hostShapeId, sourceShapeId] of nextClipByHost.entries()) {
    const hostShapeIds = nextHostsBySource.get(sourceShapeId) ?? []
    hostShapeIds.push(hostShapeId)
    nextHostsBySource.set(sourceShapeId, hostShapeIds)
  }

  const affectedShapeIds = new Set<string>([input.hostShapeId])
  if (hostShape.clipPathId) {
    affectedShapeIds.add(hostShape.clipPathId)
  }
  if (input.nextClipPathId) {
    affectedShapeIds.add(input.nextClipPathId)
  }

  const patches: HistoryPatch[] = []
  for (const shapeId of affectedShapeIds) {
    const shape = findShapeById(input.document, shapeId)
    if (!shape) {
      continue
    }

    const prevMaskGroupId = shape.schema?.maskGroupId
    const prevMaskRole = shape.schema?.maskRole
    let nextMaskGroupId: DocumentNode['schema'] extends {maskGroupId?: infer T} ? T : string | undefined
    let nextMaskRole: DocumentNode['schema'] extends {maskRole?: infer T} ? T : 'host' | 'source' | undefined

    if (shapeId === input.hostShapeId && input.nextClipPathId) {
      nextMaskGroupId = resolveMaskGroupId(input.hostShapeId, input.nextClipPathId)
      nextMaskRole = 'host'
    } else {
      const representativeHostId = [...(nextHostsBySource.get(shapeId) ?? [])].sort()[0]
      if (representativeHostId) {
        nextMaskGroupId = resolveMaskGroupId(representativeHostId, shapeId)
        nextMaskRole = 'source'
      }
    }

    if (prevMaskGroupId === nextMaskGroupId && prevMaskRole === nextMaskRole) {
      continue
    }

    patches.push({
      type: 'set-shape-mask-schema',
      shapeId,
      prevMaskGroupId,
      nextMaskGroupId,
      prevMaskRole,
      nextMaskRole,
    })
  }

  return patches
}

export function invertMaskSchemaPatches(patches: HistoryPatch[]) {
  return patches
    .filter((patch): patch is Extract<HistoryPatch, {type: 'set-shape-mask-schema'}> => patch.type === 'set-shape-mask-schema')
    .map((patch) => ({
      ...patch,
      prevMaskGroupId: patch.nextMaskGroupId,
      nextMaskGroupId: patch.prevMaskGroupId,
      prevMaskRole: patch.nextMaskRole,
      nextMaskRole: patch.prevMaskRole,
    }))
}

export function applyMaskSchemaPatch(
  shape: DocumentNode,
  patch: Extract<HistoryPatch, {type: 'set-shape-mask-schema'}>,
) {
  const nextSchema = shape.schema
    ? {
        ...shape.schema,
        sourceFeatureKinds: shape.schema.sourceFeatureKinds?.slice(),
      }
    : {
        sourceNodeType: undefined,
        sourceNodeKind: undefined,
        sourceFeatureKinds: undefined,
      }

  if (patch.nextMaskGroupId) {
    nextSchema.maskGroupId = patch.nextMaskGroupId
  } else {
    delete nextSchema.maskGroupId
  }

  if (patch.nextMaskRole) {
    nextSchema.maskRole = patch.nextMaskRole
  } else {
    delete nextSchema.maskRole
  }

  const hasSchemaFields = Object.values(nextSchema).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0
    }
    return value !== undefined
  })

  shape.schema = hasSchemaFields ? nextSchema : undefined
}