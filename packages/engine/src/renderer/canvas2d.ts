import type {
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
  EngineTextNode,
  EngineTextStyle,
} from '../scene/types.ts'
import type { EngineSceneBufferLayout } from '../scene/buffer.ts'

interface Canvas2DEngineRendererOptions {
  id?: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  enableCulling?: boolean
  clearColor?: string
  imageSmoothing?: boolean
  imageSmoothingQuality?: ImageSmoothingQuality
}

interface RenderCounters {
  drawCount: number
  visibleCount: number
  culledCount: number
  cacheHits: number
  cacheMisses: number
}

interface PreparedNodeEntry {
  node: EngineRenderableNode
  worldBounds: EngineRect | null
  worldMatrix: EngineWorldMatrix
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
  const clearColor = options.clearColor ?? 'transparent'
  const imageSmoothing = options.imageSmoothing ?? true
  const imageSmoothingQuality = options.imageSmoothingQuality ?? 'high'
  let cachedWorldBounds: {
    preparedNodesRef: PreparedNodeEntry[]
    map: Map<string, EngineRect>
  } | null = null

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
    resize: (width, height) => {
      if ('width' in options.canvas) {
        options.canvas.width = width
      }
      if ('height' in options.canvas) {
        options.canvas.height = height
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
      }

      const plan = prepareEngineRenderPlan(frame)
      const bufferLayout = resolveSceneBufferLayout(frame.scene)
      const worldBoundsById = resolveWorldBoundsByIdCached(plan.preparedNodes)
      const preparedNodeById = buildPreparedNodeMap(plan.preparedNodes)
      clearCanvas(context, options.canvas, clearColor)
      applyViewportMatrix(context, frame.viewport.matrix, frame.context.pixelRatio ?? 1)
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

      return {
        drawCount: counters.drawCount,
        visibleCount: counters.visibleCount,
        culledCount: counters.culledCount,
        cacheHits: counters.cacheHits,
        cacheMisses: counters.cacheMisses,
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
  context.save()

  applyNodeOpacity(context, node)
  applyNodeShadow(context, node)
  applyClipByNodeReference(context, node, preparedNodeById, worldBoundsById)
  applyWorldTransform(context, worldMatrix)
  applyInlineClipShape(context, node)

  switch (node.type) {
    case 'text':
      drawTextNode(context, node, localRect)
      counters.drawCount += 1
      break
    case 'image':
      drawImageNode(context, node, frame, counters, localRect)
      break
    case 'shape':
      drawShapeNode(context, node, localRect)
      counters.drawCount += 1
      break
    default:
      break
  }

  context.restore()
}

function drawTextNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineTextNode,
  localRect: {x: number; y: number; width: number; height: number} | null,
) {
  context.textBaseline = 'top'
  const lineHeight = node.style.lineHeight ?? node.style.fontSize
  const originX = resolveTextAnchorX(node, localRect)
  const originY = resolveTextAnchorY(node, localRect, lineHeight)

  const baseText = node.text ?? ''
  if (node.runs && node.runs.length > 0) {
    let cursorX = originX
    const baselineY = originY
    for (const run of node.runs) {
      applyTextStyle(context, {
        ...node.style,
        ...run.style,
      })
      cursorX = drawTextSpan(context, run.text, cursorX, baselineY, {
        fill: run.style?.fill ?? node.style.fill,
        stroke: run.style?.stroke ?? node.style.stroke,
        strokeWidth: run.style?.strokeWidth ?? node.style.strokeWidth,
        letterSpacing: run.style?.letterSpacing ?? node.style.letterSpacing,
      })
    }
    return
  }

  applyTextStyle(context, node.style)
  void drawTextSpan(context, baseText, originX, originY, {
    fill: node.style.fill,
    stroke: node.style.stroke,
    strokeWidth: node.style.strokeWidth,
    letterSpacing: node.style.letterSpacing,
  })
}

function resolveTextAnchorX(
  node: EngineTextNode,
  localRect: {x: number; y: number; width: number; height: number} | null,
) {
  const x = localRect?.x ?? node.x
  const width = localRect?.width ?? node.width
  if (!width) {
    return x
  }
  if (node.style.align === 'center') {
    return x + width / 2
  }
  if (node.style.align === 'end') {
    return x + width
  }
  return x
}

function resolveTextAnchorY(
  node: EngineTextNode,
  localRect: {x: number; y: number; width: number; height: number} | null,
  lineHeight: number,
) {
  const y = localRect?.y ?? node.y
  const height = localRect?.height ?? node.height
  if (!height) {
    return y
  }

  if (node.style.verticalAlign === 'middle') {
    return y + (height - lineHeight) / 2
  }
  if (node.style.verticalAlign === 'bottom') {
    return y + height - lineHeight
  }
  return y
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
  })
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

