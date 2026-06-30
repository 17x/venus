import type {
  EngineCanvasSurfaceFactory,
  EngineInteractionPreviewConfig,
  EngineRenderFrame,
  EngineRenderer,
} from '../types/index.ts'
import {
  prepareEngineRenderPlan,
  type EngineWorldMatrix,
} from '../plan/index.ts'
import type {
  EngineImageNode,
  EngineNodeBase,
  EnginePaint,
  EngineRect,
  EngineRenderableNode,
  EngineShapeNode,
} from '../../scene/types/types.ts'
import type { EngineSceneBufferLayout } from '../../scene/buffer/buffer.ts'
import { resolveEngineVisibilityProfile } from '../../interaction/visibilityLod.ts'
import {
  copyCanvasIntoSurface,
  ensureReuseSurface,
  shouldAdvanceInteractionPreviewSnapshot,
  tryReuseInteractiveFrame,
  type FrameReuseSnapshot,
  type ReuseCacheSurface,
} from './interactionPreview.ts'
import {
  appendRoundedRectPath,
  appendShapePath,
  drawShapeArrowheads,
  hasEllipseArc,
  normalizeArcRange,
  resolveCanvasEllipseAngleRadians,
  resolvePathSimplificationBucket,
} from './shapes.ts'
import { drawTextNode } from './text.ts'

interface Canvas2DEngineRendererOptions {
  id?: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  createCanvasSurface?: EngineCanvasSurfaceFactory['createSurface']
  manageCanvasSize?: boolean
  enableCulling?: boolean
  clearColor?: string
  imageSmoothing?: boolean
  imageSmoothingQuality?: ImageSmoothingQuality
  interactionPreview?: EngineInteractionPreviewConfig
}

interface RenderCounters {
  drawCount: number
  visibleCount: number
  culledCount: number
  cacheHits: number
  cacheMisses: number
  frameReuseHits: number
  frameReuseMisses: number
  trivialPathFastPathCount: number
  contourParseCount: number
  singleLineTextFastPathCount: number
  precomputedTextLineHeightCount: number
}

interface PreparedNodeEntry {
  node: EngineRenderableNode
  worldBounds: EngineRect | null
  worldMatrix: EngineWorldMatrix
}

const PATH_SIMPLIFICATION_BUCKET_MEDIUM = 1
const PATH_SIMPLIFICATION_BUCKET_HIGH = 2
type PathSimplificationBucket = 0 | typeof PATH_SIMPLIFICATION_BUCKET_MEDIUM | typeof PATH_SIMPLIFICATION_BUCKET_HIGH

const DEFAULT_INTERACTION_PREVIEW: Required<EngineInteractionPreviewConfig> = {
  enabled: true,
  mode: 'interaction',
  // Keep reuse enabled on Canvas2D; WebGL controls temporary drift guard separately.
  disableReuse: false,
  // Keep Canvas2D preview behavior aligned with WebGL default unless overridden.
  cacheOnly: false,
  maxScaleStep: 1.2,
  maxTranslatePx: 220,
}

const CANVAS2D_VISIBILITY_CULL_MAX_SCALE = 0.16
const CANVAS2D_VISIBILITY_CULL_MAX_EDGE_PX = 2.4
const CANVAS2D_VISIBILITY_CULL_MAX_AREA_PX2 = 8
const BUFFER_BOUNDS_STRIDE = 4
const BUFFER_BOUNDS_WIDTH_OFFSET = 2
const BUFFER_BOUNDS_HEIGHT_OFFSET = 3
const SEMANTIC_BOOST_TEXT = 0.08
const SEMANTIC_BOOST_IMAGE = 0.04
const HALF_DIVISOR = 2
const ELLIPSE_END_ANGLE_DEGREES = 360
const CLIP_NODE_PATH_SIMPLIFICATION_BUCKET = 0
const CLIP_NODE_VIEWPORT_SCALE = 1

const NULL_RENDER_COUNTERS: RenderCounters = {
  drawCount: 0,
  visibleCount: 0,
  culledCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  frameReuseHits: 0,
  frameReuseMisses: 0,
  trivialPathFastPathCount: 0,
  contourParseCount: 0,
  singleLineTextFastPathCount: 0,
  precomputedTextLineHeightCount: 0,
}

