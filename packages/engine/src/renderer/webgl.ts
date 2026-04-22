import type {
  EngineRenderFrame,
  EngineRenderer,
} from './types.ts'
import { createCanvas2DEngineRenderer } from './canvas2d.ts'
import { prepareEngineRenderPlan } from './plan.ts'
import { prepareEngineRenderInstanceView } from './instances.ts'
import { compileEngineWebGLPacketPlan } from './webglPackets.ts'
import { createEngineWebGLResourceBudgetTracker } from './webglResources.ts'
import type { EngineImageNode, EngineRenderableNode } from '../scene/types.ts'
import type { EngineTileConfig, EngineLodConfig, EngineInitialRenderConfig } from '../index.ts'
import { EngineTileCache } from './tileManager.ts'
import { EngineInitialRenderController } from './initialRender.ts'

interface WebGLEngineRendererOptions {
  id?: string
  canvas: HTMLCanvasElement | OffscreenCanvas
  enableCulling?: boolean
  clearColor?: readonly [number, number, number, number]
  antialias?: boolean
  modelCompleteComposite?: boolean
  // New: LOD configuration
  lod?: EngineLodConfig
  // New: Tile caching configuration
  tileConfig?: EngineTileConfig
  // New: Initial render optimization
  initialRender?: EngineInitialRenderConfig
}

/**
 * Built-in WebGL renderer entry for engine standalone/runtime integrations.
 *
 * Current stage keeps one shared plan+instance pipeline and a minimal clear
 * commit so Canvas2D/WebGL can evolve with the same front-half optimization
 * path before WebGL draw-program wiring lands.
 */
