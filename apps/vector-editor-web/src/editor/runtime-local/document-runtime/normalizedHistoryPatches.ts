import type {DocumentNode, EditorDocument} from '@vector/model'
import type {HistoryPatch} from '../worker/history.ts'
import {createNormalizedRuntimeDocument, type NormalizedRuntimeDocument} from './normalizedDocumentRuntime.ts'

/**
 * Defines normalized group patch planning result used by local/remote command adapters.
 */
export interface NormalizedGroupPatchPlan {
  /** Stores deterministic group id selected for this plan. */
  groupId: string
  /** Stores insertion index used for legacy shape-array compatibility writes. */
  insertIndex: number
  /** Stores grouped shape ids in resolved sibling order. */
  groupedShapeIds: string[]
  /** Stores concrete reversible history patches. */
  patches: HistoryPatch[]
}

/**
 * Defines normalized ungroup patch planning result used by local/remote command adapters.
 */
export interface NormalizedUngroupPatchPlan {
  /** Stores ungroup target id. */
  groupId: string
  /** Stores concrete reversible history patches. */
  patches: HistoryPatch[]
}

/**
 * Defines sibling-order reorder patch planning result while preserving legacy array reorder compatibility.
 */
export interface NormalizedSiblingReorderPlan {
  /** Stores reordered shape id. */
  shapeId: string
  /** Stores updated sibling ordering patch for canonical parent-child order. */
  siblingPatch: Extract<HistoryPatch, {type: 'set-group-children'}>
  /** Stores compatibility reorder patch for flat runtime buffers. */
  compatibilityReorderPatch: Extract<HistoryPatch, {type: 'reorder-shape'}>
}

/**
 * Builds group patches from normalized parent/children structure and legacy geometry fields.
 */
export function createNormalizedGroupPatchPlan(input: {
  document: EditorDocument
  selectedShapeIds: string[]
  groupId: string
  groupName: string
}): NormalizedGroupPatchPlan | null {
  const normalized = createNormalizedRuntimeDocument(input.document)
  const selectedIdSet = new Set(input.selectedShapeIds.filter((shapeId) => !!normalized.nodes[shapeId]))
  if (selectedIdSet.size < 2) {
    return null
  }

  const selectedNodes = Array.from(selectedIdSet)
    .map((shapeId) => normalized.nodes[shapeId])
    .filter((node): node is NonNullable<typeof node> => !!node)
  if (selectedNodes.length < 2) {
    return null
  }

  const firstParentId = selectedNodes[0].parentId
  const hasCommonParent = selectedNodes.every((node) => node.parentId === firstParentId)
  const commonParentId = hasCommonParent ? firstParentId : null

  const groupedShapeIds = resolveGroupedShapeIds(normalized, selectedIdSet, commonParentId)
  if (groupedShapeIds.length < 2) {
    return null
  }

  const selectedShapes = groupedShapeIds
    .map((shapeId) => normalized.nodes[shapeId]?.shape)
    .filter((shape): shape is DocumentNode => !!shape)

  const selectedIndices = selectedShapes
    .map((shape) => input.document.shapes.findIndex((item) => item.id === shape.id))
    .filter((index) => index >= 0)
  if (selectedIndices.length < 2) {
    return null
  }

  const insertIndex = Math.max(...selectedIndices) + 1
  const groupShape: DocumentNode = {
    id: input.groupId,
    type: 'group',
    name: input.groupName,
    parentId: commonParentId,
    childIds: groupedShapeIds.slice(),
    ...resolveNodeBounds(selectedShapes),
  }

  const patches: HistoryPatch[] = [
    {type: 'insert-shape', index: insertIndex, shape: groupShape},
    {type: 'set-group-children', groupId: input.groupId, prevChildIds: undefined, nextChildIds: groupedShapeIds.slice()},
  ]

  // Remove selected children from every other group that currently references them.
  Object.values(normalized.nodes).forEach((node) => {
    if (node.type !== 'group' || node.id === commonParentId) {
      return
    }

    if (!node.children.some((childId) => selectedIdSet.has(childId))) {
      return
    }

    patches.push({
      type: 'set-group-children',
      groupId: node.id,
      prevChildIds: node.children.slice(),
      nextChildIds: node.children.filter((childId) => !selectedIdSet.has(childId)),
    })
  })

  if (commonParentId) {
    const parentNode = normalized.nodes[commonParentId]
    if (parentNode?.type === 'group') {
      const nextParentChildIds = parentNode.children.filter((childId) => !selectedIdSet.has(childId))
      nextParentChildIds.push(input.groupId)
      patches.push({
        type: 'set-group-children',
        groupId: parentNode.id,
        prevChildIds: parentNode.children.slice(),
        nextChildIds: nextParentChildIds,
      })
    }
  }

  groupedShapeIds.forEach((shapeId) => {
    const shape = normalized.nodes[shapeId]?.shape
    if (!shape) {
      return
    }

    patches.push({
      type: 'set-shape-parent',
      shapeId,
      prevParentId: shape.parentId,
      nextParentId: input.groupId,
    })
  })

  return {
    groupId: input.groupId,
    insertIndex,
    groupedShapeIds,
    patches,
  }
}

/**
 * Builds ungroup patches from normalized group children order and parent ownership.
 */
