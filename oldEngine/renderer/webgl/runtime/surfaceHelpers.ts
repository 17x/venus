/**
 * Renderer/WebGL surface helper module.
 * Owns model-surface utility logic and shared render-mode helpers.
 * Does not own backend orchestration or queue/capability state.
 */
import type { BaseSceneRenderMode, EngineCanvasSurfaceFactory, EngineRenderFrame } from '../../types/index.ts'
import {
  drawWebGLPacket,
  type WebGLQuadPipeline,
} from '../core/index.ts'
import type { CachedTextureEntry } from './textures.ts'
import {
  DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG,
  getZoomRenderStrategy,
  type EngineZoomStrategyConfig,
} from '../../zoomPerformance/index.ts'

// Keep the placeholder threshold shared so all WebGL fallback paths switch at the same scale.
// Keep this below 10% so default 10% zoom does not collapse into placeholder bars.
export const TEXT_PLACEHOLDER_MAX_SCALE = 0.08
const TEXT_PLACEHOLDER_SKIP_MAX_SCREEN_EDGE_PX = 2.2
const TEXTURE_BYTES_PER_PIXEL_RGBA = 4
const TEXT_STRIPE_INSET_X_MIN_RATIO = 0.08
const TEXT_STRIPE_INSET_X_MAX_RATIO = 0.32
const TEXT_STRIPE_INSET_Y_MIN_RATIO = 0.14
const TEXT_STRIPE_INSET_Y_MAX_RATIO = 0.28
const TEXT_STRIPE_INSET_DOUBLE = 2
const TEXT_STRIPE_GAP_FROM_AVAILABLE_HEIGHT_RATIO = 0.12
const TEXT_STRIPE_GAP_FROM_WORLD_HEIGHT_RATIO = 0.04
const TEXT_STRIPE_WIDTH_FACTOR_PRIMARY = 0.92
const TEXT_STRIPE_WIDTH_FACTOR_SECONDARY = 0.78
const TEXT_STRIPE_WIDTH_FACTOR_TERTIARY = 0.58
const TEXT_STRIPE_WIDTH_FACTORS = [
  TEXT_STRIPE_WIDTH_FACTOR_PRIMARY,
  TEXT_STRIPE_WIDTH_FACTOR_SECONDARY,
  TEXT_STRIPE_WIDTH_FACTOR_TERTIARY,
] as const
const TEXT_STRIPE_LAST_WIDTH_FACTOR_INDEX = TEXT_STRIPE_WIDTH_FACTORS.length - 1
const TEXT_STRIPE_COLOR_ALPHA_MULTIPLIER = 0.88
const TEXT_STRIPE_COUNT_LARGE_HEIGHT_PX = 56
const TEXT_STRIPE_COUNT_MEDIUM_HEIGHT_PX = 24
const TEXT_STRIPE_COUNT_LARGE = 3
const TEXT_STRIPE_COUNT_MEDIUM = 2

// Keep WebGL surface and snapshot helpers out of the main backend file so the
// primary renderer stays focused on render flow rather than canvas plumbing.
/**
 * Handles createModelSurface.
 * @param width Width value.
 * @param height Height value.
 * @param createCanvasSurface createCanvasSurface parameter.
 */
export function createModelSurface(
  width: number,
  height: number,
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface'],
) {
  // Scratch-surface allocation stays host-owned so engine never creates DOM nodes.
  const nextSurface = createCanvasSurface?.(width, height)
  if (nextSurface) {
    return {
      canvas: nextSurface,
    }
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    return {
      canvas: new OffscreenCanvas(width, height),
    }
  }

  return null
}

/**
 * Handles copyCanvasRegion.
 * @param source source parameter.
 * @param target target parameter.
 * @param sx sx parameter.
 * @param sy sy parameter.
 * @param sw sw parameter.
 * @param sh sh parameter.
 */
export function copyCanvasRegion(
  source: HTMLCanvasElement | OffscreenCanvas,
  target: HTMLCanvasElement | OffscreenCanvas,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
) {
  // Reuse one scratch surface so uncached text packets do not allocate a new
  // temporary canvas on every crop/upload pass.
  target.width = sw
  target.height = sh
  const context = target.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (context) {
    context.clearRect(0, 0, sw, sh)
    context.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  }

  return target
}

/**
 * Handles resolveBaseSceneRenderMode.
 * @param options Options object for this operation.
 */
export function resolveBaseSceneRenderMode(options: {
  // Whether this frame is rendered in interaction-priority quality mode.
  interactiveQuality: boolean
  // Whether tile cache is enabled for this renderer instance.
  tileCacheEnabled: boolean
  // Current viewport zoom scale.
  zoom: number
  // Approximate currently visible scene element count.
  visibleElementCount: number
  // Optional strategy threshold overrides.
  zoomStrategy?: Required<EngineZoomStrategyConfig>
}): BaseSceneRenderMode {
  const strategy = options.zoomStrategy ?? DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.strategy
  const interactionState = options.interactiveQuality ? 'dragging' : 'idle'
  const zoomRenderStrategy = getZoomRenderStrategy({
    zoom: options.zoom,
    visibleElementCount: options.visibleElementCount,
    interactionState,
    strategy,
  })

  if (!options.tileCacheEnabled) {
    return 'vector-live'
  }

  // Keep overview/simplified/normal/hybrid paths on tile-cache mode when cache is available.
  if (
    zoomRenderStrategy === 'overview' ||
    zoomRenderStrategy === 'simplified-tile' ||
    zoomRenderStrategy === 'normal-tile' ||
    zoomRenderStrategy === 'local-tile-vector-hybrid'
  ) {
    return options.interactiveQuality ? 'tile-cache' : 'progressive-refresh'
  }

  // Local-precise strategy prefers direct live vector rendering at high zoom.
  return 'vector-live'
}