export function createWebGLEngineRenderer(
  options: WebGLEngineRendererOptions,
): EngineRenderer {
  const context = resolveWebGLContext(options.canvas, {
    antialias: options.antialias ?? true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  })
  if (!context) {
    throw new Error('webgl context is required for createWebGLEngineRenderer')
  }

  const clearColor = options.clearColor ?? [0, 0, 0, 0]
  const enableCulling = options.enableCulling ?? true
  const modelCompleteComposite = options.modelCompleteComposite ?? true
  const resourceBudget = createEngineWebGLResourceBudgetTracker()
  const pipeline = createWebGLQuadPipeline(context)
  const imageCache = new Map<string, CachedTextureEntry>()
  const textCache = new Map<string, CachedTextureEntry>()
  
  // Initialize tile cache (optional)
  const tileCache = options.tileConfig ? new EngineTileCache(options.tileConfig) : null
  
  // Initialize initial render controller (optional)
  const initialRenderController = options.initialRender
    ? new EngineInitialRenderController(options.initialRender)
    : null
  
  const modelSurface = createModelSurface(1, 1)
  if (!modelSurface) {
    throw new Error('webgl model-complete surface allocation failed')
  }
  const modelRenderer = createCanvas2DEngineRenderer({
    id: `${options.id ?? 'engine.renderer.webgl'}.model-canvas2d`,
    canvas: modelSurface.canvas,
    enableCulling,
    clearColor: 'transparent',
    imageSmoothing: true,
    imageSmoothingQuality: 'high',
  })
  const compositeTexture = context.createTexture()
  if (!compositeTexture) {
    throw new Error('webgl composite texture allocation failed')
  }
  context.bindTexture(context.TEXTURE_2D, compositeTexture)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  return {
    id: options.id ?? 'engine.renderer.webgl',
    capabilities: {
      backend: 'webgl',
      textRuns: modelCompleteComposite,
      imageClip: modelCompleteComposite,
      culling: enableCulling,
      lod: options.lod?.enabled ?? false,
    },
    resize: (width, height) => {
      if ('width' in options.canvas) {
        options.canvas.width = width
      }
      if ('height' in options.canvas) {
        options.canvas.height = height
      }
      modelRenderer.resize?.(width, height)
      context.viewport(0, 0, width, height)
    },
    render: async (frame: EngineRenderFrame) => {
      const startAt = performance.now()
      const interactiveQuality = frame.context.quality === 'interactive'

      // Apply initial render DPR optimization if configured
      let effectiveFrame = frame
      if (initialRenderController) {
        const dprForPhase = initialRenderController.getDprForPhase()
        if (dprForPhase !== 1.0) {
          // Apply low-DPR for preview phase
          effectiveFrame = {
            ...frame,
            context: {
              ...frame.context,
              pixelRatio: (frame.context.pixelRatio ?? 1) * dprForPhase,
            },
          }
        }
      }

      // Process dirty regions for incremental tile updates
      const dirtyRegionCount = effectiveFrame.context.dirtyRegions?.length ?? 0
      let dirtyTileCount = 0
      if (tileCache && effectiveFrame.context.dirtyRegions && effectiveFrame.context.dirtyRegions.length > 0) {
        // Apply dirty regions to tile cache
        for (const _dirtyRegion of effectiveFrame.context.dirtyRegions) {
          // Note: In a real implementation, would convert grid coords to world bounds
          // and call tileCache.invalidateTilesInBounds(bounds, zoomLevel)
          // TODO: Implement grid-to-world conversion and tile invalidation
          dirtyTileCount += 1
        }
        // After processing, clear dirty flags
        tileCache.clearDirtyFlags()
      }

      // Keep full-fidelity composite for settled frames, but fall back to the
      // packet pipeline during interaction so pan/zoom can keep frame pace.
      if (modelCompleteComposite && !interactiveQuality) {
        const modelStats = await modelRenderer.render(effectiveFrame)
        const compositeFrame: EngineRenderFrame = {
          ...effectiveFrame,
          viewport: {
            ...effectiveFrame.viewport,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          },
        }

        context.viewport(
          0,
          0,
          ('width' in options.canvas ? options.canvas.width : frame.viewport.viewportWidth),
          ('height' in options.canvas ? options.canvas.height : frame.viewport.viewportHeight),
        )
        context.enable(context.BLEND)
        context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA)
        context.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3])
        context.clear(context.COLOR_BUFFER_BIT)

        context.bindTexture(context.TEXTURE_2D, compositeTexture)
        context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
        try {
          context.texImage2D(
            context.TEXTURE_2D,
            0,
            context.RGBA,
            context.RGBA,
            context.UNSIGNED_BYTE,
            modelSurface.canvas as unknown as TexImageSource,
          )
        } catch {
          return {
            ...modelStats,
            frameMs: performance.now() - startAt,
          }
        }

        drawWebGLPacket(
          context,
          pipeline,
          compositeFrame,
          {
            x: 0,
            y: 0,
            width: frame.viewport.viewportWidth,
            height: frame.viewport.viewportHeight,
          },
          [1, 1, 1, 1],
          1,
          compositeTexture,
        )

        return {
          ...modelStats,
          drawCount: Math.max(1, modelStats.drawCount),
          webglRenderPath: 'model-complete',
          webglCompositeUploadBytes:
            Math.max(1, effectiveFrame.viewport.viewportWidth) *
            Math.max(1, effectiveFrame.viewport.viewportHeight) *
            Math.max(1, effectiveFrame.context.pixelRatio ?? 1) *
            Math.max(1, effectiveFrame.context.pixelRatio ?? 1) *
            4,
          webglInteractiveTextFallbackCount: 0,
          webglTextTextureUploadCount: 0,
          webglTextTextureUploadBytes: 0,
          webglTextCacheHitCount: 0,
          frameMs: performance.now() - startAt,
        }
      }

      const plan = prepareEngineRenderPlan(effectiveFrame)
      // Prepare typed-array instance payload once per frame so upcoming WebGL
      // draw pipelines can focus on upload/commit without repeating traversal.
      const instanceView = prepareEngineRenderInstanceView(effectiveFrame, plan)
      const packetPlan = compileEngineWebGLPacketPlan(plan, instanceView)

      let frameTextureEstimate = resourceBudget.getTextureBytes()
      for (const packet of packetPlan.packets) {
        if (packet.kind === 'image') {
          // Keep a conservative placeholder estimate so texture budgeting
          // behavior is active before concrete texture allocation lands.
          frameTextureEstimate += 4 * 1024 * 1024
        }
      }

      const budgetState = resourceBudget.recordFrameUsage({
        bufferBytes: packetPlan.uploadBytesEstimate,
        textureBytes: frameTextureEstimate,
      })

      if (budgetState.overTextureBudget) {
        if (budgetState.textureOverflowBytes > 0) {
          resourceBudget.evictLeastRecentlyUsedTextures(budgetState.textureOverflowBytes)
        }
      }

      context.viewport(
        0,
        0,
        ('width' in options.canvas ? options.canvas.width : frame.viewport.viewportWidth),
        ('height' in options.canvas ? options.canvas.height : frame.viewport.viewportHeight),
      )
      context.enable(context.BLEND)
      context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA)

      context.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3])
      context.clear(context.COLOR_BUFFER_BIT)

      // If there are text packets that require run-level fidelity, use the
      // canvas2d model renderer as a fallback compositor to produce accurate
      // text run output which we then upload to textures per-node.
      const needsModelTextComposite = !interactiveQuality && packetPlan.packets.some((p) => {
        if (p.kind !== 'text') return false
        const prepared = plan.preparedNodes[p.preparedIndex]
        return !!(prepared && prepared.node && prepared.node.type === 'text' && (prepared.node.runs && prepared.node.runs.length > 0))
      })

      if (needsModelTextComposite) {
        // Render the full model into the modelSurface canvas so we can crop
        // per-node text rects. Ignore returned stats.
        try {
          await modelRenderer.render(frame)
        } catch {
          // If modelRenderer fails, continue without text composite fallback.
        }
      }

      let drawCount = 0
      let interactiveTextFallbackCount = 0
      let textTextureUploadCount = 0
      let textTextureUploadBytes = 0
      let textCacheHitCount = 0
      for (const packet of packetPlan.packets) {
        const prepared = plan.preparedNodes[packet.preparedIndex]
        if (!prepared || !prepared.worldBounds) {
          continue
        }

        const node = prepared.node
        if (node.type === 'image') {
          const drawImageTexture = resolveImageTexture(
            context,
            frame,
            node,
            imageCache,
            resourceBudget,
          )
          drawCount += drawWebGLPacket(
            context,
            pipeline,
            frame,
            prepared.worldBounds,
            resolveNodeColor(node),
            packet.opacity,
            drawImageTexture,
          )
          continue
        }

        if (packet.kind === 'text') {
          if (interactiveQuality) {
            // Interactive mode prioritizes motion stability over text fidelity.
            // Draw a solid fallback quad and avoid per-node texture uploads.
            interactiveTextFallbackCount += 1
            drawCount += drawWebGLPacket(
              context,
              pipeline,
              effectiveFrame,
              prepared.worldBounds,
              resolveNodeColor(node),
              packet.opacity,
              null,
            )
            continue
          }

          // Try cached text texture first
          const cached = textCache.get(packet.nodeId)
          if (cached) {
            textCacheHitCount += 1
            resourceBudget.markTextureUsed(packet.nodeId)
            drawCount += drawWebGLPacket(
              context,
              pipeline,
              effectiveFrame,
              prepared.worldBounds,
              resolveNodeColor(node),
              packet.opacity,
              cached.texture,
            )
            continue
          }

          // If we have a modelSurface canvas from the canvas2d renderer,
          // crop the node rect and upload as texture.
          if (modelSurface && modelSurface.canvas) {
            const pixelRatio = effectiveFrame.context.pixelRatio ?? 1
            const sx = Math.round(prepared.worldBounds.x * pixelRatio)
            const sy = Math.round(prepared.worldBounds.y * pixelRatio)
            const sw = Math.max(1, Math.round(prepared.worldBounds.width * pixelRatio))
            const sh = Math.max(1, Math.round(prepared.worldBounds.height * pixelRatio))

            const cropped = createCanvasFromSource(modelSurface.canvas as unknown as HTMLCanvasElement, sx, sy, sw, sh)
            const texture = context.createTexture()
            if (texture) {
              context.bindTexture(context.TEXTURE_2D, texture)
              context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
              context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
              try {
                context.texImage2D(
                  context.TEXTURE_2D,
                  0,
                  context.RGBA,
                  context.RGBA,
                  context.UNSIGNED_BYTE,
                  cropped as unknown as TexImageSource,
                )
                textCache.set(packet.nodeId, {texture, width: sw, height: sh})
                resourceBudget.markTextureResident(packet.nodeId, sw * sh * 4)
                resourceBudget.markTextureUsed(packet.nodeId)
                textTextureUploadCount += 1
                textTextureUploadBytes += sw * sh * 4
                drawCount += drawWebGLPacket(
                  context,
                  pipeline,
                  effectiveFrame,
                  prepared.worldBounds,
                  resolveNodeColor(node),
                  packet.opacity,
                  texture,
                )
                continue
              } catch {
                context.deleteTexture(texture)
              }
            }
          }
        }

        // Fallback: draw a solid quad when no texture is available.
        drawCount += drawWebGLPacket(
          context,
          pipeline,
          effectiveFrame,
          prepared.worldBounds,
          resolveNodeColor(node),
          packet.opacity,
          null,
        )
      }

      // Mark text cache usage for LRU tracking
      for (const key of textCache.keys()) {
        resourceBudget.markTextureUsed(key)
      }

      // Collect tile and initial render diagnostics
      const tileStats = tileCache?.getStats()
      const initialRenderPhase = initialRenderController?.getPhase()
      const initialRenderProgress = initialRenderController?.getDetailPassProgress()

      return {
        drawCount,
        visibleCount: plan.stats.visibleCount,
        culledCount: plan.stats.culledCount,
        cacheHits: 0,
        cacheMisses: 0,
        frameReuseHits: 0,
        frameReuseMisses: 0,
        webglRenderPath: 'packet',
        webglCompositeUploadBytes: 0,
        webglInteractiveTextFallbackCount: interactiveTextFallbackCount,
        webglTextTextureUploadCount: textTextureUploadCount,
        webglTextTextureUploadBytes: textTextureUploadBytes,
        webglTextCacheHitCount: textCacheHitCount,
        tileCacheSize: tileStats?.tileCount,
        tileDirtyCount: tileStats?.dirtyCount,
        tileCacheTotalBytes: tileStats?.totalTextureBytes,
        initialRenderPhase: initialRenderPhase?.toString(),
        initialRenderProgress: initialRenderProgress,
        dirtyRegionCount: dirtyRegionCount,
        dirtyTileCount: dirtyTileCount,
        incrementalUpdateCount: dirtyTileCount > 0 ? 1 : 0,
        frameMs: performance.now() - startAt,
      }
    },
    dispose: () => {
      modelRenderer.dispose?.()
      context.deleteTexture(compositeTexture)
      for (const entry of imageCache.values()) {
        context.deleteTexture(entry.texture)
      }
      for (const entry of textCache.values()) {
        context.deleteTexture(entry.texture)
      }
      imageCache.clear()
      textCache.clear()
      disposeWebGLQuadPipeline(context, pipeline)
      // WebGL context lifecycle is owned by the host canvas environment.
    },
  }
}