/**
 * Minimal built-in canvas2d renderer for standalone engine usage.
 *
 * Coverage:
 * - text and text runs
 * - image and source-rect draw
 * - clip rect/path and clip-by-node-id fallback
  * @param options Options object for this operation.
*/
export function createCanvas2DEngineRenderer(
  options: Canvas2DEngineRendererOptions,
): EngineRenderer {
  const context = options.canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!context) {
    throw new Error('canvas2d context is required for createCanvas2DEngineRenderer')
  }

  const enableCulling = options.enableCulling ?? true
  const manageCanvasSize = options.manageCanvasSize ?? true
  const clearColor = options.clearColor ?? 'transparent'
  const imageSmoothing = options.imageSmoothing ?? true
  const imageSmoothingQuality = options.imageSmoothingQuality ?? 'high'
  const interactionPreview = {
    ...DEFAULT_INTERACTION_PREVIEW,
    ...options.interactionPreview,
  }
  let cachedWorldBounds: {
    preparedNodesRef: PreparedNodeEntry[]
    map: Map<string, EngineRect>
  } | null = null
  let frameReuseSurface: ReuseCacheSurface | null = null
  let frameReuseSnapshot: FrameReuseSnapshot | null = null

  const resolveWorldBoundsByIdCached = (
    preparedNodes: PreparedNodeEntry[],
  ) => {
    if (cachedWorldBounds && cachedWorldBounds.preparedNodesRef === preparedNodes) {
      return cachedWorldBounds.map
    }

    const map = buildWorldBoundsMap(preparedNodes)
    cachedWorldBounds = {
      preparedNodesRef: preparedNodes,
      map,
    }
    return map
  }

  return {
    id: options.id ?? 'engine.renderer.canvas2d',
    capabilities: {
      backend: 'canvas2d',
      textRuns: true,
      imageClip: true,
      culling: enableCulling,
      lod: false,
    },
    resize: (size) => {
      if (!manageCanvasSize) {
        // Host-owned canvases keep sizing authority outside the renderer.
        return
      }

      // Internal/offscreen surfaces still need renderer-managed buffer size so
      // model-complete and preview lanes render at the requested resolution.
      if ('width' in options.canvas) {
        options.canvas.width = size.outputWidth
      }
      if ('height' in options.canvas) {
        options.canvas.height = size.outputHeight
      }
    },
    render: (frame) => {
      const startAt = performance.now()
      const counters: RenderCounters = {
        drawCount: 0,
        visibleCount: 0,
        culledCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        frameReuseHits: 0,
        frameReuseMisses: 0,
        trivialPathFastPathCount: 0,
        contourParseCount: 0,
        singleLineTextFastPathCount: 0,
        precomputedTextLineHeightCount: 0,
      }

      const pixelRatio = frame.context.outputPixelRatio ?? frame.context.pixelRatio ?? 1
      const reused = tryReuseInteractiveFrame(
        context,
        options.canvas,
        frame,
        pixelRatio,
        frameReuseSurface,
        frameReuseSnapshot,
        interactionPreview,
      )

      if (reused.reused) {
        counters.cacheHits += 1
        counters.frameReuseHits += 1
        counters.visibleCount = reused.visibleCount
        counters.culledCount = reused.culledCount

        if (shouldAdvanceInteractionPreviewSnapshot(frame.viewport.scale)) {
          frameReuseSurface = ensureReuseSurface(
            frameReuseSurface,
            options.canvas.width,
            options.canvas.height,
            options.createCanvasSurface,
          )
          if (frameReuseSurface) {
            copyCanvasIntoSurface(options.canvas, frameReuseSurface)
            frameReuseSnapshot = {
              revision: frame.scene.revision,
              scale: frame.viewport.scale,
              offsetX: frame.viewport.offsetX,
              offsetY: frame.viewport.offsetY,
              viewportWidth: frame.viewport.viewportWidth,
              viewportHeight: frame.viewport.viewportHeight,
              pixelRatio,
              canvasWidth: options.canvas.width,
              canvasHeight: options.canvas.height,
              visibleCount: counters.visibleCount,
              culledCount: counters.culledCount,
            }
          }
        }

        return {
          drawCount: counters.drawCount,
          visibleCount: counters.visibleCount,
          culledCount: counters.culledCount,
          cacheHits: counters.cacheHits,
          cacheMisses: counters.cacheMisses,
          frameReuseHits: counters.frameReuseHits,
          frameReuseMisses: counters.frameReuseMisses,
          canvas2dTrivialPathFastPathCount: counters.trivialPathFastPathCount,
          canvas2dContourParseCount: counters.contourParseCount,
          canvas2dSingleLineTextFastPathCount: counters.singleLineTextFastPathCount,
          canvas2dPrecomputedTextLineHeightCount: counters.precomputedTextLineHeightCount,
          frameMs: performance.now() - startAt,
        }
      }

      if (frame.context.quality === 'interactive') {
        counters.cacheMisses += 1
        counters.frameReuseMisses += 1
      }

      const plan = prepareEngineRenderPlan(frame)
      const bufferLayout = resolveSceneBufferLayout(frame.scene)
      const worldBoundsById = resolveWorldBoundsByIdCached(plan.preparedNodes)
      const preparedNodeById = buildPreparedNodeMap(plan.preparedNodes)
      clearCanvas(context, options.canvas, clearColor)
      applyViewportMatrix(context, frame.viewport.matrix, pixelRatio)
      context.imageSmoothingEnabled = imageSmoothing
      context.imageSmoothingQuality = imageSmoothingQuality

      for (const index of plan.drawList) {
        const prepared = plan.preparedNodes[index]
        const localRect = bufferLayout
          ? readLocalRectFromBufferLayout(bufferLayout, index)
          : null
        drawPreparedNode(
          context,
          prepared.node,
          prepared.worldMatrix,
          frame,
          worldBoundsById,
          preparedNodeById,
          counters,
          localRect,
        )
      }

      counters.visibleCount = plan.stats.visibleCount
      counters.culledCount = plan.stats.culledCount

      frameReuseSurface = ensureReuseSurface(
        frameReuseSurface,
        options.canvas.width,
        options.canvas.height,
        options.createCanvasSurface,
      )
      if (frameReuseSurface) {
        copyCanvasIntoSurface(options.canvas, frameReuseSurface)
      }
      frameReuseSnapshot = {
        revision: frame.scene.revision,
        scale: frame.viewport.scale,
        offsetX: frame.viewport.offsetX,
        offsetY: frame.viewport.offsetY,
        viewportWidth: frame.viewport.viewportWidth,
        viewportHeight: frame.viewport.viewportHeight,
        pixelRatio,
        canvasWidth: options.canvas.width,
        canvasHeight: options.canvas.height,
        visibleCount: counters.visibleCount,
        culledCount: counters.culledCount,
      }

      return {
        drawCount: counters.drawCount,
        visibleCount: counters.visibleCount,
        culledCount: counters.culledCount,
        groupCollapseCount: plan.stats.collapsedGroupCount,
        groupCollapseCulledCount: plan.stats.collapsedDescendantCulledCount,
        geometryCacheHitCount: plan.stats.geometryCacheHitCount,
        geometryCacheMissCount: plan.stats.geometryCacheMissCount,
        geometryCacheHitRate: plan.stats.geometryCacheHitRate,
        cacheHits: counters.cacheHits,
        cacheMisses: counters.cacheMisses,
        frameReuseHits: counters.frameReuseHits,
        frameReuseMisses: counters.frameReuseMisses,
        canvas2dTrivialPathFastPathCount: counters.trivialPathFastPathCount,
        canvas2dContourParseCount: counters.contourParseCount,
        canvas2dSingleLineTextFastPathCount: counters.singleLineTextFastPathCount,
        canvas2dPrecomputedTextLineHeightCount: counters.precomputedTextLineHeightCount,
        frameMs: performance.now() - startAt,
      }
    },
  }
}