function appendShapePath(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
) {
  if (node.shape === 'ellipse') {
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const rx = Math.abs(rect.width) / 2
    const ry = Math.abs(rect.height) / 2
    const start = toRadians(node.ellipseStartAngle ?? 0)
    const end = toRadians(node.ellipseEndAngle ?? 360)
    const arc = normalizeArcRange(start, end)
    const fullCircle = !hasEllipseArc(node)

    if (fullCircle) {
      context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      return true
    }

    context.moveTo(cx, cy)
    context.ellipse(cx, cy, rx, ry, 0, arc.start, arc.end, arc.anticlockwise)
    context.closePath()
    return true
  }

  if (node.shape === 'line') {
    context.moveTo(rect.x, rect.y)
    context.lineTo(rect.x + rect.width, rect.y + rect.height)
    return true
  }

  if (node.shape === 'polygon') {
    const points = node.points ?? []
    const [head, ...rest] = points
    if (!head) {
      return false
    }
    context.moveTo(head.x, head.y)
    rest.forEach((point) => context.lineTo(point.x, point.y))
    context.closePath()
    return true
  }

  if (node.shape === 'path') {
    return appendPathGeometry(context, node)
  }

  const hasCornerRadii = Boolean(
    node.cornerRadii ||
    (typeof node.cornerRadius === 'number' && node.cornerRadius > 0),
  )
  if (hasCornerRadii) {
    appendRectPathWithCornerRadii(
      context,
      rect,
      node.cornerRadii,
      node.cornerRadius,
    )
  } else {
    context.rect(rect.x, rect.y, rect.width, rect.height)
  }
  return true
}

function appendPathGeometry(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
) {
  const bezierPoints = node.bezierPoints ?? []
  const points = node.points ?? []

  if (bezierPoints.length > 0) {
    const [head, ...rest] = bezierPoints
    context.moveTo(head.anchor.x, head.anchor.y)
    let previous = head
    rest.forEach((current) => {
      context.bezierCurveTo(
        previous.cp2?.x ?? previous.anchor.x,
        previous.cp2?.y ?? previous.anchor.y,
        current.cp1?.x ?? current.anchor.x,
        current.cp1?.y ?? current.anchor.y,
        current.anchor.x,
        current.anchor.y,
      )
      previous = current
    })
    if (node.closed) {
      context.closePath()
    }
    return true
  }

  const [head, ...rest] = points
  if (!head) {
    return false
  }

  context.moveTo(head.x, head.y)
  rest.forEach((point) => context.lineTo(point.x, point.y))
  if (node.closed) {
    context.closePath()
  }
  return true
}

function drawShapeArrowheads(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineShapeNode,
  strokeColor: string,
  strokeWidth: number,
  rect: {x: number; y: number; width: number; height: number},
) {
  if (node.shape !== 'line' && node.shape !== 'path') {
    return
  }
  if (node.closed) {
    return
  }

  const segment = resolveShapeEndpointSegment(node, rect)
  if (!segment) {
    return
  }

  const size = Math.max(6, strokeWidth * 4)
  if (node.strokeStartArrowhead && node.strokeStartArrowhead !== 'none') {
    drawArrowhead(context, node.strokeStartArrowhead, {
      x: segment.start.x,
      y: segment.start.y,
      dx: segment.start.x - segment.next.x,
      dy: segment.start.y - segment.next.y,
      size,
      color: strokeColor,
      strokeWidth,
    })
  }
  if (node.strokeEndArrowhead && node.strokeEndArrowhead !== 'none') {
    drawArrowhead(context, node.strokeEndArrowhead, {
      x: segment.end.x,
      y: segment.end.y,
      dx: segment.end.x - segment.previous.x,
      dy: segment.end.y - segment.previous.y,
      size,
      color: strokeColor,
      strokeWidth,
    })
  }
}