function createModelSurface(width: number, height: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return {
      canvas: new OffscreenCanvas(width, height),
    }
  }

  if (typeof document !== 'undefined') {
    const element = document.createElement('canvas')
    element.width = width
    element.height = height
    return {
      canvas: element,
    }
  }

  return null
}

interface WebGLQuadPipeline {
  program: WebGLProgram
  positionBuffer: WebGLBuffer
  attributePosition: number
  uniformRect: WebGLUniformLocation
  uniformScale: WebGLUniformLocation
  uniformOffset: WebGLUniformLocation
  uniformViewport: WebGLUniformLocation
  uniformColor: WebGLUniformLocation
  uniformUseTexture: WebGLUniformLocation
  uniformSampler: WebGLUniformLocation
}

interface CachedTextureEntry {
  texture: WebGLTexture
  width: number
  height: number
}

function createWebGLQuadPipeline(
  context: WebGLRenderingContext | WebGL2RenderingContext,
): WebGLQuadPipeline {
  const vertexShader = createShader(context, context.VERTEX_SHADER, `
attribute vec2 aPosition;
uniform vec4 uRect;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform vec2 uViewport;
varying vec2 vUv;

void main() {
  vec2 world = uRect.xy + aPosition * uRect.zw;
  vec2 screen = vec2(world.x * uScale.x + uOffset.x, world.y * uScale.y + uOffset.y);
  vec2 clip = vec2(
    (screen.x / uViewport.x) * 2.0 - 1.0,
    1.0 - (screen.y / uViewport.y) * 2.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  vUv = aPosition;
}
`)
  const fragmentShader = createShader(context, context.FRAGMENT_SHADER, `
precision mediump float;
uniform vec4 uColor;
uniform float uUseTexture;
uniform sampler2D uSampler;
varying vec2 vUv;

void main() {
  vec4 color = uColor;
  if (uUseTexture > 0.5) {
    color = texture2D(uSampler, vUv);
  }
  gl_FragColor = color;
}
`)

  const program = createProgram(context, vertexShader, fragmentShader)
  const positionBuffer = context.createBuffer()
  if (!positionBuffer) {
    throw new Error('webgl position buffer allocation failed')
  }

  context.bindBuffer(context.ARRAY_BUFFER, positionBuffer)
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]),
    context.STATIC_DRAW,
  )

  const attributePosition = context.getAttribLocation(program, 'aPosition')
  const uniformRect = context.getUniformLocation(program, 'uRect')
  const uniformScale = context.getUniformLocation(program, 'uScale')
  const uniformOffset = context.getUniformLocation(program, 'uOffset')
  const uniformViewport = context.getUniformLocation(program, 'uViewport')
  const uniformColor = context.getUniformLocation(program, 'uColor')
  const uniformUseTexture = context.getUniformLocation(program, 'uUseTexture')
  const uniformSampler = context.getUniformLocation(program, 'uSampler')

  if (
    attributePosition < 0 ||
    !uniformRect ||
    !uniformScale ||
    !uniformOffset ||
    !uniformViewport ||
    !uniformColor ||
    !uniformUseTexture ||
    !uniformSampler
  ) {
    context.deleteBuffer(positionBuffer)
    context.deleteProgram(program)
    throw new Error('webgl quad pipeline uniforms/attributes are incomplete')
  }

  return {
    program,
    positionBuffer,
    attributePosition,
    uniformRect,
    uniformScale,
    uniformOffset,
    uniformViewport,
    uniformColor,
    uniformUseTexture,
    uniformSampler,
  }
}

