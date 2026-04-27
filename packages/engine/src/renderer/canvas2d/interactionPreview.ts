import type {
  EngineCanvasSurfaceFactory,
  EngineInteractionPreviewConfig,
  EngineRenderFrame,
} from '../types.ts'

const INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE = 0.12
const INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE_STEP = 1.3
const INTERACTION_PREVIEW_LOW_SCALE_MAX_TRANSLATE_PX = 320
const INTERACTION_PREVIEW_LOW_SCALE_VIEWPORT_TRANSLATE_RATIO = 0.24
const INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE = 0.05
const INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE_STEP = 1.75
const INTERACTION_PREVIEW_OVERVIEW_MAX_TRANSLATE_PX = 560
const INTERACTION_PREVIEW_OVERVIEW_VIEWPORT_TRANSLATE_RATIO = 0.35

export interface FrameReuseSnapshot {
  revision: string | number
  scale: number
  offsetX: number
  offsetY: number
  viewportWidth: number
  viewportHeight: number
  pixelRatio: number
  canvasWidth: number
  canvasHeight: number
  visibleCount: number
  culledCount: number
}

export interface ReuseCacheSurface {
  canvas: HTMLCanvasElement | OffscreenCanvas
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
}

export function tryReuseInteractiveFrame(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  canvas: HTMLCanvasElement | OffscreenCanvas,
  frame: EngineRenderFrame,
  pixelRatio: number,
  surface: ReuseCacheSurface | null,
  snapshot: FrameReuseSnapshot | null,
  interactionPreview: Required<EngineInteractionPreviewConfig>,
): {reused: boolean; visibleCount: number; culledCount: number} {
  if (!interactionPreview.enabled || !surface || !snapshot || frame.context.quality !== 'interactive') {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  if (
    snapshot.revision !== frame.scene.revision ||
    snapshot.viewportWidth !== frame.viewport.viewportWidth ||
    snapshot.viewportHeight !== frame.viewport.viewportHeight ||
    snapshot.pixelRatio !== pixelRatio ||
    snapshot.canvasWidth !== canvas.width ||
    snapshot.canvasHeight !== canvas.height
  ) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  const scaleRatio = frame.viewport.scale / snapshot.scale
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  if (interactionPreview.mode === 'zoom-only' && Math.abs(scaleRatio - 1) < 1e-3) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  const maxScaleStep = resolveInteractionPreviewMaxScaleStep(
    interactionPreview.maxScaleStep,
    Math.min(snapshot.scale, frame.viewport.scale),
  )
  if (scaleRatio > maxScaleStep || scaleRatio < 1 / maxScaleStep) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  const nextOffsetXPx = frame.viewport.offsetX * pixelRatio
  const nextOffsetYPx = frame.viewport.offsetY * pixelRatio
  const previousOffsetXPx = snapshot.offsetX * pixelRatio
  const previousOffsetYPx = snapshot.offsetY * pixelRatio
  const deltaX = nextOffsetXPx - scaleRatio * previousOffsetXPx
  const deltaY = nextOffsetYPx - scaleRatio * previousOffsetYPx
  const maxTranslatePx = resolveInteractionPreviewMaxTranslatePx(
    interactionPreview.maxTranslatePx,
    Math.min(snapshot.scale, frame.viewport.scale),
    snapshot.viewportWidth * pixelRatio,
    snapshot.viewportHeight * pixelRatio,
  )
  if (Math.abs(deltaX) > maxTranslatePx.x || Math.abs(deltaY) > maxTranslatePx.y) {
    return {reused: false, visibleCount: 0, culledCount: 0}
  }

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.setTransform(scaleRatio, 0, 0, scaleRatio, deltaX, deltaY)
  context.drawImage(surface.canvas as CanvasImageSource, 0, 0)

  return {
    reused: true,
    visibleCount: snapshot.visibleCount,
    culledCount: snapshot.culledCount,
  }
}

export function shouldAdvanceInteractionPreviewSnapshot(scale: number) {
  return scale <= INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE
}

export function ensureReuseSurface(
  surface: ReuseCacheSurface | null,
  width: number,
  height: number,
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface'],
): ReuseCacheSurface | null {
  if (width <= 0 || height <= 0) {
    return null
  }

  if (surface && surface.canvas.width === width && surface.canvas.height === height) {
    return surface
  }

  const nextCanvas = createReuseCanvas(width, height, createCanvasSurface)
  if (!nextCanvas) {
    return null
  }

  const nextContext = nextCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!nextContext) {
    return null
  }

  return {
    canvas: nextCanvas,
    context: nextContext,
  }
}

export function copyCanvasIntoSurface(
  source: HTMLCanvasElement | OffscreenCanvas,
  surface: ReuseCacheSurface,
) {
  // Reset the snapshot surface before copying so interaction reuse never accumulates stale pixels.
  surface.context.setTransform(1, 0, 0, 1, 0, 0)
  surface.context.clearRect(0, 0, surface.canvas.width, surface.canvas.height)
  surface.context.drawImage(source as CanvasImageSource, 0, 0)
}

function resolveInteractionPreviewMaxTranslatePx(
  baseTranslatePx: number,
  scale: number,
  viewportWidthPx: number,
  viewportHeightPx: number,
) {
  if (scale <= INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE) {
    return {
      x: Math.max(
        baseTranslatePx,
        INTERACTION_PREVIEW_OVERVIEW_MAX_TRANSLATE_PX,
        Math.round(viewportWidthPx * INTERACTION_PREVIEW_OVERVIEW_VIEWPORT_TRANSLATE_RATIO),
      ),
      y: Math.max(
        baseTranslatePx,
        INTERACTION_PREVIEW_OVERVIEW_MAX_TRANSLATE_PX,
        Math.round(viewportHeightPx * INTERACTION_PREVIEW_OVERVIEW_VIEWPORT_TRANSLATE_RATIO),
      ),
    }
  }

  if (scale <= INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE) {
    return {
      x: Math.max(
        baseTranslatePx,
        INTERACTION_PREVIEW_LOW_SCALE_MAX_TRANSLATE_PX,
        Math.round(viewportWidthPx * INTERACTION_PREVIEW_LOW_SCALE_VIEWPORT_TRANSLATE_RATIO),
      ),
      y: Math.max(
        baseTranslatePx,
        INTERACTION_PREVIEW_LOW_SCALE_MAX_TRANSLATE_PX,
        Math.round(viewportHeightPx * INTERACTION_PREVIEW_LOW_SCALE_VIEWPORT_TRANSLATE_RATIO),
      ),
    }
  }

  return {x: baseTranslatePx, y: baseTranslatePx}
}

function resolveInteractionPreviewMaxScaleStep(baseScaleStep: number, scale: number) {
  if (scale <= INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE) {
    return Math.max(baseScaleStep, INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE_STEP)
  }

  if (scale <= INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE) {
    return Math.max(baseScaleStep, INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE_STEP)
  }

  return baseScaleStep
}

function createReuseCanvas(
  width: number,
  height: number,
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface'],
) {
  // Interaction preview buffers are host-owned so engine stays DOM-agnostic.
  const nextSurface = createCanvasSurface?.(width, height)
  if (nextSurface) {
    return nextSurface
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }

  return null
}
