import type {DocumentNode, EditorDocument} from '@venus/document-core'
import type {HistoryPatch} from '../history.ts'
import {findShapeById} from './model.ts'

function resolveMaskGroupId(hostShapeId: string, sourceShapeId: string) {
  return `mask-group:${hostShapeId}:${sourceShapeId}`
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