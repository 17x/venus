import type {
  EngineRenderFrame,
  EngineRenderer,
} from './types.ts'
import {
  prepareEngineRenderPlan,
  type EngineWorldMatrix,
} from './plan.ts'
import type {
  EngineClipShape,
  EngineImageNode,
  EngineNodeBase,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineTextNode,
  EngineTextStyle,
} from '../scene/types.ts'

interface Canvas2DEngineRendererOptions {
  id?: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  enableCulling?: boolean
  clearColor?: string
}

interface RenderCounters {
  drawCount: number
  visibleCount: number
  culledCount: number
  cacheHits: number
  cacheMisses: number
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
  const context = options.canvas.getContext('2d')
  if (!context) {
    throw new Error('canvas2d context is required for createCanvas2DEngineRenderer')
  }

  const enableCulling = options.enableCulling ?? true
  const clearColor = options.clearColor ?? 'transparent'

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
      const nodeIndex = buildNodeIndex(frame.scene)
      const worldBoundsById = buildWorldBoundsMap(plan.preparedNodes)
      clearCanvas(context, options.canvas, clearColor)
      applyViewportMatrix(context, frame.viewport.matrix)

      for (const index of plan.drawList) {
        const prepared = plan.preparedNodes[index]
        drawPreparedNode(context, prepared.node, prepared.worldMatrix, frame, nodeIndex, worldBoundsById, counters)
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

function applyViewportMatrix(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  matrix: readonly [number, number, number, number, number, number, number, number, number],
) {
  context.setTransform(matrix[0], matrix[3], matrix[1], matrix[4], matrix[2], matrix[5])
}

function drawPreparedNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineRenderableNode,
  worldMatrix: EngineWorldMatrix,
  frame: EngineRenderFrame,
  nodeIndex: Map<string, EngineRenderableNode>,
  worldBoundsById: Map<string, EngineRect>,
  counters: RenderCounters,
) {
  context.save()

  applyNodeOpacity(context, node)
  applyWorldTransform(context, worldMatrix)
  applyNodeClip(context, node, nodeIndex, worldBoundsById)

  switch (node.type) {
    case 'text':
      drawTextNode(context, node)
      counters.drawCount += 1
      break
    case 'image':
      drawImageNode(context, node, frame, counters)
      break
    default:
      break
  }

  context.restore()
}

function drawTextNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineTextNode,
) {
  applyTextStyle(context, node.style)
  context.textBaseline = 'top'

  const baseText = node.text ?? ''
  if (node.runs && node.runs.length > 0) {
    let cursorX = node.x
    const baselineY = node.y
    for (const run of node.runs) {
      applyTextStyle(context, {
        ...node.style,
        ...run.style,
      })
      context.fillText(run.text, cursorX, baselineY)
      cursorX += context.measureText(run.text).width
    }
    return
  }

  context.fillText(baseText, node.x, node.y)
}

function drawImageNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineImageNode,
  frame: EngineRenderFrame,
  counters: RenderCounters,
) {
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
      node.x,
      node.y,
      node.width,
      node.height,
    )
    counters.drawCount += 1
    return
  }

  context.drawImage(source, node.x, node.y, node.width, node.height)
  counters.drawCount += 1
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

function applyWorldTransform(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  matrix: EngineWorldMatrix,
) {
  context.transform(matrix[0], matrix[3], matrix[1], matrix[4], matrix[2], matrix[5])
}

function applyNodeClip(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineNodeBase,
  nodeIndex: Map<string, EngineRenderableNode>,
  worldBoundsById: Map<string, EngineRect>,
) {
  const clipShape = node.clip?.clipShape
  if (clipShape) {
    applyClipShape(context, clipShape)
    return
  }

  const clipNodeId = node.clip?.clipNodeId
  if (!clipNodeId) {
    return
  }

  const targetNode = nodeIndex.get(clipNodeId)
  if (!targetNode) {
    return
  }

  const bounds = worldBoundsById.get(targetNode.id)
  if (!bounds) {
    return
  }

  context.beginPath()
  context.rect(bounds.x, bounds.y, bounds.width, bounds.height)
  context.clip()
}

function applyClipShape(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  clip: EngineClipShape,
) {
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

  context.clip()
}

function appendRoundedRectPath(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rect: EngineRect,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, Math.min(rect.width, rect.height) / 2))
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height

  context.moveTo(rect.x + safeRadius, rect.y)
  context.lineTo(right - safeRadius, rect.y)
  context.quadraticCurveTo(right, rect.y, right, rect.y + safeRadius)
  context.lineTo(right, bottom - safeRadius)
  context.quadraticCurveTo(right, bottom, right - safeRadius, bottom)
  context.lineTo(rect.x + safeRadius, bottom)
  context.quadraticCurveTo(rect.x, bottom, rect.x, bottom - safeRadius)
  context.lineTo(rect.x, rect.y + safeRadius)
  context.quadraticCurveTo(rect.x, rect.y, rect.x + safeRadius, rect.y)
  context.closePath()
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

function buildNodeIndex(scene: EngineSceneSnapshot) {
  const index = new Map<string, EngineRenderableNode>()

  const visit = (node: EngineRenderableNode) => {
    index.set(node.id, node)
    if (node.type === 'group') {
      for (const child of node.children) {
        visit(child)
      }
    }
  }

  for (const node of scene.nodes) {
    visit(node)
  }

  return index
}

function buildWorldBoundsMap(
  preparedNodes: Array<{node: EngineRenderableNode; worldBounds: EngineRect | null}>,
) {
  const map = new Map<string, EngineRect>()
  for (const entry of preparedNodes) {
    if (entry.worldBounds) {
      map.set(entry.node.id, entry.worldBounds)
    }
  }
  return map
}
