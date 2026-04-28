import type { EngineNodeId, EngineRect, EngineSceneSnapshot } from './types/types.ts'

const sceneNodeCountCache = new WeakMap<EngineSceneSnapshot, number>()
const VIEWPORT_PADDING_DOUBLE = 2

export interface EngineFramePlan {
  revision: string | number
  planVersion: number
  sceneNodeCount: number
  candidateNodeIds: readonly EngineNodeId[]
  candidateCount: number
  viewportBounds: EngineRect
  queryPadding: number
}

export interface PrepareEngineFramePlanOptions {
  scene: EngineSceneSnapshot
  viewport: EngineFramePlanViewport
  queryCandidates: (bounds: EngineRect) => EngineNodeId[]
  padding?: number
}

/**
 * Minimal viewport payload required by frame-plan query math.
 */
interface EngineFramePlanViewport {
  /** Viewport width in CSS pixels. */
  viewportWidth: number
  /** Viewport height in CSS pixels. */
  viewportHeight: number
  /** Camera X translation in screen-space pixels. */
  offsetX: number
  /** Camera Y translation in screen-space pixels. */
  offsetY: number
  /** Camera zoom scale factor. */
  scale: number
}

// Build a planner-facing frame summary from the coarse spatial query surface
// without changing renderer execution. This gives diagnostics and future
// planners a stable place to start.
/**
 * Handles prepareEngineFramePlan.
 * @param options Options object for this operation.
 */
export function prepareEngineFramePlan(
  options: PrepareEngineFramePlanOptions,
): EngineFramePlan {
  const queryPadding = Math.max(0, options.padding ?? 0)
  const viewportBounds = resolveViewportWorldBounds(options.viewport, queryPadding)
  const candidateNodeIds = options.queryCandidates(viewportBounds)

  return {
    revision: options.scene.revision,
    planVersion: options.scene.metadata?.planVersion ?? 0,
    sceneNodeCount: resolveSceneNodeCount(options.scene),
    candidateNodeIds,
    candidateCount: candidateNodeIds.length,
    viewportBounds,
    queryPadding,
  }
}

/**
 * Handles resolveSceneNodeCount.
 * @param scene Scene snapshot.
 */
function resolveSceneNodeCount(scene: EngineSceneSnapshot) {
  const cached = sceneNodeCountCache.get(scene)
  if (typeof cached === 'number') {
    return cached
  }

  const count = countSceneNodes(scene.nodes)
  sceneNodeCountCache.set(scene, count)
  return count
}

// Keep the current frame plan intentionally coarse so future render and
// hit-test planners can share the same viewport query contract.
/**
 * Handles resolveViewportWorldBounds.
 * @param viewport Viewport state.
 * @param padding padding parameter.
 */
function resolveViewportWorldBounds(
  viewport: EngineFramePlanViewport,
  padding: number,
): EngineRect {
  return {
    x: -viewport.offsetX / viewport.scale - padding,
    y: -viewport.offsetY / viewport.scale - padding,
    width: viewport.viewportWidth / viewport.scale + padding * VIEWPORT_PADDING_DOUBLE,
    height: viewport.viewportHeight / viewport.scale + padding * VIEWPORT_PADDING_DOUBLE,
  }
}

// Count flattened scene nodes so diagnostics can compare candidate pressure
// against total scene complexity without depending on store internals.
/**
 * Handles countSceneNodes.
 * @param nodes nodes parameter.
 */
function countSceneNodes(nodes: readonly EngineSceneSnapshot['nodes'][number][]): number {
  let count = 0

  for (const node of nodes) {
    count += 1
    if (node.type === 'group') {
      count += countSceneNodes(node.children)
    }
  }

  return count
}