/**
 * Handles clearCanvas.
 * @param context Rendering context.
 * @param canvas canvas parameter.
 * @param clearColor clearColor parameter.
 */
function clearCanvas(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  canvas: HTMLCanvasElement | OffscreenCanvas,
  clearColor: string,
) {
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)

  if (clearColor !== 'transparent') {
    context.fillStyle = clearColor
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
}

/**
 * Handles resolveSceneBufferLayout.
 * @param scene Scene snapshot.
 */
function resolveSceneBufferLayout(scene: EngineRenderFrame['scene']) {
  const layout = scene.metadata?.bufferLayout
  if (!layout) {
    return null
  }

  const candidate = layout as EngineSceneBufferLayout
  if (
    typeof candidate.count !== 'number' ||
    !Array.isArray(candidate.nodeIds) ||
    !(candidate.bounds instanceof Float32Array)
  ) {
    return null
  }

  return candidate
}

/**
 * Handles readLocalRectFromBufferLayout.
 * @param layout layout parameter.
 * @param slot slot parameter.
 */
function readLocalRectFromBufferLayout(layout: EngineSceneBufferLayout, slot: number) {
  if (slot < 0 || slot >= layout.count) {
    return null
  }

  const offset = slot * BUFFER_BOUNDS_STRIDE
  return {
    x: layout.bounds[offset],
    y: layout.bounds[offset + 1],
    width: layout.bounds[offset + BUFFER_BOUNDS_WIDTH_OFFSET],
    height: layout.bounds[offset + BUFFER_BOUNDS_HEIGHT_OFFSET],
  }
}

/**
 * Handles applyViewportMatrix.
 * @param context Rendering context.
 * @param matrix Transform matrix.
 * @param pixelRatio pixelRatio parameter.
 */
