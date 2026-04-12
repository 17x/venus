import type {EngineNodeId, EngineRenderableNode, EngineSceneSnapshot} from './types.ts'

const ENGINE_NODE_KIND_UNKNOWN = 0
const ENGINE_NODE_KIND_TEXT = 1
const ENGINE_NODE_KIND_IMAGE = 2
const ENGINE_NODE_KIND_GROUP = 3
const ENGINE_NODE_KIND_SHAPE = 4

export interface EngineSceneBufferLayout {
  capacity: number
  count: number
  nodeIds: Array<string | null>
  slotByNodeId: Map<EngineNodeId, number>
  kindCodes: Uint8Array
  parentIndices: Int32Array
  dirtyFlags: Uint32Array
  bounds: Float32Array
  transform: Float32Array
  order: Uint32Array
}

export function createEngineSceneBufferLayout(
  scene: Pick<EngineSceneSnapshot, 'nodes'>,
): EngineSceneBufferLayout {
  const flattened = flattenSceneNodes(scene.nodes)
  const capacity = Math.max(16, flattened.length || 1)
  const layout = allocateEngineSceneBufferLayout(capacity)
  writeSceneToBufferLayout(layout, scene.nodes)
  return layout
}

export function syncEngineSceneBufferLayout(
  layout: EngineSceneBufferLayout,
  scene: Pick<EngineSceneSnapshot, 'nodes'>,
  options: {
    dirtyNodeIds?: readonly EngineNodeId[]
    removedNodeIds?: readonly EngineNodeId[]
    structureDirty?: boolean
  } = {},
) {
  const dirtyNodeIds = options.dirtyNodeIds ?? []
  const removedNodeIds = options.removedNodeIds ?? []
  const canPatchInPlace =
    !options.structureDirty &&
    removedNodeIds.length === 0 &&
    dirtyNodeIds.length > 0 &&
    dirtyNodeIds.every((nodeId) => layout.slotByNodeId.has(nodeId))

  if (!canPatchInPlace) {
    writeSceneToBufferLayout(layout, scene.nodes)
    return
  }

  const flattened = flattenSceneNodes(scene.nodes)
  const flattenedMap = new Map(flattened.map((entry) => [entry.node.id, entry]))

  dirtyNodeIds.forEach((nodeId) => {
    const slot = layout.slotByNodeId.get(nodeId)
    const entry = flattenedMap.get(nodeId)
    if (slot === undefined || !entry) {
      throw new Error('buffer layout incremental sync lost slot mapping')
    }

    writeLayoutSlot(layout, slot, entry.node, entry.parentIndex)
  })
}

export function writeSceneToBufferLayout(
  layout: EngineSceneBufferLayout,
  nodes: readonly EngineRenderableNode[],
) {
  const flattened = flattenSceneNodes(nodes)
  ensureEngineSceneBufferCapacity(layout, flattened.length)
  layout.count = flattened.length
  layout.slotByNodeId.clear()

  for (let index = 0; index < flattened.length; index += 1) {
    const entry = flattened[index]
    writeLayoutSlot(layout, index, entry.node, entry.parentIndex)
  }

  for (let index = flattened.length; index < layout.capacity; index += 1) {
    const previousNodeId = layout.nodeIds[index]
    if (previousNodeId) {
      layout.slotByNodeId.delete(previousNodeId)
    }
    layout.nodeIds[index] = null
    layout.kindCodes[index] = ENGINE_NODE_KIND_UNKNOWN
    layout.parentIndices[index] = -1
    layout.dirtyFlags[index] = 0
    layout.order[index] = 0
    layout.bounds.fill(0, index * 4, index * 4 + 4)
    layout.transform.fill(0, index * 6, index * 6 + 6)
  }
}

function allocateEngineSceneBufferLayout(capacity: number): EngineSceneBufferLayout {
  return {
    capacity,
    count: 0,
    nodeIds: new Array<string | null>(capacity).fill(null),
    slotByNodeId: new Map(),
    kindCodes: new Uint8Array(capacity),
    parentIndices: new Int32Array(capacity),
    dirtyFlags: new Uint32Array(capacity),
    bounds: new Float32Array(capacity * 4),
    transform: new Float32Array(capacity * 6),
    order: new Uint32Array(capacity),
  }
}

