import type {
  EngineRenderFrame,
} from '../types/index.ts'
import type {
  EngineRect,
  EngineRenderableNode,
} from '../../scene/types/types.ts'
import { resolveLeafNodeWorldBounds } from '../../scene/worldBounds/worldBounds.ts'
import type {
  EngineWorldMatrix,
} from './plan.ts'

const TINY_OBJECT_MAX_SCREEN_EDGE_PX = 0.9
const TINY_OBJECT_OVERVIEW_SCREEN_EDGE_PX = 2.4
const TINY_OBJECT_OVERVIEW_MAX_SCALE = 0.05
const TINY_OBJECT_LOW_SCALE_SCREEN_EDGE_PX = 1.4
const TINY_OBJECT_LOW_SCALE_MAX_SCALE = 0.12
const SETTLED_TINY_OBJECT_SCALE_THRESHOLD = 0.35

/**
 * Resolves viewport world bounds from current viewport transform state.
 * @param frame Current render frame.
 */
export function resolveViewportWorldBounds(frame: EngineRenderFrame) {
  // Viewport matrix is world->screen: sx = scale * wx + offsetX.
  // Therefore visible world min is computed from screen origin (0, 0):
  // wx = (0 - offsetX) / scale.
  const safeScale = frame.viewport.scale === 0 ? 1 : frame.viewport.scale
  const minX = -frame.viewport.offsetX / safeScale
  const minY = -frame.viewport.offsetY / safeScale
  const maxX = minX + frame.viewport.viewportWidth / safeScale
  const maxY = minY + frame.viewport.viewportHeight / safeScale
  return {minX, minY, maxX, maxY}
}

/**
 * Resolves whether one prepared node should be culled before draw-list batching.
 * @param nodeId Target node id.
 * @param worldBounds Node world bounds.
 * @param viewportBounds Viewport world bounds.
 * @param framePlanCandidateIdSet Optional frame-plan candidate id set.
 * @param viewportScale Current viewport scale.
 * @param renderQuality Active render quality mode.
 * @param lodEnabled Whether LOD culling logic is enabled.
 */
export function isPreparedNodeCulled(
  nodeId: string,
  worldBounds: EngineRect | null,
  viewportBounds: {minX: number; minY: number; maxX: number; maxY: number},
  framePlanCandidateIdSet: Set<string> | null,
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
  lodEnabled: boolean,
) {
  if (framePlanCandidateIdSet && !framePlanCandidateIdSet.has(nodeId)) {
    return true
  }

  if (isTinyRenderableBounds(worldBounds, viewportScale, renderQuality, lodEnabled)) {
    return true
  }

  return isWorldBoundsCulled(worldBounds, viewportBounds)
}

/**
 * Resolves node world bounds for culling and batching stages.
 * @param node Target node.
 * @param worldMatrix Node world transform matrix.
 */
export function resolveNodeWorldBounds(
  node: EngineRenderableNode,
  worldMatrix: EngineWorldMatrix,
): EngineRect | null {
  switch (node.type) {
    case 'text':
    case 'image':
    case 'shape':
      return resolveLeafNodeWorldBounds(node, worldMatrix)
    case 'group':
      return null
    default:
      return null
  }
}

// Skip extremely tiny objects when zoomed out or in interactive quality.
// This keeps draw-list pressure bounded on dense scenes where sub-pixel nodes
// are not perceptible to users.
/**
 * Resolves whether one renderable bounds should be treated as tiny and culled.
 * @param worldBounds Node world bounds.
 * @param viewportScale Current viewport scale.
 * @param renderQuality Active render quality mode.
 * @param lodEnabled Whether LOD culling logic is enabled.
 */
function isTinyRenderableBounds(
  worldBounds: EngineRect | null,
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
  lodEnabled: boolean,
) {
  if (!lodEnabled) {
    return false
  }

  if (!worldBounds) {
    return false
  }

  if (renderQuality !== 'interactive' && viewportScale > SETTLED_TINY_OBJECT_SCALE_THRESHOLD) {
    return false
  }

  const absScale = Math.max(0, Math.abs(viewportScale))
  const screenWidth = Math.abs(worldBounds.width) * absScale
  const screenHeight = Math.abs(worldBounds.height) * absScale
  const tinyObjectThreshold = resolveTinyObjectScreenEdgeThreshold(
    absScale,
    renderQuality,
  )
  return (
    screenWidth <= tinyObjectThreshold &&
    screenHeight <= tinyObjectThreshold
  )
}

/**
 * Resolves tiny-object screen-edge threshold for current scale/quality mode.
 * @param viewportScale Current viewport scale.
 * @param renderQuality Active render quality mode.
 */
function resolveTinyObjectScreenEdgeThreshold(
  viewportScale: number,
  renderQuality: EngineRenderFrame['context']['quality'],
) {
  if (renderQuality === 'interactive') {
    // Extremely zoomed-out overview passes still push tens of thousands of
    // sub-perceptual nodes through packet rendering unless we raise the tiny
    // cutoff beyond the default sub-pixel threshold.
    if (viewportScale <= TINY_OBJECT_OVERVIEW_MAX_SCALE) {
      return TINY_OBJECT_OVERVIEW_SCREEN_EDGE_PX
    }

    if (viewportScale <= TINY_OBJECT_LOW_SCALE_MAX_SCALE) {
      return TINY_OBJECT_LOW_SCALE_SCREEN_EDGE_PX
    }
  }

  return TINY_OBJECT_MAX_SCREEN_EDGE_PX
}

/**
 * Resolves whether bounds are fully outside viewport world bounds.
 * @param bounds Node world bounds.
 * @param viewportBounds Viewport world bounds.
 */
function isWorldBoundsCulled(
  bounds: EngineRect | null,
  viewportBounds: {minX: number; minY: number; maxX: number; maxY: number},
) {
  if (!bounds) {
    return false
  }

  return (
    bounds.x + bounds.width < viewportBounds.minX ||
    bounds.y + bounds.height < viewportBounds.minY ||
    bounds.x > viewportBounds.maxX ||
    bounds.y > viewportBounds.maxY
  )
}