export function createNormalizedUngroupPatchPlan(input: {
  document: EditorDocument
  groupId: string
}): NormalizedUngroupPatchPlan | null {
  const normalized = createNormalizedRuntimeDocument(input.document)
  const groupNode = normalized.nodes[input.groupId]
  if (!groupNode || groupNode.type !== 'group') {
    return null
  }

  const groupIndex = input.document.shapes.findIndex((shape) => shape.id === groupNode.id)
  if (groupIndex < 0) {
    return null
  }

  const childIds = groupNode.children.filter((childId) => !!normalized.nodes[childId])
  if (childIds.length === 0) {
    return null
  }

  const patches: HistoryPatch[] = []

  if (groupNode.parentId) {
    const parentNode = normalized.nodes[groupNode.parentId]
    if (parentNode?.type === 'group') {
      const nextParentChildIds: string[] = []
      parentNode.children.forEach((childId) => {
        if (childId === groupNode.id) {
          nextParentChildIds.push(...childIds)
          return
        }

        nextParentChildIds.push(childId)
      })

      patches.push({
        type: 'set-group-children',
        groupId: parentNode.id,
        prevChildIds: parentNode.children.slice(),
        nextChildIds: nextParentChildIds,
      })
    }
  }

  childIds.forEach((childId) => {
    patches.push({
      type: 'set-shape-parent',
      shapeId: childId,
      prevParentId: groupNode.id,
      nextParentId: groupNode.parentId,
    })
  })

  patches.push({
    type: 'set-group-children',
    groupId: groupNode.id,
    prevChildIds: groupNode.children.slice(),
    nextChildIds: [],
  })
  patches.push({
    type: 'remove-shape',
    index: groupIndex,
    shape: groupNode.shape,
  })

  return {
    groupId: input.groupId,
    patches,
  }
}

/**
 * Builds sibling-order reorder patches for group children while keeping flat-buffer reorder compatibility.
 */
export function createNormalizedSiblingReorderPlan(input: {
  document: EditorDocument
  shapeId: string
  toIndex: number
}): NormalizedSiblingReorderPlan | null {
  const normalized = createNormalizedRuntimeDocument(input.document)
  const shapeNode = normalized.nodes[input.shapeId]
  if (!shapeNode || !shapeNode.parentId) {
    return null
  }

  const parentNode = normalized.nodes[shapeNode.parentId]
  if (!parentNode || parentNode.type !== 'group') {
    return null
  }

  const prevChildIds = parentNode.children.slice()
  const currentSiblingIndex = prevChildIds.indexOf(shapeNode.id)
  if (currentSiblingIndex < 0 || prevChildIds.length < 2) {
    return null
  }

  // Map incoming index to sibling index so reordering is parent-scope deterministic.
  const nextSiblingIndex = clamp(input.toIndex, 0, prevChildIds.length - 1)
  const nextChildIds = prevChildIds.slice()
  nextChildIds.splice(currentSiblingIndex, 1)
  nextChildIds.splice(nextSiblingIndex, 0, shapeNode.id)

  if (areStringArraysEqual(prevChildIds, nextChildIds)) {
    return null
  }

  const compatibilityFromIndex = input.document.shapes.findIndex((shape) => shape.id === shapeNode.id)
  const anchorShapeId = nextChildIds[nextSiblingIndex]
  const compatibilityToIndex = input.document.shapes.findIndex((shape) => shape.id === anchorShapeId)
  if (compatibilityFromIndex < 0 || compatibilityToIndex < 0) {
    return null
  }

  return {
    shapeId: shapeNode.id,
    siblingPatch: {
      type: 'set-group-children',
      groupId: parentNode.id,
      prevChildIds,
      nextChildIds,
    },
    compatibilityReorderPatch: {
      type: 'reorder-shape',
      shapeId: shapeNode.id,
      fromIndex: compatibilityFromIndex,
      toIndex: compatibilityToIndex,
    },
  }
}

/**
 * Checks whether document parent and group-child representations stay equivalent after patch apply.
 */
export function validateNormalizedDualWriteConsistency(document: EditorDocument): {
  valid: boolean
  issues: string[]
} {
  const normalized = createNormalizedRuntimeDocument(document)
  const issues: string[] = []

  Object.values(normalized.nodes).forEach((node) => {
    if (node.type !== 'group') {
      return
    }

    node.children.forEach((childId) => {
      const child = normalized.nodes[childId]
      if (!child) {
        issues.push(`group:${node.id} references missing child:${childId}`)
        return
      }

      if (child.parentId !== node.id) {
        issues.push(`child:${childId} parentId mismatch expected:${node.id} actual:${child.parentId ?? 'null'}`)
      }
    })
  })

  Object.values(normalized.nodes).forEach((node) => {
    if (!node.parentId) {
      return
    }

    const parent = normalized.nodes[node.parentId]
    if (!parent || parent.type !== 'group') {
      issues.push(`node:${node.id} has invalid parent:${node.parentId}`)
      return
    }

    if (!parent.children.includes(node.id)) {
      issues.push(`node:${node.id} missing from parent:${parent.id} children list`)
    }
  })

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Resolves grouped shape ids using common parent sibling order when possible.
 */
function resolveGroupedShapeIds(
  normalized: NormalizedRuntimeDocument,
  selectedIdSet: Set<string>,
  commonParentId: string | null,
): string[] {
  if (commonParentId) {
    const parentNode = normalized.nodes[commonParentId]
    if (parentNode?.type === 'group') {
      return parentNode.children.filter((childId) => selectedIdSet.has(childId))
    }
  }

  return Object.values(normalized.nodes)
    .filter((node) => selectedIdSet.has(node.id))
    .map((node) => node.id)
}

/**
 * Resolves axis-aligned bounds from selected node geometry.
 */
function resolveNodeBounds(nodes: DocumentNode[]): Pick<DocumentNode, 'x' | 'y' | 'width' | 'height'> {
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

/**
 * Compares two string arrays with exact order matching.
 */
function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

/**
 * Clamps one numeric value between min and max bounds.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