function drawWebGLPacket(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  pipeline: WebGLQuadPipeline,
  frame: EngineRenderFrame,
  worldBounds: {x: number; y: number; width: number; height: number},
  color: readonly [number, number, number, number],
  opacity: number,
  texture: WebGLTexture | null,
) {
  const pixelRatio = frame.context.pixelRatio ?? 1

  context.useProgram(pipeline.program)
  context.bindBuffer(context.ARRAY_BUFFER, pipeline.positionBuffer)
  context.enableVertexAttribArray(pipeline.attributePosition)
  context.vertexAttribPointer(pipeline.attributePosition, 2, context.FLOAT, false, 0, 0)

  context.uniform4f(
    pipeline.uniformRect,
    worldBounds.x,
    worldBounds.y,
    Math.max(0, worldBounds.width),
    Math.max(0, worldBounds.height),
  )
  // Keep world->screen math in device-pixel space, matching Canvas2D path.
  context.uniform2f(
    pipeline.uniformScale,
    frame.viewport.scale * pixelRatio,
    frame.viewport.scale * pixelRatio,
  )
  context.uniform2f(
    pipeline.uniformOffset,
    frame.viewport.offsetX * pixelRatio,
    frame.viewport.offsetY * pixelRatio,
  )

  const viewportWidth = Math.max(1, frame.viewport.viewportWidth * pixelRatio)
  const viewportHeight = Math.max(1, frame.viewport.viewportHeight * pixelRatio)
  context.uniform2f(pipeline.uniformViewport, viewportWidth, viewportHeight)

  context.uniform4f(
    pipeline.uniformColor,
    color[0],
    color[1],
    color[2],
    color[3] * opacity,
  )

  if (texture) {
    context.activeTexture(context.TEXTURE0)
    context.bindTexture(context.TEXTURE_2D, texture)
    context.uniform1i(pipeline.uniformSampler, 0)
    context.uniform1f(pipeline.uniformUseTexture, 1)
  } else {
    context.uniform1f(pipeline.uniformUseTexture, 0)
  }

  context.drawArrays(context.TRIANGLE_STRIP, 0, 4)
  return 1
}