function applyViewportMatrix(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  matrix: readonly [number, number, number, number, number, number, number, number, number],
  pixelRatio: number,
) {
  const [m0, m1, m2, m3, m4, m5] = matrix
  context.setTransform(
    pixelRatio * m0,
    pixelRatio * m3,
    pixelRatio * m1,
    pixelRatio * m4,
    pixelRatio * m2,
    pixelRatio * m5,
  )
}

/**
 * Handles drawPreparedNode.
 * @param context Rendering context.
 * @param node Target node.
 * @param worldMatrix worldMatrix parameter.
 * @param frame Current render frame.
 * @param worldBoundsById worldBoundsById parameter.
 * @param preparedNodeById preparedNodeById parameter.
 * @param counters counters parameter.
 * @param localRect localRect parameter.
 */
function drawPreparedNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineRenderableNode,
  worldMatrix: EngineWorldMatrix,
  frame: EngineRenderFrame,
  worldBoundsById: Map<string, EngineRect>,
  preparedNodeById: Map<string, PreparedNodeEntry>,
  counters: RenderCounters,
  localRect: {x: number; y: number; width: number; height: number} | null,
) {
  // Settled low-zoom frames still go through the auxiliary Canvas2D renderer
  // for model-complete and tile-source generation, so apply the same
  // visibility-driven degradation here instead of relying on DPR alone.
  if (shouldCullCanvas2DNodeByVisibility(frame, node, worldBoundsById)) {
    return
  }

  context.save()

  applyBlendMode(context, node)
  applyNodeOpacity(context, node)
  applyLayerBlur(context, node)
  applyNodeShadow(context, node)
  applyClipByNodeReference(context, node, preparedNodeById, worldBoundsById)
  applyWorldTransform(context, worldMatrix)
  applyInlineClipShape(context, node)

  switch (node.type) {
    case 'text':
      drawTextNode(context, node, localRect, counters)
      counters.drawCount += 1
      break
    case 'image':
      drawImageNode(context, node, frame, counters, localRect)
      break
    case 'shape':
      drawShapeNode(
        context,
        node,
        localRect,
        resolvePathSimplificationBucket(frame),
        frame.viewport.scale,
        counters,
      )
      counters.drawCount += 1
      break
    default:
      break
  }

  context.restore()
}

/**
 * Handles shouldCullCanvas2DNodeByVisibility.
 * @param frame Current render frame.
 * @param node Target node.
 * @param worldBoundsById worldBoundsById parameter.
 */
function shouldCullCanvas2DNodeByVisibility(
  frame: EngineRenderFrame,
  node: EngineRenderableNode,
  worldBoundsById: Map<string, EngineRect>,
) {
  if (!frame.context.lodEnabled || frame.context.quality !== 'full') {
    return false
  }

  const scale = Math.max(0, Math.abs(frame.viewport.scale))
  if (scale > CANVAS2D_VISIBILITY_CULL_MAX_SCALE) {
    return false
  }

  if (frame.context.protectedNodeIds?.includes(node.id)) {
    return false
  }

  const worldBounds = worldBoundsById.get(node.id)
  if (!worldBounds) {
    return false
  }

  const screenWidth = Math.abs(worldBounds.width) * scale
  const screenHeight = Math.abs(worldBounds.height) * scale
  const minEdge = Math.min(screenWidth, screenHeight)
  const screenArea = screenWidth * screenHeight
  if (minEdge > CANVAS2D_VISIBILITY_CULL_MAX_EDGE_PX || screenArea > CANVAS2D_VISIBILITY_CULL_MAX_AREA_PX2) {
    return false
  }

  // Keep the visibility score aligned with the WebGL interaction path so low-
  // zoom settled frames drop only nodes with negligible screen contribution.
  const visibility = resolveEngineVisibilityProfile({
    screenAreaPx2: screenArea,
    screenMinEdgePx: minEdge,
    viewportAreaPx2: Math.max(1, frame.viewport.viewportWidth * frame.viewport.viewportHeight),
    semanticBoost: node.type === 'text' ? SEMANTIC_BOOST_TEXT : node.type === 'image' ? SEMANTIC_BOOST_IMAGE : 0,
  })

  return visibility.tier === 'tier-d'
}

/**
 * Handles drawImageNode.
 * @param context Rendering context.
 * @param node Target node.
 * @param frame Current render frame.
 * @param counters counters parameter.
 * @param localRect localRect parameter.
 */
function drawImageNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineImageNode,
  frame: EngineRenderFrame,
  counters: RenderCounters,
  localRect: {x: number; y: number; width: number; height: number} | null,
) {
  const drawX = localRect?.x ?? node.x
  const drawY = localRect?.y ?? node.y
  const drawWidth = localRect?.width ?? node.width
  const drawHeight = localRect?.height ?? node.height
  const source = frame.context.loader?.resolveImage(node.assetId) ?? null
  if (!source) {
    counters.cacheMisses += 1
    return
  }

  counters.cacheHits += 1
  context.imageSmoothingEnabled = node.imageSmoothing ?? true

  if (node.sourceRect) {
    context.drawImage(
      source,
      node.sourceRect.x,
      node.sourceRect.y,
      node.sourceRect.width,
      node.sourceRect.height,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    )
    counters.drawCount += 1
    return
  }

  context.drawImage(source, drawX, drawY, drawWidth, drawHeight)
  counters.drawCount += 1
}

/**
 * Activates the canvas blend mode for nodes that carry a non-default blendMode.
 * @param context Rendering context.
 * @param node Target node.
 */
function applyBlendMode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineRenderableNode,
) {
  const blendMode = (node as {blendMode?: string}).blendMode
  if (blendMode && blendMode !== 'normal' && blendMode !== 'passThrough') {
    context.globalCompositeOperation = blendMode as GlobalCompositeOperation
  }
}

/**
 * Resolves one paint descriptor into a CSS colour string or CanvasGradient.
 * @param context Rendering context.
 * @param paint Paint descriptor.
 * @param rect Bounding rect in local coordinates for gradient sizing.
 */
function resolvePaint(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  paint: EnginePaint,
  rect: {x: number; y: number; width: number; height: number},
): string | CanvasGradient {
  if (paint.type === 'solid') {
    return paint.color
  }

  const gradient = paint.gradient
  if (gradient.type === 'linear') {
    const canvasGradient = context.createLinearGradient(
      rect.x + gradient.startX,
      rect.y + gradient.startY,
      rect.x + gradient.endX,
      rect.y + gradient.endY,
    )
    for (const stop of gradient.stops) {
      canvasGradient.addColorStop(stop.offset, stop.color)
    }
    return canvasGradient
  }

  // Radial gradient.
  const canvasGradient = context.createRadialGradient(
    rect.x + gradient.centerX,
    rect.y + gradient.centerY,
    0,
    rect.x + gradient.centerX,
    rect.y + gradient.centerY,
    gradient.radius,
  )
  for (const stop of gradient.stops) {
    canvasGradient.addColorStop(stop.offset, stop.color)
  }
  return canvasGradient
}

/**
 * Resolves the effective paint-level opacity for a solid or gradient paint.
 * @param paint Paint descriptor.
 */
function resolvePaintOpacity(paint: EnginePaint): number {
  return paint.type === 'solid' ? (paint.opacity ?? 1) : (paint.opacity ?? 1)
}

/**
 * Applies stroke dash array only; stroke alignment is handled inline by the
 * fill-or-stroke ordering in drawShapeNode / drawEllipseArcNode.
 * @param context Rendering context.
 * @param node Shape node.
 */
function applyStrokeDash(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
) {
  if (node.strokeDashArray && node.strokeDashArray.length > 0) {
    context.setLineDash(node.strokeDashArray as number[])
  } else {
    context.setLineDash([])
  }
}

/**
 * Resolves the effective stroke width after alignment adjustment.
 * Inside/outside alignment doubles the physical lineWidth because the fill
 * pass masks the unwanted half.
 * @param node Shape node.
 */
function resolveAlignedStrokeWidth(node: EngineShapeNode): number {
  const base = node.strokeWidth ?? 0
  if ((node.strokeAlign === 'inside' || node.strokeAlign === 'outside') && base > 0) {
    return base * 2
  }
  return base
}

/**
 * Applies a multi-paint fill list to the current path, falling back to legacy fill.
 * This is the shared fill implementation for rect, ellipse, polygon, and closed path.
 * Open paths intentionally skip fill so compatibility fill fields cannot paint an
 * implicitly closed area.
 * @param context Rendering context.
 * @param node Shape node.
 * @param rect Local bounding rect for gradient sizing.
 */
function applyFills(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
) {
  if (node.shape === 'path' && node.closed === false) {
    return
  }

  if (node.fills && node.fills.length > 0) {
    for (const paint of node.fills) {
      const fillValue = resolvePaint(context, paint, rect)
      const opacity = resolvePaintOpacity(paint)
      context.globalAlpha *= opacity
      context.fillStyle = fillValue
      context.fill()
      context.globalAlpha /= opacity
    }
    return
  }

  // Legacy single fill.
  const fill = node.fill ?? 'rgba(17,24,39,0.05)'
  if (fill !== 'transparent') {
    context.fillStyle = fill
    context.fill()
  }
}

