import type {EngineNodeId, EngineRenderableNode, EngineSceneSnapshot} from '../types/types.ts'

const ENGINE_NODE_KIND_UNKNOWN = 0
const ENGINE_NODE_KIND_TEXT = 1
const ENGINE_NODE_KIND_IMAGE = 2
const ENGINE_NODE_KIND_GROUP = 3
const ENGINE_NODE_KIND_SHAPE = 4
const ENGINE_SCENE_BUFFER_MIN_CAPACITY = 16
const BOUNDS_STRIDE = 4
const TRANSFORM_STRIDE = 6
const BOUNDS_WIDTH_OFFSET = 2
const BOUNDS_HEIGHT_OFFSET = 3
const TRANSFORM_M2_OFFSET = 2
const TRANSFORM_M3_OFFSET = 3
const TRANSFORM_M4_OFFSET = 4
const TRANSFORM_M5_OFFSET = 5
const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2
const CAPACITY_GROWTH_FACTOR = 2
const TEXT_WIDTH_ESTIMATE_MULTIPLIER = 0.6

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

/**
 * Handles createEngineSceneBufferLayout.
 * @param scene Scene snapshot.
 */
export function createEngineSceneBufferLayout(
  scene: Pick<EngineSceneSnapshot, 'nodes'>,
): EngineSceneBufferLayout {
  const flattened = flattenSceneNodes(scene.nodes)
  const capacity = Math.max(ENGINE_SCENE_BUFFER_MIN_CAPACITY, flattened.length || 1)
  const layout = allocateEngineSceneBufferLayout(capacity)
  writeSceneToBufferLayout(layout, scene.nodes)
  return layout
}

/**
 * Handles syncEngineSceneBufferLayout.
 * @param layout layout parameter.
 * @param scene Scene snapshot.
 * @param options Options object for this operation.
 */
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

/**
 * Handles writeSceneToBufferLayout.
 * @param layout layout parameter.
 * @param nodes nodes parameter.
 */
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
    layout.bounds.fill(0, index * BOUNDS_STRIDE, index * BOUNDS_STRIDE + BOUNDS_STRIDE)
    layout.transform.fill(0, index * TRANSFORM_STRIDE, index * TRANSFORM_STRIDE + TRANSFORM_STRIDE)
  }
}

/**
 * Handles allocateEngineSceneBufferLayout.
 * @param capacity capacity parameter.
 */
function allocateEngineSceneBufferLayout(capacity: number): EngineSceneBufferLayout {
  return {
    capacity,
    count: 0,
    nodeIds: new Array<string | null>(capacity).fill(null),
    slotByNodeId: new Map(),
    kindCodes: new Uint8Array(capacity),
    parentIndices: new Int32Array(capacity),
    dirtyFlags: new Uint32Array(capacity),
    bounds: new Float32Array(capacity * BOUNDS_STRIDE),
    transform: new Float32Array(capacity * TRANSFORM_STRIDE),
    order: new Uint32Array(capacity),
  }
}

/**
 * Handles writeLayoutSlot.
 * @param layout layout parameter.
 * @param slot slot parameter.
 * @param node Target node.
 * @param parentIndex parentIndex parameter.
 */
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

  const boundsOffset = slot * BOUNDS_STRIDE
  switch (node.type) {
    case 'text':
      layout.bounds[boundsOffset] = node.x
      layout.bounds[boundsOffset + 1] = node.y
      layout.bounds[boundsOffset + BOUNDS_WIDTH_OFFSET] = node.width ?? estimateTextWidth(node)
      layout.bounds[boundsOffset + BOUNDS_HEIGHT_OFFSET] = node.height ?? (node.style.lineHeight ?? node.style.fontSize * TEXT_LINE_HEIGHT_MULTIPLIER)
      break
    case 'image':
      layout.bounds[boundsOffset] = node.x
      layout.bounds[boundsOffset + 1] = node.y
      layout.bounds[boundsOffset + BOUNDS_WIDTH_OFFSET] = node.width
      layout.bounds[boundsOffset + BOUNDS_HEIGHT_OFFSET] = node.height
      break
    case 'group':
      layout.bounds[boundsOffset] = 0
      layout.bounds[boundsOffset + 1] = 0
      layout.bounds[boundsOffset + BOUNDS_WIDTH_OFFSET] = 0
      layout.bounds[boundsOffset + BOUNDS_HEIGHT_OFFSET] = 0
      break
    case 'shape':
      layout.bounds[boundsOffset] = node.x
      layout.bounds[boundsOffset + 1] = node.y
        layout.bounds[boundsOffset + BOUNDS_WIDTH_OFFSET] = node.width
        layout.bounds[boundsOffset + BOUNDS_HEIGHT_OFFSET] = node.height
      break
  }

      const transformOffset = slot * TRANSFORM_STRIDE
  const matrix = node.transform?.matrix ?? [1, 0, 0, 0, 1, 0]
      const [m0, m1, m2, m3, m4, m5] = matrix
      layout.transform[transformOffset] = m0
      layout.transform[transformOffset + 1] = m1
      layout.transform[transformOffset + TRANSFORM_M2_OFFSET] = m2
      layout.transform[transformOffset + TRANSFORM_M3_OFFSET] = m3
      layout.transform[transformOffset + TRANSFORM_M4_OFFSET] = m4
      layout.transform[transformOffset + TRANSFORM_M5_OFFSET] = m5
}

/**
 * Handles ensureEngineSceneBufferCapacity.
 * @param layout layout parameter.
 * @param required required parameter.
 */
function ensureEngineSceneBufferCapacity(
  layout: EngineSceneBufferLayout,
  required: number,
) {
  if (required <= layout.capacity) {
    return
  }

  const nextCapacity = Math.max(layout.capacity * CAPACITY_GROWTH_FACTOR, required)
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

/**
 * Handles flattenSceneNodes.
 * @param nodes nodes parameter.
 * @param parentIndex parentIndex parameter.
 * @param flattened flattened parameter.
 */
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

/**
 * Handles encodeNodeKind.
 * @param node Target node.
 */
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

/**
 * Handles estimateTextWidth.
 * @param node Target node.
 */
function estimateTextWidth(node: Extract<EngineRenderableNode, {type: 'text'}>) {
  if (node.runs && node.runs.length > 0) {
    let width = 0
    node.runs.forEach((run) => {
      width += run.text.length * (run.style?.fontSize ?? node.style.fontSize) * TEXT_WIDTH_ESTIMATE_MULTIPLIER
    })
    return width
  }

  return (node.text ?? '').length * node.style.fontSize * TEXT_WIDTH_ESTIMATE_MULTIPLIER
}