function writeLayoutSlot(
  layout: EngineSceneBufferLayout,
  slot: number,
  node: EngineRenderableNode,
  parentIndex: number,
) {
  layout.nodeIds[slot] = node.id
  layout.slotByNodeId.set(node.id, slot)
  layout.kindCodes[slot] = encodeNodeKind(node)
  layout.parentIndices[slot] = parentIndex
  layout.order[slot] = slot
  layout.dirtyFlags[slot] = 1

  const boundsOffset = slot * 4
  switch (node.type) {
    case 'text':
      layout.bounds[boundsOffset] = node.x
      layout.bounds[boundsOffset + 1] = node.y
      layout.bounds[boundsOffset + 2] = node.width ?? estimateTextWidth(node)
      layout.bounds[boundsOffset + 3] = node.height ?? (node.style.lineHeight ?? node.style.fontSize * 1.2)
      break
    case 'image':
      layout.bounds[boundsOffset] = node.x
      layout.bounds[boundsOffset + 1] = node.y
      layout.bounds[boundsOffset + 2] = node.width
      layout.bounds[boundsOffset + 3] = node.height
      break
    case 'group':
      layout.bounds[boundsOffset] = 0
      layout.bounds[boundsOffset + 1] = 0
      layout.bounds[boundsOffset + 2] = 0
      layout.bounds[boundsOffset + 3] = 0
      break
    case 'shape':
      layout.bounds[boundsOffset] = node.x
      layout.bounds[boundsOffset + 1] = node.y
      layout.bounds[boundsOffset + 2] = node.width
      layout.bounds[boundsOffset + 3] = node.height
      break
  }

  const transformOffset = slot * 6
  const matrix = node.transform?.matrix ?? [1, 0, 0, 0, 1, 0]
  layout.transform[transformOffset] = matrix[0]
  layout.transform[transformOffset + 1] = matrix[1]
  layout.transform[transformOffset + 2] = matrix[2]
  layout.transform[transformOffset + 3] = matrix[3]
  layout.transform[transformOffset + 4] = matrix[4]
  layout.transform[transformOffset + 5] = matrix[5]
}

function ensureEngineSceneBufferCapacity(
  layout: EngineSceneBufferLayout,
  required: number,
) {
  if (required <= layout.capacity) {
    return
  }

  const nextCapacity = Math.max(layout.capacity * 2, required)
  const nextLayout = allocateEngineSceneBufferLayout(nextCapacity)
  nextLayout.count = layout.count
  nextLayout.nodeIds.splice(0, layout.nodeIds.length, ...layout.nodeIds)
  nextLayout.kindCodes.set(layout.kindCodes)
  nextLayout.parentIndices.set(layout.parentIndices)
  nextLayout.dirtyFlags.set(layout.dirtyFlags)
  nextLayout.bounds.set(layout.bounds)
  nextLayout.transform.set(layout.transform)
  nextLayout.order.set(layout.order)

  layout.capacity = nextLayout.capacity
  layout.nodeIds = nextLayout.nodeIds
  layout.kindCodes = nextLayout.kindCodes
  layout.parentIndices = nextLayout.parentIndices
  layout.dirtyFlags = nextLayout.dirtyFlags
  layout.bounds = nextLayout.bounds
  layout.transform = nextLayout.transform
  layout.order = nextLayout.order
}

function flattenSceneNodes(
  nodes: readonly EngineRenderableNode[],
  parentIndex = -1,
  flattened: Array<{node: EngineRenderableNode; parentIndex: number}> = [],
) {
  nodes.forEach((node) => {
    const nodeIndex = flattened.push({node, parentIndex}) - 1
    if (node.type === 'group') {
      flattenSceneNodes(node.children, nodeIndex, flattened)
    }
  })

  return flattened
}

function encodeNodeKind(node: EngineRenderableNode) {
  switch (node.type) {
    case 'text':
      return ENGINE_NODE_KIND_TEXT
    case 'image':
      return ENGINE_NODE_KIND_IMAGE
    case 'group':
      return ENGINE_NODE_KIND_GROUP
    case 'shape':
      return ENGINE_NODE_KIND_SHAPE
    default:
      return ENGINE_NODE_KIND_UNKNOWN
  }
}

function estimateTextWidth(node: Extract<EngineRenderableNode, {type: 'text'}>) {
  if (node.runs && node.runs.length > 0) {
    let width = 0
    node.runs.forEach((run) => {
      width += run.text.length * (run.style?.fontSize ?? node.style.fontSize) * 0.6
    })
    return width
  }

  return (node.text ?? '').length * node.style.fontSize * 0.6
}