/**
 * Applies a multi-paint stroke list to the current path, falling back to legacy stroke.
 * Stroke alignment (inside/outside) is achieved by doubling the physical lineWidth
 * and relying on fill-or-stroke ordering in the caller to mask the unwanted half.
 * This is the shared stroke implementation for every EngineShapeNode kind.
 * @param context Rendering context.
 * @param node Shape node.
 * @param rect Local bounding rect for gradient sizing.
 * @param strokeAfterFill When true, stroke is drawn after fill (inside alignment).
 */
function applyStrokes(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
): {stroked: boolean; strokeColor: string | undefined; strokeWidth: number} {
  const alignedWidth = resolveAlignedStrokeWidth(node)
  context.lineWidth = alignedWidth

  if (node.strokes && node.strokes.length > 0) {
    let firstColor: string | undefined
    for (const paint of node.strokes) {
      const strokeValue = resolvePaint(context, paint, rect)
      const opacity = resolvePaintOpacity(paint)
      if (!firstColor && paint.type === 'solid') {
        firstColor = paint.color
      }
      context.globalAlpha *= opacity
      context.strokeStyle = strokeValue
      context.stroke()
      context.globalAlpha /= opacity
    }
    return {stroked: true, strokeColor: firstColor, strokeWidth: alignedWidth}
  }

  // Legacy single stroke.
  const stroke = node.stroke
  const strokeWidth = node.strokeWidth ?? 0
  if (stroke && stroke !== 'transparent' && strokeWidth > 0) {
    context.strokeStyle = stroke
    context.stroke()
    return {stroked: true, strokeColor: stroke, strokeWidth: alignedWidth}
  }

  return {stroked: false, strokeColor: undefined, strokeWidth: 0}
}

/**
 * Handles drawShapeNode with full gradient, dash, multi-fill/stroke, and
 * stroke-alignment support.
 * Shape geometry is authored by appendShapePath; paint, opacity, stroke order,
 * and arrowhead handling are centralized here for all shape kinds.
 * @param context Rendering context.
 * @param node Target node.
 * @param localRect localRect parameter.
 * @param pathSimplificationBucket pathSimplificationBucket parameter.
 * @param viewportScale viewportScale parameter.
 * @param counters counters parameter.
 */
function drawShapeNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  localRect: {x: number; y: number; width: number; height: number} | null,
  pathSimplificationBucket: PathSimplificationBucket,
  viewportScale: number,
  counters: RenderCounters,
) {
  const drawX = localRect?.x ?? node.x
  const drawY = localRect?.y ?? node.y
  const drawWidth = localRect?.width ?? node.width
  const drawHeight = localRect?.height ?? node.height
  const rect = {x: drawX, y: drawY, width: drawWidth, height: drawHeight}

  applyStrokeDash(context, node)

  // Inner shadow renders before fill so it sits under the fill layer.
  applyInnerShadow(context, node, rect)

  const cap = node.strokeCap ?? 'round'
  const join = node.strokeJoin ?? 'round'
  context.lineCap = cap as CanvasLineCap
  context.lineJoin = join as CanvasLineJoin

  if (node.shape === 'ellipse' && hasEllipseArc(node)) {
    drawEllipseArcNode(context, node, rect)
    return
  }

  const isLine = node.shape === 'line'
  const align = node.strokeAlign ?? 'center'

  // Helper: trace the shape path again (after appendShapePath consumed the current path).
  const retrace = () => {
    context.beginPath()
    appendShapePath(context, node, rect, pathSimplificationBucket, viewportScale, counters)
  }

  context.beginPath()
  const appended = appendShapePath(context, node, rect, pathSimplificationBucket, viewportScale, counters)
  if (!appended) {
    return
  }

  if (!isLine) {
    if (align === 'inside') {
      // Fill first, then clip to shape and stroke with 2x width so only the inner half renders.
      applyFills(context, node, rect)
      context.save()
      retrace()
      context.clip()
      const strokeResult = applyStrokes(context, node, rect)
      context.restore()
      if (strokeResult.stroked && strokeResult.strokeColor) {
        drawShapeArrowheads(context, node, strokeResult.strokeColor, strokeResult.strokeWidth, rect)
      }
    } else if (align === 'outside') {
      // Stroke with 2x width (renders inside+outside), then fill over the inside half.
      const strokeResult = applyStrokes(context, node, rect)
      applyFills(context, node, rect)
      if (strokeResult.stroked && strokeResult.strokeColor) {
        drawShapeArrowheads(context, node, strokeResult.strokeColor, strokeResult.strokeWidth, rect)
      }
    } else {
      // Center: standard fill-then-stroke.
      applyFills(context, node, rect)
      const strokeResult = applyStrokes(context, node, rect)
      if (strokeResult.stroked && strokeResult.strokeColor) {
        drawShapeArrowheads(context, node, strokeResult.strokeColor, strokeResult.strokeWidth, rect)
      }
    }
  } else {
    // Lines have no fill; stroke alignment just doubles the visible width.
    const strokeResult = applyStrokes(context, node, rect)
    if (strokeResult.stroked && strokeResult.strokeColor) {
      drawShapeArrowheads(context, node, strokeResult.strokeColor, strokeResult.strokeWidth, rect)
    }
  }
}