function resolveImageTexture(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  frame: EngineRenderFrame,
  node: EngineImageNode,
  imageCache: Map<string, CachedTextureEntry>,
  budget: ReturnType<typeof createEngineWebGLResourceBudgetTracker>,
) {
  const existing = imageCache.get(node.assetId)
  if (existing) {
    budget.markTextureUsed(node.assetId)
    return existing.texture
  }

  const source = frame.context.loader?.resolveImage(node.assetId)
  if (!source) {
    return null
  }

  const texture = context.createTexture()
  if (!texture) {
    return null
  }

  context.bindTexture(context.TEXTURE_2D, texture)
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)

  try {
    const textureSource = source as unknown as TexImageSource
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      textureSource,
    )
  } catch {
    context.deleteTexture(texture)
    return null
  }

  const size = resolveCanvasImageSourceSize(source)
  const width = Math.max(1, size.width)
  const height = Math.max(1, size.height)
  imageCache.set(node.assetId, {
    texture,
    width,
    height,
  })
  budget.markTextureResident(node.assetId, width * height * 4)
  budget.markTextureUsed(node.assetId)

  return texture
}

function resolveNodeColor(node: EngineRenderableNode): readonly [number, number, number, number] {
  if (node.type === 'shape') {
    return parseEngineColor(node.fill ?? node.stroke ?? '#9ca3af')
  }

  if (node.type === 'text') {
    return parseEngineColor(node.style.fill ?? '#111827')
  }

  return [1, 1, 1, 1]
}