function resolveShapeEndpointSegment(
  node: EngineShapeNode,
  rect: {x: number; y: number; width: number; height: number},
) {
  if (node.shape === 'line') {
    const start = {x: rect.x, y: rect.y}
    const end = {x: rect.x + rect.width, y: rect.y + rect.height}
    return {
      start,
      next: end,
      previous: start,
      end,
    }
  }

  const anchors = node.bezierPoints?.map((point) => point.anchor) ?? node.points ?? []
  if (anchors.length < 2) {
    return null
  }

  return {
    start: anchors[0],
    next: anchors[1],
    previous: anchors[anchors.length - 2],
    end: anchors[anchors.length - 1],
  }
}

function drawArrowhead(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  kind: NonNullable<EngineShapeNode['strokeStartArrowhead']>,
  options: {
    x: number
    y: number
    dx: number
    dy: number
    size: number
    color: string
    strokeWidth: number
  },
) {
  const length = Math.hypot(options.dx, options.dy)
  if (length <= 1e-6) {
    return
  }
  const ux = options.dx / length
  const uy = options.dy / length
  const nx = -uy
  const ny = ux
  const size = options.size
  const half = size * 0.5
  const backX = options.x + ux * size
  const backY = options.y + uy * size
  const leftX = backX + nx * half
  const leftY = backY + ny * half
  const rightX = backX - nx * half
  const rightY = backY - ny * half

  context.save()
  context.fillStyle = options.color
  context.strokeStyle = options.color
  context.lineWidth = Math.max(1, options.strokeWidth)
  context.beginPath()

  if (kind === 'triangle') {
    context.moveTo(options.x, options.y)
    context.lineTo(leftX, leftY)
    context.lineTo(rightX, rightY)
    context.closePath()
    context.fill()
    context.restore()
    return
  }

  if (kind === 'diamond') {
    const tipBackX = options.x + ux * size * 1.8
    const tipBackY = options.y + uy * size * 1.8
    context.moveTo(options.x, options.y)
    context.lineTo(leftX, leftY)
    context.lineTo(tipBackX, tipBackY)
    context.lineTo(rightX, rightY)
    context.closePath()
    context.fill()
    context.restore()
    return
  }

  if (kind === 'circle') {
    context.arc(options.x + ux * size * 0.75, options.y + uy * size * 0.75, half * 0.75, 0, Math.PI * 2)
    context.fill()
    context.restore()
    return
  }

  // `bar` fallback: draw a perpendicular cap line.
  context.moveTo(leftX, leftY)
  context.lineTo(rightX, rightY)
  context.stroke()
  context.restore()
}

function hasEllipseArc(node: EngineShapeNode) {
  if (node.shape !== 'ellipse') {
    return false
  }
  const start = node.ellipseStartAngle
  const end = node.ellipseEndAngle
  if (typeof start !== 'number' || typeof end !== 'number') {
    return false
  }
  const sweep = Math.abs(end - start) % 360
  return sweep > 1e-3 && sweep < 360 - 1e-3
}

function normalizeArcRange(start: number, end: number) {
  const tau = Math.PI * 2
  let delta = end - start
  while (delta <= -tau) {
    delta += tau
  }
  while (delta > tau) {
    delta -= tau
  }
  return {
    start,
    end: start + delta,
    anticlockwise: delta < 0,
  }
}

function toRadians(deg: number) {
  return (deg * Math.PI) / 180
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
    })
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

function appendRoundedRectPath(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rect: EngineRect,
  radius: number,
) {
  appendRectPathWithCornerRadii(context, rect, undefined, radius)
}

