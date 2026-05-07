/**
 * Renderer/WebGL interaction-preview module.
 * Owns snapshot reuse checks and interaction-frame reprojection decisions.
 * Does not own snapshot storage lifecycle or tile scheduling.
 */
import type { EngineInteractionPreviewConfig, EngineRenderFrame } from '../types/types.ts'
import {
  ENGINE_RENDER_FALLBACK_REASON,
  type EngineRenderFallbackReason,
} from '../fallbackTaxonomy/fallbackTaxonomy.ts'
import {
  drawCompositeTextureFrame,
  resolveCompositeSnapshotPixelRatio,
  type InteractionCompositeSnapshot,
} from '../webglComposite/webglComposite.ts'
import {
  createViewportMatrixForRender,
  type WebGLQuadPipeline,
} from '../webgl/core/pipeline.ts'

const INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE = 0.12
const INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE_STEP = 1.3
const INTERACTION_PREVIEW_LOW_SCALE_MAX_TRANSLATE_PX = 320
const INTERACTION_PREVIEW_LOW_SCALE_VIEWPORT_TRANSLATE_RATIO = 0.24
const INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE = 0.05
const INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE_STEP = 1.75
const INTERACTION_PREVIEW_OVERVIEW_MAX_TRANSLATE_PX = 560
const INTERACTION_PREVIEW_OVERVIEW_VIEWPORT_TRANSLATE_RATIO = 0.35
const SCALE_RATIO_IDENTITY_EPSILON = 1e-3