/**
 * Handles drawEllipseArcNode with full paint-list support.
 * @param context Rendering context.
 * @param node Target node.
 * @param rect rect parameter.
 */
function drawEllipseArcNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
) {
  const cx = rect.x + rect.width / HALF_DIVISOR
  const cy = rect.y + rect.height / HALF_DIVISOR
  const rx = Math.abs(rect.width) / HALF_DIVISOR
  const ry = Math.abs(rect.height) / HALF_DIVISOR
  const start = resolveCanvasEllipseAngleRadians(node.ellipseStartAngle ?? 0)
  const end = resolveCanvasEllipseAngleRadians(node.ellipseEndAngle ?? ELLIPSE_END_ANGLE_DEGREES)
  const arc = normalizeArcRange(start, end)
  const align = node.strokeAlign ?? 'center'

  // Ellipse arc path (open, for strokes).
  const traceArc = () => {
    context.beginPath()
    if (node.ellipseDrawWedgeLine) {
      context.moveTo(cx, cy)
    }
    context.ellipse(cx, cy, rx, ry, 0, arc.start, arc.end, arc.anticlockwise)
    if (node.ellipseDrawWedgeLine) {
      context.closePath()
    }
  }
  // Closed arc path for fills; optional wedge edges connect endpoints to center.
  const traceClosedArc = () => {
    context.beginPath()
    if (node.ellipseDrawWedgeLine) {
      context.moveTo(cx, cy)
    }
    context.ellipse(cx, cy, rx, ry, 0, arc.start, arc.end, arc.anticlockwise)
    context.closePath()
  }

  applyStrokeDash(context, node)
  const alignedWidth = resolveAlignedStrokeWidth(node)
  context.lineWidth = alignedWidth

  const drawStrokes = () => {
    if (node.strokes && node.strokes.length > 0) {
      for (const paint of node.strokes) {
        traceArc()
        const strokeValue = resolvePaint(context, paint, rect)
        const opacity = resolvePaintOpacity(paint)
        context.globalAlpha *= opacity
        context.strokeStyle = strokeValue
        context.stroke()
        context.globalAlpha /= opacity
      }
      return
    }
    const legacyStroke = node.stroke
    const legacyWidth = node.strokeWidth ?? 0
    if (legacyStroke && legacyStroke !== 'transparent' && legacyWidth > 0) {
      traceArc()
      context.strokeStyle = legacyStroke
      context.stroke()
    }
  }

  const drawFills = () => {
    if (node.fills && node.fills.length > 0) {
      for (const paint of node.fills) {
        traceClosedArc()
        const fillValue = resolvePaint(context, paint, rect)
        const opacity = resolvePaintOpacity(paint)
        context.globalAlpha *= opacity
        context.fillStyle = fillValue
        context.fill()
        context.globalAlpha /= opacity
      }
      return
    }
    const legacyFill = node.fill ?? 'rgba(17,24,39,0.05)'
    if (legacyFill !== 'transparent') {
      traceClosedArc()
      context.fillStyle = legacyFill
      context.fill()
    }
  }

  if (align === 'outside') {
    drawStrokes()
    drawFills()
  } else {
    drawFills()
    drawStrokes()
  }
}

/**
 * Handles applyNodeOpacity.
 * @param context Rendering context.
 * @param node Target node.
 */
function applyNodeOpacity(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineNodeBase,
) {
  if (typeof node.opacity !== 'number') {
    return
  }

  context.globalAlpha *= Math.max(0, Math.min(1, node.opacity))
}

/**
 * Handles applyNodeShadow.
 * @param context Rendering context.
 * @param node Target node.
 */
function applyNodeShadow(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineNodeBase,
) {
  if (!node.shadow) {
    return
  }

  context.shadowColor = node.shadow.color ?? 'rgba(0,0,0,0)'
  context.shadowBlur = node.shadow.blur ?? 0
  context.shadowOffsetX = node.shadow.offsetX ?? 0
  context.shadowOffsetY = node.shadow.offsetY ?? 0
}

/**
 * Applies inner shadow by drawing an inverted shadow mask inside shape bounds.
 * Called from drawShapeNode where the shape path is available.
 * @param context Rendering context.
 * @param node Shape node with optional innerShadow.
 * @param rect Local bounding rect.
 */