function appendRectPathWithCornerRadii(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rect: EngineRect,
  cornerRadii?: {
    topLeft?: number
    topRight?: number
    bottomRight?: number
    bottomLeft?: number
  },
  uniformRadius?: number,
) {
  const width = Math.abs(rect.width)
  const height = Math.abs(rect.height)
  const left = Math.min(rect.x, rect.x + rect.width)
  const top = Math.min(rect.y, rect.y + rect.height)
  const right = left + width
  const bottom = top + height
  const resolved = normalizeCornerRadii({
    topLeft: cornerRadii?.topLeft ?? uniformRadius ?? 0,
    topRight: cornerRadii?.topRight ?? uniformRadius ?? 0,
    bottomRight: cornerRadii?.bottomRight ?? uniformRadius ?? 0,
    bottomLeft: cornerRadii?.bottomLeft ?? uniformRadius ?? 0,
  }, width, height)

  context.moveTo(left + resolved.topLeft, top)
  context.lineTo(right - resolved.topRight, top)
  context.quadraticCurveTo(right, top, right, top + resolved.topRight)
  context.lineTo(right, bottom - resolved.bottomRight)
  context.quadraticCurveTo(right, bottom, right - resolved.bottomRight, bottom)
  context.lineTo(left + resolved.bottomLeft, bottom)
  context.quadraticCurveTo(left, bottom, left, bottom - resolved.bottomLeft)
  context.lineTo(left, top + resolved.topLeft)
  context.quadraticCurveTo(left, top, left + resolved.topLeft, top)
  context.closePath()
}

function normalizeCornerRadii(
  radii: {
    topLeft: number
    topRight: number
    bottomRight: number
    bottomLeft: number
  },
  width: number,
  height: number,
) {
  const maxRadius = Math.min(width, height) / 2
  let topLeft = clampRadius(radii.topLeft, maxRadius)
  let topRight = clampRadius(radii.topRight, maxRadius)
  let bottomRight = clampRadius(radii.bottomRight, maxRadius)
  let bottomLeft = clampRadius(radii.bottomLeft, maxRadius)

  // Keep radii pairs inside their edge lengths.
  const topScale = topLeft + topRight > width ? width / (topLeft + topRight) : 1
  const bottomScale = bottomLeft + bottomRight > width ? width / (bottomLeft + bottomRight) : 1
  const leftScale = topLeft + bottomLeft > height ? height / (topLeft + bottomLeft) : 1
  const rightScale = topRight + bottomRight > height ? height / (topRight + bottomRight) : 1
  const scale = Math.min(topScale, bottomScale, leftScale, rightScale)

  if (scale < 1) {
    topLeft *= scale
    topRight *= scale
    bottomRight *= scale
    bottomLeft *= scale
  }

  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  }
}

function clampRadius(value: number, maxRadius: number) {
  return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, maxRadius))
}

function drawTextSpan(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    fill?: string
    stroke?: string
    strokeWidth?: number
    letterSpacing?: number
  },
) {
  const letterSpacing = options.letterSpacing ?? 0
  if (letterSpacing === 0) {
    if (options.fill && options.fill !== 'transparent') {
      context.fillText(text, x, y)
    }
    if (options.stroke && options.strokeWidth && options.strokeWidth > 0) {
      context.strokeStyle = options.stroke
      context.lineWidth = options.strokeWidth
      context.strokeText(text, x, y)
    }
    return x + context.measureText(text).width
  }

  let cursorX = x
  for (const char of text) {
    if (options.fill && options.fill !== 'transparent') {
      context.fillText(char, cursorX, y)
    }
    if (options.stroke && options.strokeWidth && options.strokeWidth > 0) {
      context.strokeStyle = options.stroke
      context.lineWidth = options.strokeWidth
      context.strokeText(char, cursorX, y)
    }
    cursorX += context.measureText(char).width + letterSpacing
  }
  return cursorX
}

function applyTextStyle(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  style: EngineTextStyle,
) {
  const fontWeight = style.fontWeight ?? 400
  const fontStyle = style.fontStyle ?? 'normal'
  context.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`
  context.fillStyle = style.fill ?? '#111111'
  context.textAlign = resolveCanvasTextAlign(style.align)
}

function resolveCanvasTextAlign(
  align: EngineTextStyle['align'],
): CanvasTextAlign {
  switch (align) {
    case 'center':
      return 'center'
    case 'end':
      return 'right'
    case 'start':
    default:
      return 'left'
  }
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
