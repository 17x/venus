import type {
  EngineRenderFrame,
} from '../types/index.ts'
import type {
  EngineRect,
} from '../../scene/types/types.ts'
import type {
  EnginePreparedNode,
} from './plan.ts'

const GROUP_LOD_THUMBNAIL_MAX_SCREEN_AREA_PX2 = 4096

/**
 * Builds aggregate world bounds for each group from descendant geometry bounds.
 * @param preparedNodes Prepared node list in traversal order.
 * @param parentIndices Parent index lookup aligned with prepared slots.
 */
export function buildGroupAggregateWorldBounds(
  preparedNodes: readonly EnginePreparedNode[],
  parentIndices: ArrayLike<number>,
) {
  const aggregateBounds: Array<EngineRect | null> = new Array(preparedNodes.length).fill(null)

  for (let slot = preparedNodes.length - 1; slot >= 0; slot -= 1) {
    const prepared = preparedNodes[slot]
    if (!prepared) {
      continue
    }

    const selfBounds = prepared.node.type === 'group'
      ? aggregateBounds[slot]
      : prepared.worldBounds
    if (selfBounds) {
      aggregateBounds[slot] = mergeBounds(aggregateBounds[slot], selfBounds)
      const parentSlot = parentIndices[slot]
      if (parentSlot >= 0) {
        aggregateBounds[parentSlot] = mergeBounds(aggregateBounds[parentSlot], selfBounds)
      }
    }
  }

  return aggregateBounds
}

/**
 * Attaches precomputed group aggregate bounds back to prepared group entries.
 * @param preparedNodes Prepared node list to patch in-place.
 * @param groupAggregateBounds Aggregate bounds per prepared slot.
 */
export function attachGroupAggregateBounds(
  preparedNodes: EnginePreparedNode[],
  groupAggregateBounds: ReadonlyArray<EngineRect | null>,
) {
  for (let slot = 0; slot < preparedNodes.length; slot += 1) {
    const prepared = preparedNodes[slot]
    if (!prepared || prepared.node.type !== 'group') {
      continue
    }

    // Group bounds are derived from descendants and used only for group LOD placeholders.
    prepared.worldBounds = groupAggregateBounds[slot]
  }
}

/**
 * Resolves which group slots should be collapsed into thumbnail placeholders.
 * @param preparedNodes Prepared node list in traversal order.
 * @param groupAggregateBounds Aggregate bounds per prepared slot.
 * @param protectedGroupSlots Group slots excluded from collapse.
 * @param viewportScale Current viewport scale.
 * @param renderQuality Active render quality mode.
 * @param lodEnabled Whether LOD collapse is enabled.
 */
export function resolveCollapsedGroupSlots(
  preparedNodes: readonly EnginePreparedNode[],
  groupAggregateBounds: ReadonlyArray<EngineRect | null>,
  protectedGroupSlots: Set<number>,
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
  lodEnabled: boolean,
) {
  const collapsedGroupSlots = new Set<number>()

  for (let slot = 0; slot < preparedNodes.length; slot += 1) {
    const prepared = preparedNodes[slot]
    if (!prepared || prepared.node.type !== 'group') {
      continue
    }

    if (protectedGroupSlots.has(slot)) {
      continue
    }

    if (shouldCollapseGroupSubtree(groupAggregateBounds[slot], viewportScale, renderQuality, lodEnabled)) {
      collapsedGroupSlots.add(slot)
    }
  }

  return collapsedGroupSlots
}

/**
 * Resolves group slots that must never collapse due to protected node ancestry.
 * @param preparedNodes Prepared node list in traversal order.
 * @param parentIndices Parent index lookup aligned with prepared slots.
 * @param protectedNodeIds Explicit protected node ids from frame context.
 */
export function resolveProtectedCollapseGroupSlots(
  preparedNodes: readonly EnginePreparedNode[],
  parentIndices: ArrayLike<number>,
  protectedNodeIds: readonly string[] | undefined,
) {
  const protectedGroupSlots = new Set<number>()
  if (!protectedNodeIds || protectedNodeIds.length === 0) {
    return protectedGroupSlots
  }

  const protectedNodeIdSet = new Set(protectedNodeIds)

  for (let slot = 0; slot < preparedNodes.length; slot += 1) {
    const prepared = preparedNodes[slot]
    if (!prepared || !protectedNodeIdSet.has(prepared.node.id)) {
      continue
    }

    if (prepared.node.type === 'group') {
      protectedGroupSlots.add(slot)
    }

    let parentSlot = parentIndices[slot]
    while (parentSlot >= 0) {
      const parentPrepared = preparedNodes[parentSlot]
      if (parentPrepared?.node.type === 'group') {
        protectedGroupSlots.add(parentSlot)
      }
      parentSlot = parentIndices[parentSlot]
    }
  }

  return protectedGroupSlots
}

/**
 * Resolves whether slot has any collapsed-group ancestor in parent chain.
 * @param slot Prepared-node slot to test.
 * @param parentIndices Parent index lookup aligned with prepared slots.
 * @param collapsedGroupSlotSet Collapsed group slot set.
 */
export function hasCollapsedGroupAncestor(
  slot: number,
  parentIndices: ArrayLike<number>,
  collapsedGroupSlotSet: Set<number>,
) {
  let parentSlot = parentIndices[slot]
  while (parentSlot >= 0) {
    if (collapsedGroupSlotSet.has(parentSlot)) {
      return true
    }
    parentSlot = parentIndices[parentSlot]
  }
  return false
}

/**
 * Resolves whether one group subtree should collapse to thumbnail placeholder.
 * @param groupBounds Aggregate group bounds in world coordinates.
 * @param viewportScale Current viewport scale.
 * @param renderQuality Active render quality mode.
 * @param lodEnabled Whether LOD collapse is enabled.
 */
function shouldCollapseGroupSubtree(
  groupBounds: EngineRect | null,
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
  lodEnabled: boolean,
) {
  if (!lodEnabled) {
    return false
  }

  if (!groupBounds) {
    return false
  }

  const absScale = Math.max(0, Math.abs(viewportScale))
  const screenWidth = Math.abs(groupBounds.width) * absScale
  const screenHeight = Math.abs(groupBounds.height) * absScale
  const screenArea = screenWidth * screenHeight

  if (renderQuality === 'interactive') {
    // Keep interaction collapse aggressive to preserve panning/zooming frame budget.
    return screenArea <= GROUP_LOD_THUMBNAIL_MAX_SCREEN_AREA_PX2
  }

  // Settled frames still collapse low-screen-area groups into thumbnail mode.
  return screenArea <= GROUP_LOD_THUMBNAIL_MAX_SCREEN_AREA_PX2
}

/**
 * Merges two bounds into one axis-aligned union bounds.
 * @param current Current accumulated bounds.
 * @param next Next bounds to merge.
 */
function mergeBounds(current: EngineRect | null, next: EngineRect) {
  if (!current) {
    return {
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height,
    }
  }

  const minX = Math.min(current.x, next.x)
  const minY = Math.min(current.y, next.y)
  const maxX = Math.max(current.x + current.width, next.x + next.width)
  const maxY = Math.max(current.y + current.height, next.y + next.height)
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}