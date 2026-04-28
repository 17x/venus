import type {DocumentNode, EditorDocument} from '@vector/model'
import {getNormalizedBoundsFromBox} from '@venus/lib/geometry'

/**
 * Defines one normalized runtime node projection used by the pure TS document runtime.
 */
export interface NormalizedRuntimeNode {
  /** Stores stable node id. */
  id: string
  /** Stores node type for group/non-group branching. */
  type: DocumentNode['type']
  /** Stores parent id in normalized graph form. */
  parentId: string | null
  /** Stores ordered child ids for traversal and z-order semantics. */
  children: string[]
  /** Stores mutable legacy shape reference while UI stays unchanged. */
  shape: DocumentNode
}

/**
 * Defines normalized runtime document projection consumed by migration helpers.
 */
export interface NormalizedRuntimeDocument {
  /** Stores root node ids in visual/document order. */
  rootIds: string[]
  /** Stores normalized node table keyed by node id. */
  nodes: Record<string, NormalizedRuntimeNode>
}

/**
 * Creates a normalized document graph projection from the legacy `document.shapes[]` source.
 */
export function createNormalizedRuntimeDocument(document: EditorDocument): NormalizedRuntimeDocument {
  const nodes: Record<string, NormalizedRuntimeNode> = {}
  const orderById = new Map<string, number>()

  // Seed nodes first so parent/child links can be resolved in one compatibility pass.
  document.shapes.forEach((shape, index) => {
    orderById.set(shape.id, index)
    nodes[shape.id] = {
      id: shape.id,
      type: shape.type,
      parentId: shape.parentId ?? null,
      children: [],
      shape,
    }
  })

  // Preserve explicit group child order when `childIds` exists.
  document.shapes.forEach((shape) => {
    if (shape.type !== 'group') {
      return
    }

    const groupNode = nodes[shape.id]
    groupNode.children = (shape.childIds ?? []).filter((childId) => !!nodes[childId])
  })

  // AI-TEMP: legacy scenes can omit `group.childIds`; remove when all persisted scenes guarantee canonical childIds; ref docs/task/vector.documentNode-gpt.md
  // Backfill missing child lists from parent pointers so migration can stay source-compatible.
  document.shapes.forEach((shape) => {
    const parentId = shape.parentId ?? null
    if (!parentId) {
      return
    }

    const parent = nodes[parentId]
    if (!parent || parent.type !== 'group') {
      return
    }

    if (!parent.children.includes(shape.id)) {
      parent.children.push(shape.id)
    }
  })

  // Keep fallback-inferred child order deterministic by original shape order.
  Object.values(nodes).forEach((node) => {
    if (node.children.length < 2) {
      return
    }

    node.children.sort((leftId, rightId) => {
      const leftOrder = orderById.get(leftId) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = orderById.get(rightId) ?? Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder
    })
  })

  const rootIds = document.shapes
    .filter((shape) => {
      const parentId = shape.parentId ?? null
      return parentId === null || !nodes[parentId]
    })
    .map((shape) => shape.id)

  return {
    rootIds,
    nodes,
  }
}

/**
 * Derives group bounds from normalized children traversal and patches legacy group geometry in place.
 */
export function deriveGroupBoundsFromNormalizedRuntime(document: NormalizedRuntimeDocument): string[] {
  const changedIds = new Set<string>()
  const cachedBounds = new Map<string, NormalizedBounds | null>()
  const visiting = new Set<string>()

  /**
   * Visits one node and returns normalized world-aligned bounds for union propagation.
   */
  function visit(nodeId: string): NormalizedBounds | null {
    if (cachedBounds.has(nodeId)) {
      return cachedBounds.get(nodeId) ?? null
    }

    if (visiting.has(nodeId)) {
      const fallbackBounds = getNodeBounds(document.nodes[nodeId].shape)
      cachedBounds.set(nodeId, fallbackBounds)
      return fallbackBounds
    }

    const node = document.nodes[nodeId]
    if (!node) {
      cachedBounds.set(nodeId, null)
      return null
    }

    visiting.add(nodeId)
    let nextBounds: NormalizedBounds | null = null

    if (node.type === 'group') {
      // Use a sequential loop so bounds union remains deterministic and type narrowing stays stable.
      for (const childId of node.children) {
        const childBounds = visit(childId)
        if (!childBounds) {
          continue
        }

        nextBounds = nextBounds
          ? {
              minX: Math.min(nextBounds.minX, childBounds.minX),
              minY: Math.min(nextBounds.minY, childBounds.minY),
              maxX: Math.max(nextBounds.maxX, childBounds.maxX),
              maxY: Math.max(nextBounds.maxY, childBounds.maxY),
            }
          : childBounds
      }

      if (nextBounds) {
        const mergedBounds = nextBounds
        const width = mergedBounds.maxX - mergedBounds.minX
        const height = mergedBounds.maxY - mergedBounds.minY
        const epsilon = 0.0001

        if (
          Math.abs(node.shape.x - mergedBounds.minX) > epsilon
          || Math.abs(node.shape.y - mergedBounds.minY) > epsilon
          || Math.abs(node.shape.width - width) > epsilon
          || Math.abs(node.shape.height - height) > epsilon
        ) {
          node.shape.x = mergedBounds.minX
          node.shape.y = mergedBounds.minY
          node.shape.width = width
          node.shape.height = height
          changedIds.add(node.id)
        }
      }
    }

    const resolvedBounds = nextBounds ?? getNodeBounds(node.shape)
    visiting.delete(nodeId)
    cachedBounds.set(nodeId, resolvedBounds)
    return resolvedBounds
  }

  Object.values(document.nodes).forEach((node) => {
    if (node.type === 'group') {
      visit(node.id)
    }
  })

  return Array.from(changedIds)
}