function parseEngineColor(value: string): readonly [number, number, number, number] {
  const color = value.trim().toLowerCase()
  const named = NAMED_COLORS[color]
  if (named) {
    return named
  }

  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      return [r / 255, g / 255, b / 255, 1]
    }

    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      return [r / 255, g / 255, b / 255, a]
    }
  }

  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/)
  if (rgbaMatch) {
    const components = rgbaMatch[1]
      .split(',')
      .map((entry) => entry.trim())
    if (components.length === 3 || components.length === 4) {
      const r = clamp255(Number(components[0]))
      const g = clamp255(Number(components[1]))
      const b = clamp255(Number(components[2]))
      const a = components.length === 4 ? clamp01(Number(components[3])) : 1
      return [r / 255, g / 255, b / 255, a]
    }
  }

  return [0.5, 0.5, 0.5, 1]
}

const NAMED_COLORS: Record<string, readonly [number, number, number, number]> = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [1, 1, 1, 1],
  red: [1, 0, 0, 1],
  green: [0, 0.5, 0, 1],
  blue: [0, 0, 1, 1],
  yellow: [1, 1, 0, 1],
  gray: [0.5, 0.5, 0.5, 1],
  grey: [0.5, 0.5, 0.5, 1],
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(1, Math.max(0, value))
}

function clamp255(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(255, Math.max(0, value))
}

function resolveCanvasImageSourceSize(source: CanvasImageSource) {
  const candidate = source as {
    width?: number
    height?: number
    naturalWidth?: number
    naturalHeight?: number
    videoWidth?: number
    videoHeight?: number
  }

  const width =
    candidate.naturalWidth ??
    candidate.videoWidth ??
    candidate.width ??
    1
  const height =
    candidate.naturalHeight ??
    candidate.videoHeight ??
    candidate.height ??
    1

  return {
    width,
    height,
  }
}

function createShader(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
) {
  const shader = context.createShader(type)
  if (!shader) {
    throw new Error('webgl shader allocation failed')
  }

  context.shaderSource(shader, source)
  context.compileShader(shader)
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    const log = context.getShaderInfoLog(shader) ?? 'unknown error'
    context.deleteShader(shader)
    throw new Error(`webgl shader compile failed: ${log}`)
  }

  return shader
}

function createProgram(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = context.createProgram()
  if (!program) {
    context.deleteShader(vertexShader)
    context.deleteShader(fragmentShader)
    throw new Error('webgl program allocation failed')
  }

  context.attachShader(program, vertexShader)
  context.attachShader(program, fragmentShader)
  context.linkProgram(program)
  context.deleteShader(vertexShader)
  context.deleteShader(fragmentShader)

  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    const log = context.getProgramInfoLog(program) ?? 'unknown error'
    context.deleteProgram(program)
    throw new Error(`webgl program link failed: ${log}`)
  }

  return program
}

function disposeWebGLQuadPipeline(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  pipeline: WebGLQuadPipeline,
) {
  context.deleteBuffer(pipeline.positionBuffer)
  context.deleteProgram(pipeline.program)
}

function resolveWebGLContext(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  attributes: WebGLContextAttributes,
) {

  console.log(attributes);

  const webgl2 = canvas.getContext('webgl2', attributes) as WebGLRenderingContext | WebGL2RenderingContext | null
  if (webgl2) {
    return webgl2
  }
  

  return canvas.getContext('webgl', attributes) as WebGLRenderingContext | null
}

function createCanvasFromSource(
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
) {
  if (sw <= 0 || sh <= 0) {
    return null
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(sw, sh)
    const ctx = c.getContext('2d')
    if (!ctx) return c
    ctx.drawImage(source as CanvasImageSource, sx, sy, sw, sh, 0, 0, sw, sh)
    return c
  }

  if (typeof document !== 'undefined') {
    const el = document.createElement('canvas')
    el.width = sw
    el.height = sh
    const ctx = el.getContext('2d')
    if (ctx) {
      ctx.drawImage(source as unknown as CanvasImageSource, sx, sy, sw, sh, 0, 0, sw, sh)
    }
    return el
  }

  return null
}