/**
 * Handles resolveCachedTextureBytes.
 * @param cache Cache instance.
 */
export function resolveCachedTextureBytes(cache: Map<string, CachedTextureEntry>) {
  let total = 0
  for (const entry of cache.values()) {
    total += Math.max(1, entry.width * entry.height * TEXTURE_BYTES_PER_PIXEL_RGBA)
  }
  return total
}

// Keep the text fallback bars reusable because multiple WebGL paths can need
// cheap glyph-free previews without paying texture upload cost.
/**
 * Handles drawInteractiveTextFallback.
 * @param context Rendering context.
 * @param pipeline pipeline parameter.
 * @param frame Current render frame.
 * @param worldBounds worldBounds parameter.
 * @param color color parameter.
 * @param opacity opacity parameter.
 */
export function drawInteractiveTextFallback(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  pipeline: WebGLQuadPipeline,
  frame: EngineRenderFrame,
  worldBounds: {x: number; y: number; width: number; height: number},
  color: readonly [number, number, number, number],
  opacity: number,
) {
  const stripeCount = resolveInteractiveTextStripeCount(worldBounds.height)
  const [r, g, b, a] = color
  const insetX = Math.min(worldBounds.width * TEXT_STRIPE_INSET_X_MIN_RATIO, worldBounds.width * TEXT_STRIPE_INSET_X_MAX_RATIO)
  const insetY = Math.min(worldBounds.height * TEXT_STRIPE_INSET_Y_MIN_RATIO, worldBounds.height * TEXT_STRIPE_INSET_Y_MAX_RATIO)
  const availableHeight = Math.max(1, worldBounds.height - insetY * TEXT_STRIPE_INSET_DOUBLE)
  const stripeGap = Math.max(availableHeight * TEXT_STRIPE_GAP_FROM_AVAILABLE_HEIGHT_RATIO, worldBounds.height * TEXT_STRIPE_GAP_FROM_WORLD_HEIGHT_RATIO)
  const stripeHeight = Math.max(
    1,
    (availableHeight - stripeGap * Math.max(0, stripeCount - 1)) / Math.max(1, stripeCount),
  )

  let drawCount = 0
  for (let index = 0; index < stripeCount; index += 1) {
    // Draw a few ragged text-line bars so interaction previews stay legible
    // without paying the upload cost of a fresh text texture mid-gesture.
    const stripeWidth = Math.max(
      1,
      (worldBounds.width - insetX * TEXT_STRIPE_INSET_DOUBLE) * (TEXT_STRIPE_WIDTH_FACTORS[index] ?? TEXT_STRIPE_WIDTH_FACTORS[TEXT_STRIPE_LAST_WIDTH_FACTOR_INDEX]),
    )
    const stripeY = worldBounds.y + insetY + index * (stripeHeight + stripeGap)
    drawCount += drawWebGLPacket(
      context,
      pipeline,
      frame,
      {
        x: worldBounds.x + insetX,
        y: stripeY,
        width: stripeWidth,
        height: stripeHeight,
      },
      [r, g, b, a * TEXT_STRIPE_COLOR_ALPHA_MULTIPLIER],
      opacity,
      null,
    )
  }

  return drawCount
}

/**
 * Handles shouldSkipTextPlaceholderPacket.
 * @param frame Current render frame.
 * @param worldBounds worldBounds parameter.
 * @param lodEnabled lodEnabled parameter.
 */
export function shouldSkipTextPlaceholderPacket(
  frame: EngineRenderFrame,
  worldBounds: { width: number; height: number },
  lodEnabled: boolean,
) {
  if (!lodEnabled) {
    return false
  }

  const scale = Math.max(0, Math.abs(frame.viewport.scale))
  if (scale > TEXT_PLACEHOLDER_MAX_SCALE) {
    return false
  }

  const screenWidth = Math.abs(worldBounds.width) * scale
  const screenHeight = Math.abs(worldBounds.height) * scale
  return (
    screenWidth <= TEXT_PLACEHOLDER_SKIP_MAX_SCREEN_EDGE_PX &&
    screenHeight <= TEXT_PLACEHOLDER_SKIP_MAX_SCREEN_EDGE_PX
  )
}

/**
 * Handles resolveInteractiveTextStripeCount.
 * @param worldHeight worldHeight parameter.
 */
function resolveInteractiveTextStripeCount(worldHeight: number) {
  if (worldHeight >= TEXT_STRIPE_COUNT_LARGE_HEIGHT_PX) {
    return TEXT_STRIPE_COUNT_LARGE
  }

  if (worldHeight >= TEXT_STRIPE_COUNT_MEDIUM_HEIGHT_PX) {
    return TEXT_STRIPE_COUNT_MEDIUM
  }

  return 1
}