/**
 * Defines normalized min/max bounds payload used during recursive bound propagation.
 */
interface NormalizedBounds {
  /** Stores left-most x coordinate. */
  minX: number
  /** Stores top-most y coordinate. */
  minY: number
  /** Stores right-most x coordinate. */
  maxX: number
  /** Stores bottom-most y coordinate. */
  maxY: number
}

/**
 * Converts one legacy node box into normalized min/max bounds.
 */
function getNodeBounds(shape: DocumentNode): NormalizedBounds {
  const bounds = getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height)

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
  }
}

/**
 * Applies one shape-parent structural update and keeps parent group child lists synchronized.
 */
export function applyNormalizedShapeParentChange(input: {
  document: EditorDocument
  shapeId: string
  nextParentId?: string | null
}) {
  const normalized = createNormalizedRuntimeDocument(input.document)
  const shapeNode = normalized.nodes[input.shapeId]
  if (!shapeNode) {
    return false
  }

  const previousParentId = shapeNode.parentId
  const resolvedNextParentId = input.nextParentId ?? null

  if (previousParentId === resolvedNextParentId) {
    return false
  }

  // Remove the node from previous parent child order when previous parent exists.
  if (previousParentId) {
    const previousParent = normalized.nodes[previousParentId]
    if (previousParent?.type === 'group') {
      previousParent.shape.childIds = previousParent.children.filter((childId) => childId !== shapeNode.id)
    }
  }

  // Append node to next parent child order when next parent exists and does not already reference the child.
  if (resolvedNextParentId) {
    const nextParent = normalized.nodes[resolvedNextParentId]
    if (nextParent?.type === 'group') {
      // Normalize parent childIds and append the moved node when it is not already present.
      nextParent.shape.childIds = nextParent.children.includes(shapeNode.id)
        ? nextParent.children.slice()
        : [...nextParent.children, shapeNode.id]
    }
  }

  shapeNode.shape.parentId = resolvedNextParentId
  return true
}

/**
 * Applies one group-children structural update and aligns child parent pointers to the group.
 */
export function applyNormalizedGroupChildrenChange(input: {
  document: EditorDocument
  groupId: string
  nextChildIds?: string[]
}) {
  const normalized = createNormalizedRuntimeDocument(input.document)
  const groupNode = normalized.nodes[input.groupId]
  if (!groupNode || groupNode.type !== 'group') {
    return false
  }

  const nextChildIds = (input.nextChildIds ?? []).filter((childId) => !!normalized.nodes[childId])
  if (areStringArraysEqual(groupNode.children, nextChildIds)) {
    return false
  }

  const nextChildSet = new Set(nextChildIds)

  // Remove parent pointer from children no longer owned by the group.
  groupNode.children.forEach((childId) => {
    if (nextChildSet.has(childId)) {
      return
    }

    const childNode = normalized.nodes[childId]
    if (childNode && childNode.shape.parentId === groupNode.id) {
      childNode.shape.parentId = null
    }
  })

  // Re-parent next children to the group and remove them from any other group child lists.
  nextChildIds.forEach((childId) => {
    const childNode = normalized.nodes[childId]
    if (!childNode) {
      return
    }

    const previousParentId = childNode.parentId
    if (previousParentId && previousParentId !== groupNode.id) {
      const previousParent = normalized.nodes[previousParentId]
      if (previousParent?.type === 'group') {
        previousParent.shape.childIds = previousParent.children.filter((candidateId) => candidateId !== childId)
      }
    }

    childNode.shape.parentId = groupNode.id
  })

  groupNode.shape.childIds = nextChildIds
  return true
}

/**
 * Compares two string arrays with strict order equality.
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
 * Inserts one shape into the document and reconciles parent/children ownership.
 */
