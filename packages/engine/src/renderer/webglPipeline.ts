import type { EngineRenderFrame } from './types.ts'

export interface WebGLQuadPipeline {
  program: WebGLProgram
  positionBuffer: WebGLBuffer
  attributePosition: number
  uniformRect: WebGLUniformLocation
  uniformScale: WebGLUniformLocation
  uniformOffset: WebGLUniformLocation
  uniformViewport: WebGLUniformLocation
  uniformColor: WebGLUniformLocation
  uniformUseTexture: WebGLUniformLocation
  uniformFlipTextureY: WebGLUniformLocation
  uniformSampler: WebGLUniformLocation
}

export function createViewportMatrixForRender(
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  // WebGL packet path expects viewport.matrix to match scale/offset overrides.
  return [
    scale, 0, offsetX,
    0, scale, offsetY,
    0, 0, 1,
  ] as const
}

export function createWebGLQuadPipeline(
  context: WebGLRenderingContext | WebGL2RenderingContext,
): WebGLQuadPipeline {
  const vertexShader = createShader(context, context.VERTEX_SHADER, `
attribute vec2 aPosition;
uniform vec4 uRect;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform vec2 uViewport;
uniform float uFlipTextureY;
varying vec2 vUv;

void main() {
  vec2 world = uRect.xy + aPosition * uRect.zw;
  vec2 screen = vec2(world.x * uScale.x + uOffset.x, world.y * uScale.y + uOffset.y);
  vec2 clip = vec2(
    (screen.x / uViewport.x) * 2.0 - 1.0,
    1.0 - (screen.y / uViewport.y) * 2.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  vUv = vec2(aPosition.x, mix(aPosition.y, 1.0 - aPosition.y, uFlipTextureY));
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
  const uniformFlipTextureY = context.getUniformLocation(program, 'uFlipTextureY')
  const uniformSampler = context.getUniformLocation(program, 'uSampler')

  if (
    attributePosition < 0 ||
    !uniformRect ||
    !uniformScale ||
    !uniformOffset ||
    !uniformViewport ||
    !uniformColor ||
    !uniformUseTexture ||
    !uniformFlipTextureY ||
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
    uniformFlipTextureY,
    uniformSampler,
  }
}

export function drawWebGLPacket(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  pipeline: WebGLQuadPipeline,
  frame: EngineRenderFrame,
  worldBounds: {x: number; y: number; width: number; height: number},
  color: readonly [number, number, number, number],
  opacity: number,
  texture: WebGLTexture | null,
  flipTextureY = false,
) {
  const pixelRatio = frame.context.outputPixelRatio ?? frame.context.pixelRatio ?? 1

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
  context.uniform1f(pipeline.uniformFlipTextureY, flipTextureY ? 1 : 0)

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

export function disposeWebGLQuadPipeline(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  pipeline: WebGLQuadPipeline,
) {
  context.deleteBuffer(pipeline.positionBuffer)
  context.deleteProgram(pipeline.program)
}

export function resolveWebGLContext(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  attributes: WebGLContextAttributes,
) {
  const webgl2 = canvas.getContext('webgl2', attributes) as WebGLRenderingContext | WebGL2RenderingContext | null
  if (webgl2) {
    return webgl2
  }

  return canvas.getContext('webgl', attributes) as WebGLRenderingContext | null
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
