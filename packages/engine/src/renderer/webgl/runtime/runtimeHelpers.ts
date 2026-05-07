/**
 * Renderer/WebGL runtime helper module.
 * Owns frame-time helper predicates for packet skipping and texture cleanup.
 * Does not own backend orchestration or capability state machines.
 */
import type { EngineRenderFrame } from '../../types/index.ts'
import type { EngineTileCache, TileZoomLevel } from '../../tileManager/index.ts'
import { resolveEngineVisibilityProfile } from '../../../interaction/visibilityLod.ts'
import type { CachedTextureEntry } from './textures.ts'
import { createEngineWebGLResourceBudgetTracker } from './resources.ts'

const OVERVIEW_IMAGE_SKIP_MAX_SCALE = 0.02
const OVERVIEW_IMAGE_SKIP_MAX_SCREEN_EDGE_PX = 2.8
// Visibility-tier thresholds replace scale-bucket packet skipping for interaction frames.
const INTERACTION_PACKET_SKIP_TIER_D_MIN_EDGE_PX = 3.2
const INTERACTION_PACKET_SKIP_TIER_C_MIN_EDGE_PX = 2.2
const INTERACTION_PACKET_SKIP_TIER_B_MIN_EDGE_PX = 1.2
const INTERACTION_PACKET_SKIP_SHAPE_MIN_AREA_PX2 = 6
const INTERACTION_PACKET_SKIP_BOOST = 0.1
const INTERACTION_PACKET_SKIP_TEXT_SEMANTIC_BOOST = 0.08
const INTERACTION_PACKET_SKIP_IMAGE_SEMANTIC_BOOST = 0.04

/**
 * Stores shared WebGL resource budget tracker type used by cleanup helpers.
 */
export type WebGLResourceBudgetTracker = ReturnType<typeof createEngineWebGLResourceBudgetTracker>

/**
 * Returns whether tile compositor should be bypassed for the current frame.
  * @param frame Current render frame.
 * @param tileCache Tile cache instance.
 * @param visibleTileLimit visibleTileLimit parameter.
 * @param zoomLevel zoomLevel parameter.
*/
export function shouldBypassTileCompositorForFrame(
  frame: EngineRenderFrame,
  tileCache: EngineTileCache,
  visibleTileLimit: number,
  zoomLevel: TileZoomLevel,
) {
  // Skip tile composition when the current zoom level would require more
  // visible tiles than the cache can hold with any stability.
  const safeScale = Math.max(Number.EPSILON, Math.abs(frame.viewport.scale))
  const visibleTiles = tileCache.getVisibleTiles({
    x: -frame.viewport.offsetX / safeScale,
    y: -frame.viewport.offsetY / safeScale,
    width: frame.viewport.viewportWidth / safeScale,
    height: frame.viewport.viewportHeight / safeScale,
  }, zoomLevel)

  return visibleTiles.length > visibleTileLimit
}

/**
 * Returns whether overview zoom should skip tiny image packets.
  * @param frame Current render frame.
 * @param worldBounds worldBounds parameter.
 * @param lodEnabled lodEnabled parameter.
*/
export function shouldSkipOverviewImagePacket(
  frame: EngineRenderFrame,
  worldBounds: { width: number; height: number },
  lodEnabled: boolean,
) {
  if (!lodEnabled) {
    return false
  }

  const scale = Math.max(0, Math.abs(frame.viewport.scale))
  if (scale > OVERVIEW_IMAGE_SKIP_MAX_SCALE) {
    return false
  }

  const screenWidth = Math.abs(worldBounds.width) * scale
  const screenHeight = Math.abs(worldBounds.height) * scale
  return (
    screenWidth <= OVERVIEW_IMAGE_SKIP_MAX_SCREEN_EDGE_PX &&
    screenHeight <= OVERVIEW_IMAGE_SKIP_MAX_SCREEN_EDGE_PX
  )
}

