import type { BaseSceneRenderMode, EngineCanvasSurfaceFactory, EngineRenderFrame } from './types.ts'
import {
  drawWebGLPacket,
  type WebGLQuadPipeline,
} from './webglPipeline.ts'
import type { CachedTextureEntry } from './webglTextures.ts'

// Keep the placeholder threshold shared so all WebGL fallback paths switch at the same scale.
export const TEXT_PLACEHOLDER_MAX_SCALE = 0.16
const TEXT_PLACEHOLDER_SKIP_MAX_SCREEN_EDGE_PX = 2.2

// Keep WebGL surface and snapshot helpers out of the main backend file so the
// primary renderer stays focused on render flow rather than canvas plumbing.
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

export function resolveBaseSceneRenderMode(options: {
  interactiveQuality: boolean
  tileCacheEnabled: boolean
}): BaseSceneRenderMode {
  // During interaction we prefer cached tile composition; settled frames refresh progressively.
  if (options.tileCacheEnabled) {
    return options.interactiveQuality ? 'tile-cache' : 'progressive-refresh'
  }

  // Without tile cache, base scene stays on direct vector/live rendering.
  return 'vector-live'
}

export function resolveCachedTextureBytes(cache: Map<string, CachedTextureEntry>) {
  let total = 0
  for (const entry of cache.values()) {
    total += Math.max(1, entry.width * entry.height * 4)
  }
  return total
}

// Keep the text fallback bars reusable because multiple WebGL paths can need
// cheap glyph-free previews without paying texture upload cost.
export function drawInteractiveTextFallback(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  pipeline: WebGLQuadPipeline,
  frame: EngineRenderFrame,
  worldBounds: {x: number; y: number; width: number; height: number},
  color: readonly [number, number, number, number],
  opacity: number,
) {
  const stripeCount = resolveInteractiveTextStripeCount(worldBounds.height)
  const insetX = Math.min(worldBounds.width * 0.08, worldBounds.width * 0.32)
  const insetY = Math.min(worldBounds.height * 0.14, worldBounds.height * 0.28)
  const availableHeight = Math.max(1, worldBounds.height - insetY * 2)
  const stripeGap = Math.max(availableHeight * 0.12, worldBounds.height * 0.04)
  const stripeHeight = Math.max(
    1,
    (availableHeight - stripeGap * Math.max(0, stripeCount - 1)) / Math.max(1, stripeCount),
  )
  const widthFactors = [0.92, 0.78, 0.58]

  let drawCount = 0
  for (let index = 0; index < stripeCount; index += 1) {
    // Draw a few ragged text-line bars so interaction previews stay legible
    // without paying the upload cost of a fresh text texture mid-gesture.
    const stripeWidth = Math.max(
      1,
      (worldBounds.width - insetX * 2) * (widthFactors[index] ?? widthFactors[widthFactors.length - 1]),
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
      [color[0], color[1], color[2], color[3] * 0.88],
      opacity,
      null,
    )
  }

  return drawCount
}

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

function resolveInteractiveTextStripeCount(worldHeight: number) {
  if (worldHeight >= 56) {
    return 3
  }

  if (worldHeight >= 24) {
    return 2
  }

  return 1
}