export function applyNormalizedInsertShape(input: {
  document: EditorDocument
  index: number
  shape: DocumentNode
}) {
  const boundedIndex = Math.max(0, Math.min(input.index, input.document.shapes.length))
  input.document.shapes.splice(boundedIndex, 0, input.shape)

  const normalized = createNormalizedRuntimeDocument(input.document)
  const insertedNode = normalized.nodes[input.shape.id]
  if (!insertedNode) {
    return boundedIndex
  }

  if (insertedNode.parentId) {
    const parentNode = normalized.nodes[insertedNode.parentId]
    if (parentNode?.type === 'group') {
      // Normalize parent childIds to resolved normalized order, including the inserted node.
      parentNode.shape.childIds = parentNode.children.slice()
    }
  }

  if (insertedNode.type === 'group') {
    insertedNode.shape.childIds = insertedNode.shape.childIds?.slice() ?? []
    insertedNode.children.forEach((childId) => {
      const childNode = normalized.nodes[childId]
      if (childNode) {
        childNode.shape.parentId = insertedNode.id
      }
    })
  }

  return boundedIndex
}

/**
 * Removes one shape from the document and reconciles parent/children ownership.
 */
export function applyNormalizedRemoveShape(input: {
  document: EditorDocument
  index: number
  shapeId: string
}) {
  const fallbackIndex = input.document.shapes.findIndex((shape) => shape.id === input.shapeId)
  const resolvedIndex = input.document.shapes[input.index]?.id === input.shapeId ? input.index : fallbackIndex
  if (resolvedIndex < 0) {
    return null
  }

  const [removedShape] = input.document.shapes.splice(resolvedIndex, 1)
  if (!removedShape) {
    return null
  }

  const normalized = createNormalizedRuntimeDocument(input.document)

  // Normalize group child arrays to resolved node membership so stale ids are dropped.
  Object.values(normalized.nodes).forEach((node) => {
    if (node.type === 'group') {
      node.shape.childIds = node.children.slice()
    }
  })

  // Remove stale references from all groups to avoid dangling child ids.
  Object.values(normalized.nodes).forEach((node) => {
    if (node.type !== 'group' || !node.children.includes(removedShape.id)) {
      return
    }

    node.shape.childIds = node.children.filter((childId) => childId !== removedShape.id)
  })

  if (removedShape.type === 'group') {
    const removedChildIds = removedShape.childIds?.slice() ?? []
    const fallbackParentId = removedShape.parentId ?? null

    removedChildIds.forEach((childId) => {
      const childNode = normalized.nodes[childId]
      if (!childNode) {
        return
      }

      // Promote orphaned children to the removed group's parent to keep graph connectivity valid.
      childNode.shape.parentId = fallbackParentId
    })

    if (fallbackParentId) {
      const parentNode = normalized.nodes[fallbackParentId]
      if (parentNode?.type === 'group') {
        const preservedChildren = parentNode.children.filter((childId) => childId !== removedShape.id)
        const insertedChildren = removedChildIds.filter((childId) => !!normalized.nodes[childId])
        parentNode.shape.childIds = [...preservedChildren, ...insertedChildren]
      }
    }
  }

  return {
    removedIndex: resolvedIndex,
    removedShape,
  }
}

/**
 * Reconciles legacy parent/child storage so normalized group ownership stays canonical.
 */
export function reconcileNormalizedStructuralStorage(input: {
  document: EditorDocument
}) {
  const initialNormalized = createNormalizedRuntimeDocument(input.document)
  const canonicalParentByChildId = new Map<string, string>()
  let changed = false

  // Prefer explicit group child ownership when resolving parent pointers.
  Object.values(initialNormalized.nodes).forEach((node) => {
    if (node.type !== 'group') {
      return
    }

    node.children.forEach((childId) => {
      // Keep first owner when malformed documents reference one child in multiple groups.
      if (!canonicalParentByChildId.has(childId)) {
        canonicalParentByChildId.set(childId, node.id)
      }
    })
  })

  input.document.shapes.forEach((shape) => {
    const nextParentId = canonicalParentByChildId.get(shape.id) ?? (shape.parentId ?? null)
    if ((shape.parentId ?? null) !== nextParentId) {
      shape.parentId = nextParentId
      changed = true
    }
  })

  const finalNormalized = createNormalizedRuntimeDocument(input.document)
  Object.values(finalNormalized.nodes).forEach((node) => {
    if (node.type !== 'group') {
      return
    }

    const previousChildIds = node.shape.childIds ?? []
    // Enforce one canonical group owner per child id so malformed multi-parent links are collapsed deterministically.
    const nextChildIds = resolveCanonicalGroupChildIds(node.children, node.id, canonicalParentByChildId)
    if (!areStringArraysEqual(previousChildIds, nextChildIds)) {
      node.shape.childIds = nextChildIds
      changed = true
    }
  })

  return {changed}
}

/**
 * Resolves one group child-id list to unique entries that are canonically owned by the current group.
 */
function resolveCanonicalGroupChildIds(
  childIds: string[],
  groupId: string,
  canonicalParentByChildId: Map<string, string>,
): string[] {
  const seenChildIds = new Set<string>()
  const nextChildIds: string[] = []

  childIds.forEach((childId) => {
    if (canonicalParentByChildId.get(childId) !== groupId || seenChildIds.has(childId)) {
      return
    }

    seenChildIds.add(childId)
    nextChildIds.push(childId)
  })

  return nextChildIds
}