function applyInnerShadow(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
) {
  const is = node.innerShadow
  if (!is || !is.color || !(is.blur && is.blur > 0)) {
    return
  }

  const pad = Math.max(is.blur * 2, 20)
  const outerX = rect.x - pad
  const outerY = rect.y - pad
  const outerW = rect.width + pad * 2
  const outerH = rect.height + pad * 2

  context.save()
  // 1. Fill entire area with shadow colour (shadowBlur renders the soft edge).
  context.shadowColor = is.color
  context.shadowBlur = is.blur
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  context.fillStyle = is.color
  context.fillRect(outerX, outerY, outerW, outerH)
  // 2. Punch out the shape interior so shadow only appears at edges.
  context.globalCompositeOperation = 'destination-out'
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.fillStyle = 'black'
  context.fillRect(rect.x + 1, rect.y + 1, Math.max(0, rect.width - 2), Math.max(0, rect.height - 2))
  context.restore()
}

/**
 * Applies CSS filter blur to the layer before drawing.
 * @param context Rendering context.
 * @param node Target node.
 */
function applyLayerBlur(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineNodeBase,
) {
  const blur = node.layerBlur
  if (blur && blur.amount > 0) {
    context.filter = `blur(${blur.amount}px)`
  }
}

/**
 * Handles applyWorldTransform.
 * @param context Rendering context.
 * @param matrix Transform matrix.
 */
function applyWorldTransform(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  matrix: EngineWorldMatrix,
) {
  const [m0, m1, m2, m3, m4, m5] = matrix
  context.transform(m0, m3, m1, m4, m2, m5)
}

/**
 * Handles applyClipByNodeReference.
 * @param context Rendering context.
 * @param node Target node.
 * @param preparedNodeById preparedNodeById parameter.
 * @param worldBoundsById worldBoundsById parameter.
 */
function applyClipByNodeReference(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineNodeBase,
  preparedNodeById: Map<string, PreparedNodeEntry>,
  worldBoundsById: Map<string, EngineRect>,
) {
  const clipNodeId = node.clip?.clipNodeId
  if (!clipNodeId) {
    return
  }

  const rule = node.clip?.rule ?? 'nonzero'
  const clipNode = preparedNodeById.get(clipNodeId)
  if (clipNode?.node.type === 'shape') {
    context.beginPath()
    context.save()
    applyWorldTransform(context, clipNode.worldMatrix)
    const appended = appendShapePath(context, clipNode.node, {
      x: clipNode.node.x,
      y: clipNode.node.y,
      width: clipNode.node.width,
      height: clipNode.node.height,
    }, CLIP_NODE_PATH_SIMPLIFICATION_BUCKET, CLIP_NODE_VIEWPORT_SCALE, NULL_RENDER_COUNTERS)
    context.restore()
    if (appended) {
      context.clip(rule)
      return
    }
  }

  const bounds = worldBoundsById.get(clipNodeId)
  if (!bounds) {
    return
  }

  context.beginPath()
  context.rect(bounds.x, bounds.y, bounds.width, bounds.height)
  context.clip(rule)
}

/**
 * Handles applyInlineClipShape.
 * @param context Rendering context.
 * @param node Target node.
 */
function applyInlineClipShape(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineNodeBase,
) {
  const clip = node.clip?.clipShape
  if (!clip) {
    return
  }

  context.beginPath()

  if (clip.kind === 'rect') {
    if (clip.radius && clip.radius > 0) {
      appendRoundedRectPath(context, clip.rect, clip.radius)
    } else {
      context.rect(clip.rect.x, clip.rect.y, clip.rect.width, clip.rect.height)
    }
  } else {
    const [head, ...rest] = clip.points
    if (!head) {
      return
    }
    context.moveTo(head.x, head.y)
    for (const point of rest) {
      context.lineTo(point.x, point.y)
    }
    if (clip.closed !== false) {
      context.closePath()
    }
  }

  context.clip(node.clip?.rule ?? 'nonzero')
}

/**
 * Handles buildWorldBoundsMap.
 * @param preparedNodes preparedNodes parameter.
 */
function buildWorldBoundsMap(
  preparedNodes: PreparedNodeEntry[],
) {
  const map = new Map<string, EngineRect>()
  for (const entry of preparedNodes) {
    if (entry.worldBounds) {
      map.set(entry.node.id, entry.worldBounds)
    }
  }
  return map
}

/**
 * Handles buildPreparedNodeMap.
 * @param preparedNodes preparedNodes parameter.
 */
function buildPreparedNodeMap(
  preparedNodes: PreparedNodeEntry[],
) {
  const map = new Map<string, PreparedNodeEntry>()
  preparedNodes.forEach((entry) => {
    map.set(entry.node.id, entry)
  })
  return map
}