/**
 * Returns whether interaction mode should skip an imperceptible packet.
  * @param frame Current render frame.
 * @param packetKind packetKind parameter.
 * @param worldBounds worldBounds parameter.
*/
export function shouldSkipInteractiveTinyPacket(
  frame: EngineRenderFrame,
  packetKind: 'shape' | 'text' | 'image',
  worldBounds: { width: number; height: number },
) {
  const scale = Math.max(0, Math.abs(frame.viewport.scale))
  const screenWidth = Math.abs(worldBounds.width) * scale
  const screenHeight = Math.abs(worldBounds.height) * scale
  const minEdge = Math.min(screenWidth, screenHeight)
  const screenArea = screenWidth * screenHeight
  // Visibility score is computed from current screen contribution plus semantic weight.
  const visibility = resolveEngineVisibilityProfile({
    screenAreaPx2: screenArea,
    screenMinEdgePx: minEdge,
    viewportAreaPx2: Math.max(1, frame.viewport.viewportWidth * frame.viewport.viewportHeight),
    interactionBoost: INTERACTION_PACKET_SKIP_BOOST,
    semanticBoost: packetKind === 'text'
      ? INTERACTION_PACKET_SKIP_TEXT_SEMANTIC_BOOST
      : packetKind === 'image'
        ? INTERACTION_PACKET_SKIP_IMAGE_SEMANTIC_BOOST
        : 0,
  })

  // Keep a tiny-shape hard floor so ultra-dense shape packets cannot starve interaction frames.
  if (packetKind === 'shape' && visibility.tier !== 'tier-a' && screenArea <= INTERACTION_PACKET_SKIP_SHAPE_MIN_AREA_PX2) {
    return true
  }

  // Tier B keeps conservative culling and applies a packet budget cap.
  if (visibility.tier === 'tier-b') {
    return minEdge <= INTERACTION_PACKET_SKIP_TIER_B_MIN_EDGE_PX
  }

  // Tier C keeps medium objects but drops tiny packets that are visually imperceptible.
  if (visibility.tier === 'tier-c') {
    return minEdge <= INTERACTION_PACKET_SKIP_TIER_C_MIN_EDGE_PX
  }

  // Tier D receives the strongest culling because visibility contribution is negligible.
  if (visibility.tier === 'tier-d') {
    return minEdge <= INTERACTION_PACKET_SKIP_TIER_D_MIN_EDGE_PX
  }

  // Tier A stays full-fidelity to preserve perceived foreground quality.
  return false
}

/**
 * Disposes all textures in a cache map and releases budget ownership.
  * @param context Rendering context.
 * @param cache Cache instance.
 * @param budget budget parameter.
*/
export function disposeCachedTextures(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  cache: Map<string, CachedTextureEntry>,
  budget: WebGLResourceBudgetTracker,
) {
  // Keep cache-reset and dispose semantics aligned so GPU texture ownership is
  // released consistently.
  for (const [cacheKey, entry] of cache.entries()) {
    context.deleteTexture(entry.texture)
    budget.releaseTexture(cacheKey)
  }

  cache.clear()
}

/**
 * Disposes textures evicted by the resource budget tracker.
  * @param context Rendering context.
 * @param imageCache imageCache parameter.
 * @param textCache textCache parameter.
 * @param textureIds textureIds parameter.
*/
export function disposeEvictedTextures(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  imageCache: Map<string, CachedTextureEntry>,
  textCache: Map<string, CachedTextureEntry>,
  textureIds: readonly string[],
) {
  // Keep budget-driven eviction tied to actual GPU/cache disposal so resource
  // pressure decisions reflect real residency instead of bookkeeping only.
  for (const textureId of textureIds) {
    const cachedImage = imageCache.get(textureId)
    if (cachedImage) {
      context.deleteTexture(cachedImage.texture)
      imageCache.delete(textureId)
      continue
    }

    const cachedText = textCache.get(textureId)
    if (cachedText) {
      context.deleteTexture(cachedText.texture)
      textCache.delete(textureId)
    }
  }
}

/**
 * Prunes text texture cache entries that are not present in current packet plan.
  * @param context Rendering context.
 * @param cache Cache instance.
 * @param packets packets parameter.
 * @param budget budget parameter.
*/
export function pruneTextCache(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  cache: Map<string, CachedTextureEntry>,
  packets: ReadonlyArray<{ kind: string; nodeId: string }>,
  budget: WebGLResourceBudgetTracker,
) {
  // Drop GPU textures for text nodes that are no longer part of the current
  // packet plan so node-local caching does not retain removed text forever.
  const activeTextNodeIds = new Set(
    packets
      .filter((packet) => packet.kind === 'text')
      .map((packet) => packet.nodeId),
  )

  for (const [nodeId, entry] of cache.entries()) {
    if (activeTextNodeIds.has(nodeId)) {
      continue
    }

    context.deleteTexture(entry.texture)
    cache.delete(nodeId)
    budget.releaseTexture(nodeId)
  }
}