export interface ScreenRectPx {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Reuses the previously captured composite frame via affine reprojection.
 * This path must stay lightweight so pan frames avoid full plan/raster work.
  * @param options Options object for this operation.
*/
export function tryReuseInteractiveCompositeFrame(options: {
  context: WebGLRenderingContext | WebGL2RenderingContext
  pipeline: WebGLQuadPipeline
  frame: EngineRenderFrame
  texture: WebGLTexture
  snapshot: InteractionCompositeSnapshot | null
  interactionPreview: Required<EngineInteractionPreviewConfig>
}) {
  // Reuse path must always return taxonomy-backed miss reasons for diagnostics coherence.
  if (!options.interactionPreview.enabled || !options.snapshot) {
    return {
      reused: false,
      missReason: ENGINE_RENDER_FALLBACK_REASON.L0_NO_SNAPSHOT,
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  const snapshot = options.snapshot
  const frame = options.frame
  const currentPixelRatio = resolveCompositeSnapshotPixelRatio(frame)
  const allowsCacheOnlyDprReuse =
    options.interactionPreview.cacheOnly && snapshot.pixelRatio >= currentPixelRatio
  if (snapshot.revision !== frame.scene.revision) {
    return {
      reused: false,
      missReason: ENGINE_RENDER_FALLBACK_REASON.L0_REVISION_MISMATCH,
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  if (snapshot.viewportWidth !== frame.viewport.viewportWidth) {
    return {
      reused: false,
      missReason: ENGINE_RENDER_FALLBACK_REASON.L0_VIEWPORT_WIDTH_MISMATCH,
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  if (snapshot.viewportHeight !== frame.viewport.viewportHeight) {
    return {
      reused: false,
      missReason: ENGINE_RENDER_FALLBACK_REASON.L0_VIEWPORT_HEIGHT_MISMATCH,
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  if (snapshot.pixelRatio !== currentPixelRatio && !allowsCacheOnlyDprReuse) {
    return {
      reused: false,
      missReason: ENGINE_RENDER_FALLBACK_REASON.L0_PIXEL_RATIO_MISMATCH,
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  const scaleRatio = frame.viewport.scale / snapshot.scale
  if (!Number.isFinite(scaleRatio) || scaleRatio <= 0) {
    return {
      reused: false,
      missReason: ENGINE_RENDER_FALLBACK_REASON.L0_INVALID_SCALE_RATIO,
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  if (options.interactionPreview.mode === 'zoom-only' && Math.abs(scaleRatio - 1) < SCALE_RATIO_IDENTITY_EPSILON) {
    return {
      reused: false,
      missReason: ENGINE_RENDER_FALLBACK_REASON.L0_ZOOM_ONLY_PAN_BLOCKED,
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  const maxScaleStep = resolveInteractionPreviewMaxScaleStep(
    options.interactionPreview.maxScaleStep,
    Math.min(snapshot.scale, frame.viewport.scale),
  )

  if (
    scaleRatio > maxScaleStep ||
    scaleRatio < 1 / maxScaleStep
  ) {
    return {
      reused: false,
      missReason: ENGINE_RENDER_FALLBACK_REASON.L0_SCALE_STEP_EXCEEDED,
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  const maxTranslatePx = resolveInteractionPreviewMaxTranslatePx(
    options.interactionPreview.maxTranslatePx,
    Math.min(snapshot.scale, frame.viewport.scale),
    snapshot.viewportWidth * currentPixelRatio,
    snapshot.viewportHeight * currentPixelRatio,
  )

  const deltaX = frame.viewport.offsetX - scaleRatio * snapshot.offsetX
  const deltaY = frame.viewport.offsetY - scaleRatio * snapshot.offsetY
  if (
    Math.abs(deltaX * currentPixelRatio) > maxTranslatePx.x ||
    Math.abs(deltaY * currentPixelRatio) > maxTranslatePx.y
  ) {
    return {
      reused: false,
      missReason: ENGINE_RENDER_FALLBACK_REASON.L0_TRANSLATE_EXCEEDED,
      visibleCount: 0,
      culledCount: 0,
      edgeRedrawRegions: [] as ScreenRectPx[],
    }
  }

  options.context.viewport(
    0,
    0,
    frame.viewport.viewportWidth * currentPixelRatio,
    frame.viewport.viewportHeight * currentPixelRatio,
  )
  options.context.enable(options.context.BLEND)
  options.context.blendFunc(options.context.ONE, options.context.ONE_MINUS_SRC_ALPHA)
  options.context.clearColor(0, 0, 0, 0)
  options.context.clear(options.context.COLOR_BUFFER_BIT)

  const previewFrame: EngineRenderFrame = {
    ...frame,
    viewport: {
      ...frame.viewport,
      scale: scaleRatio,
      offsetX: deltaX,
      offsetY: deltaY,
      // Preview transform reprojects cached frame; matrix must track the derived transform.
      matrix: createViewportMatrixForRender(scaleRatio, deltaX, deltaY),
    },
  }

  drawCompositeTextureFrame({
    context: options.context,
    pipeline: options.pipeline,
    frame: previewFrame,
    texture: options.texture,
    viewportWidth: snapshot.viewportWidth,
    viewportHeight: snapshot.viewportHeight,
    textureSource: snapshot.textureSource,
  })

  const edgeRedrawRegions = resolveInteractivePreviewEdgeRedrawRegions(
    frame.viewport.viewportWidth * currentPixelRatio,
    frame.viewport.viewportHeight * currentPixelRatio,
    scaleRatio,
    deltaX * currentPixelRatio,
    deltaY * currentPixelRatio,
  )

  return {
    reused: true,
    missReason: null as EngineRenderFallbackReason | null,
    visibleCount: snapshot.visibleCount,
    culledCount: snapshot.culledCount,
    edgeRedrawRegions,
  }
}

/**
 * Handles shouldAdvanceInteractionPreviewSnapshot.
 * @param scale Scale value.
 */
export function shouldAdvanceInteractionPreviewSnapshot(scale: number) {
  return scale <= INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE
}

/**
 * Handles resolveInteractionPreviewMaxTranslatePx.
 * @param baseTranslatePx baseTranslatePx parameter.
 * @param scale Scale value.
 * @param viewportWidthPx viewportWidthPx parameter.
 * @param viewportHeightPx viewportHeightPx parameter.
 */
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

/**
 * Handles resolveInteractionPreviewMaxScaleStep.
 * @param baseScaleStep baseScaleStep parameter.
 * @param scale Scale value.
 */
function resolveInteractionPreviewMaxScaleStep(
  baseScaleStep: number,
  scale: number,
) {
  if (scale <= INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE) {
    return Math.max(baseScaleStep, INTERACTION_PREVIEW_OVERVIEW_MAX_SCALE_STEP)
  }

  if (scale <= INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE) {
    return Math.max(baseScaleStep, INTERACTION_PREVIEW_LOW_SCALE_MAX_SCALE_STEP)
  }

  return baseScaleStep
}

/**
 * Handles resolveInteractivePreviewEdgeRedrawRegions.
 * @param viewportWidthPx viewportWidthPx parameter.
 * @param viewportHeightPx viewportHeightPx parameter.
 * @param scaleRatio scaleRatio parameter.
 * @param deltaXPx deltaXPx parameter.
 * @param deltaYPx deltaYPx parameter.
 */
function resolveInteractivePreviewEdgeRedrawRegions(
  viewportWidthPx: number,
  viewportHeightPx: number,
  scaleRatio: number,
  deltaXPx: number,
  deltaYPx: number,
): ScreenRectPx[] {
  if (Math.abs(scaleRatio - 1) > SCALE_RATIO_IDENTITY_EPSILON) {
    return []
  }

  const regions: ScreenRectPx[] = []
  const horizontalShiftPx = Math.trunc(deltaXPx)
  const verticalShiftPx = Math.trunc(deltaYPx)

  if (horizontalShiftPx > 0) {
    regions.push({
      x: 0,
      y: 0,
      width: Math.min(viewportWidthPx, horizontalShiftPx),
      height: viewportHeightPx,
    })
  } else if (horizontalShiftPx < 0) {
    const width = Math.min(viewportWidthPx, Math.abs(horizontalShiftPx))
    regions.push({
      x: Math.max(0, viewportWidthPx - width),
      y: 0,
      width,
      height: viewportHeightPx,
    })
  }

  if (verticalShiftPx > 0) {
    regions.push({
      x: 0,
      y: 0,
      width: viewportWidthPx,
      height: Math.min(viewportHeightPx, verticalShiftPx),
    })
  } else if (verticalShiftPx < 0) {
    const height = Math.min(viewportHeightPx, Math.abs(verticalShiftPx))
    regions.push({
      x: 0,
      y: Math.max(0, viewportHeightPx - height),
      width: viewportWidthPx,
      height,
    })
  }

  return regions.filter((region) => region.width > 0 && region.height > 0)
}
