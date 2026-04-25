import type {DocumentNode, EditorDocument} from '@venus/document-core'

export function resolveMaskGroupMembers(
  document: EditorDocument,
  shapeId: string,
) {
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape] as const))
  const shape = shapeById.get(shapeId)
  if (!shape) {
    return [] as DocumentNode[]
  }

  const maskGroupId = shape.schema?.maskGroupId
  if (maskGroupId) {
    return document.shapes.filter((candidate) => candidate.schema?.maskGroupId === maskGroupId)
  }

  const members = new Map<string, DocumentNode>([[shape.id, shape]])
  if (shape.type === 'image' && shape.clipPathId) {
    const clipShape = shapeById.get(shape.clipPathId)
    if (clipShape) {
      members.set(clipShape.id, clipShape)
    }
  }

  for (const candidate of document.shapes) {
    if (candidate.type === 'image' && candidate.clipPathId === shape.id) {
      members.set(candidate.id, candidate)
    }
  }

  return Array.from(members.values())
}

export function resolveMaskLinkedShapeIds(
  document: EditorDocument,
  shapeId: string,
) {
  return resolveMaskGroupMembers(document, shapeId).map((shape) => shape.id)
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

export function resolveMaskSourceNode(
  document: EditorDocument,
  shape: DocumentNode,
) {
  const members = resolveMaskGroupMembers(document, shape.id)
  const sourceMember = members.find((candidate) => candidate.schema?.maskRole === 'source')
  if (sourceMember) {
    return sourceMember
  }

  if (shape.type === 'image' && shape.clipPathId) {
    return document.shapes.find((candidate) => candidate.id === shape.clipPathId) ?? null
  }

  return null
}

export function buildMaskLinkedShapeIdsBySource(
  document: EditorDocument,
) {
  const linkedIdsBySource = new Map<string, string[]>()

  for (const shape of document.shapes) {
    const sourceNode = resolveMaskSourceNode(document, shape)
    if (!sourceNode || sourceNode.id === shape.id) {
      continue
    }

    const linkedIds = linkedIdsBySource.get(sourceNode.id) ?? []
    linkedIds.push(shape.id)
    linkedIdsBySource.set(sourceNode.id, linkedIds)
  }

  return linkedIdsBySource
}

export function includesMaskLinkedShapeIds(
  document: EditorDocument,
  shapeIds: string[],
) {
  return shapeIds.some((shapeId) => resolveMaskLinkedShapeIds(document, shapeId).some((linkedShapeId) => linkedShapeId !== shapeId))
}