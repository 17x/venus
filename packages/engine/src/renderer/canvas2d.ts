import type {
  EngineCanvasSurfaceFactory,
  EngineInteractionPreviewConfig,
  EngineRenderFrame,
  EngineRenderer,
} from './types.ts'
import {
  prepareEngineRenderPlan,
  type EngineWorldMatrix,
} from './plan.ts'
import type {
  EngineImageNode,
  EngineNodeBase,
  EngineRect,
  EngineRenderableNode,
  EngineShapeNode,
} from '../scene/types.ts'
import type { EngineSceneBufferLayout } from '../scene/buffer.ts'
import { resolveEngineVisibilityProfile } from '../interaction/visibilityLod.ts'
import {
  copyCanvasIntoSurface,
  ensureReuseSurface,
  shouldAdvanceInteractionPreviewSnapshot,
  tryReuseInteractiveFrame,
  type FrameReuseSnapshot,
  type ReuseCacheSurface,
} from './canvas2d/interactionPreview.ts'
import {
  appendRoundedRectPath,
  appendShapePath,
  drawShapeArrowheads,
  hasEllipseArc,
  normalizeArcRange,
  resolvePathSimplificationBucket,
  toRadians,
} from './canvas2d/shapes.ts'
import { drawTextNode } from './canvas2d/text.ts'

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

function readLocalRectFromBufferLayout(layout: EngineSceneBufferLayout, slot: number) {
  if (slot < 0 || slot >= layout.count) {
    return null
  }

  const offset = slot * 4
  return {
    x: layout.bounds[offset],
    y: layout.bounds[offset + 1],
    width: layout.bounds[offset + 2],
    height: layout.bounds[offset + 3],
  }
}

function applyViewportMatrix(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  matrix: readonly [number, number, number, number, number, number, number, number, number],
  pixelRatio: number,
) {
  context.setTransform(
    pixelRatio * matrix[0],
    pixelRatio * matrix[3],
    pixelRatio * matrix[1],
    pixelRatio * matrix[4],
    pixelRatio * matrix[2],
    pixelRatio * matrix[5],
  )
}

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

  applyNodeOpacity(context, node)
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
    semanticBoost: node.type === 'text' ? 0.08 : node.type === 'image' ? 0.04 : 0,
  })

  return visibility.tier === 'tier-d'
}

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

function drawShapeNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  localRect: {x: number; y: number; width: number; height: number} | null,
  pathSimplificationBucket: 0 | 1 | 2,
  viewportScale: number,
  counters: RenderCounters,
) {
  const drawX = localRect?.x ?? node.x
  const drawY = localRect?.y ?? node.y
  const drawWidth = localRect?.width ?? node.width
  const drawHeight = localRect?.height ?? node.height
  const fill = node.fill ?? 'rgba(17,24,39,0.05)'
  const stroke = node.stroke ?? '#1f2937'
  const strokeWidth = node.strokeWidth ?? 1

  context.fillStyle = fill
  context.strokeStyle = stroke
  context.lineWidth = strokeWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (node.shape === 'ellipse' && hasEllipseArc(node)) {
    drawEllipseArcNode(context, node, fill, stroke, strokeWidth, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    })
    return
  }

  context.beginPath()

  const appended = appendShapePath(context, node, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  }, pathSimplificationBucket, viewportScale, counters)
  if (!appended) {
    return
  }

  const shouldFill = fill !== 'transparent' && (node.shape !== 'line')
  if (shouldFill) {
    context.fill()
  }
  context.stroke()

  // Draw arrowheads after stroke so the cap shape stays sharp.
  drawShapeArrowheads(context, node, stroke, strokeWidth, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  })
}

function drawEllipseArcNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  fill: string,
  stroke: string,
  strokeWidth: number,
  rect: {x: number; y: number; width: number; height: number},
) {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const rx = Math.abs(rect.width) / 2
  const ry = Math.abs(rect.height) / 2
  const start = toRadians(node.ellipseStartAngle ?? 0)
  const end = toRadians(node.ellipseEndAngle ?? 360)
  const arc = normalizeArcRange(start, end)

  if (fill !== 'transparent') {
    context.beginPath()
    context.moveTo(cx, cy)
    context.ellipse(cx, cy, rx, ry, 0, arc.start, arc.end, arc.anticlockwise)
    context.closePath()
    context.fillStyle = fill
    context.fill()
  }

  context.beginPath()
  context.ellipse(cx, cy, rx, ry, 0, arc.start, arc.end, arc.anticlockwise)
  context.strokeStyle = stroke
  context.lineWidth = strokeWidth
  context.stroke()
}

function applyNodeOpacity(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineNodeBase,
) {
  if (typeof node.opacity !== 'number') {
    return
  }

  context.globalAlpha *= Math.max(0, Math.min(1, node.opacity))
}

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

function applyWorldTransform(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  matrix: EngineWorldMatrix,
) {
  context.transform(matrix[0], matrix[3], matrix[1], matrix[4], matrix[2], matrix[5])
}

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
    }, 0, 1, NULL_RENDER_COUNTERS)
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

function buildPreparedNodeMap(
  preparedNodes: PreparedNodeEntry[],
) {
  const map = new Map<string, PreparedNodeEntry>()
  preparedNodes.forEach((entry) => {
    map.set(entry.node.id, entry)
  })
  return map
}
