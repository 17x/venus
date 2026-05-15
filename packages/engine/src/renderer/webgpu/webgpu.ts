import { createWebGLEngineRenderer } from '../webgl/index.ts'
import type { EngineRenderer } from '../types/index.ts'

const WEBGPU_CONTEXT_ID = 'webgpu'

/**
 * Creates one WebGPU renderer entrypoint with native-probe lifecycle and shared WebGL fallback rendering.
 * @param options Renderer creation options shared with the WebGL backend.
 */
export function createWebGPUEngineRenderer(
  options: Parameters<typeof createWebGLEngineRenderer>[0],
): EngineRenderer {
  // Keep output behavior stable through shared WebGL rendering while this
  // module incrementally grows native WebGPU execution coverage.
  const webglRenderer = createWebGLEngineRenderer(options)

  return {
    id: webglRenderer.id.replace('webgl', 'webgpu-hybrid'),
    capabilities: {
      ...webglRenderer.capabilities,
      backend: 'webgpu',
    },
    init: webglRenderer.init
      ? async () => {
        await webglRenderer.init?.()
        await probeWebGPUNativeExecution(options)
      }
      : undefined,
    resize: webglRenderer.resize
      ? (size) => {
        webglRenderer.resize?.(size)
      }
      : undefined,
    setInteractionPreview: webglRenderer.setInteractionPreview
      ? (config) => {
        webglRenderer.setInteractionPreview?.(config)
      }
      : undefined,
    render: async (frame) => {
      return webglRenderer.render(frame)
    },
    dispose: webglRenderer.dispose
      ? () => {
        webglRenderer.dispose?.()
      }
      : undefined,
  }
}

/**
 * Probes WebGPU context/device initialization and executes one no-op clear pass.
 * @param options Renderer creation options shared with the WebGL backend.
 */
async function probeWebGPUNativeExecution(
  options: Parameters<typeof createWebGLEngineRenderer>[0],
): Promise<void> {
  const probeSurface = resolveWebGPUProbeSurface(options)
  if (!probeSurface) {
    return
  }

  const webgpuContext = resolveWebGPUContext(probeSurface)
  if (!webgpuContext) {
    return
  }

  const navigatorRecord = resolveRecord((globalThis as Record<string, unknown>)['navigator'])
  const gpuRecord = navigatorRecord ? resolveRecord(navigatorRecord['gpu']) : null
  if (!gpuRecord) {
    return
  }

  const requestAdapter = gpuRecord ? resolveCallable(gpuRecord, 'requestAdapter') : null
  if (!requestAdapter) {
    return
  }

  const adapterCandidate = await requestAdapter.call(gpuRecord)
  const adapterRecord = resolveRecord(adapterCandidate)
  if (!adapterRecord) {
    return
  }

  const requestDevice = adapterRecord ? resolveCallable(adapterRecord, 'requestDevice') : null
  if (!requestDevice) {
    return
  }

  const deviceCandidate = await requestDevice.call(adapterRecord)
  const deviceRecord = resolveRecord(deviceCandidate)
  if (!deviceRecord) {
    return
  }

  const getPreferredCanvasFormat = resolveCallable(gpuRecord, 'getPreferredCanvasFormat')
  const preferredFormat = getPreferredCanvasFormat
    ? String(getPreferredCanvasFormat.call(gpuRecord))
    : 'bgra8unorm'
  const configure = resolveCallable(webgpuContext, 'configure')
  if (!configure) {
    return
  }

  configure.call(webgpuContext, {
    device: deviceCandidate,
    format: preferredFormat,
    alphaMode: 'premultiplied',
  })

  const queueRecord = resolveRecord(deviceRecord['queue'])
  const submit = queueRecord ? resolveCallable(queueRecord, 'submit') : null
  const createCommandEncoder = resolveCallable(deviceRecord, 'createCommandEncoder')
  const getCurrentTexture = resolveCallable(webgpuContext, 'getCurrentTexture')
  if (!submit || !createCommandEncoder || !getCurrentTexture) {
    return
  }

  const encoderRecord = resolveRecord(createCommandEncoder.call(deviceRecord))
  const textureRecord = resolveRecord(getCurrentTexture.call(webgpuContext))
  const createView = textureRecord ? resolveCallable(textureRecord, 'createView') : null
  const beginRenderPass = encoderRecord ? resolveCallable(encoderRecord, 'beginRenderPass') : null
  const finish = encoderRecord ? resolveCallable(encoderRecord, 'finish') : null
  if (!encoderRecord || !createView || !beginRenderPass || !finish) {
    return
  }

  const passEncoderRecord = resolveRecord(beginRenderPass.call(encoderRecord, {
    colorAttachments: [{
      view: createView.call(textureRecord),
      loadOp: 'clear',
      storeOp: 'store',
      clearValue: {r: 0, g: 0, b: 0, a: 0},
    }],
  }))
  const end = passEncoderRecord ? resolveCallable(passEncoderRecord, 'end') : null
  if (!end) {
    return
  }

  end.call(passEncoderRecord)
  submit.call(queueRecord, [finish.call(encoderRecord)])
}

/**
 * Resolves the canvas surface used by WebGPU probe initialization.
 * @param options Renderer creation options shared with the WebGL backend.
 */
function resolveWebGPUProbeSurface(
  options: Parameters<typeof createWebGLEngineRenderer>[0],
): HTMLCanvasElement | OffscreenCanvas | null {
  if (options.createCanvasSurface) {
    const createdSurface = options.createCanvasSurface(1, 1)
    if (createdSurface) {
      return createdSurface
    }
  }

  return options.canvas
}

/**
 * Resolves one WebGPU canvas context from the provided surface when available.
 * @param surface Canvas surface used for context lookup.
 */
function resolveWebGPUContext(
  surface: HTMLCanvasElement | OffscreenCanvas,
): Record<string, unknown> | null {
  const contextGetter = (surface as unknown as {getContext?: (contextId: string) => unknown}).getContext
  if (!contextGetter) {
    return null
  }

  const context = contextGetter(WEBGPU_CONTEXT_ID)
  return resolveRecord(context)
}

/**
 * Resolves one record-like object from unknown values.
 * @param value Candidate value.
 */
function resolveRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

/**
 * Resolves one callable function from record fields.
 * @param record Record that should contain callable field.
 * @param key Property key expected to hold callable field.
 */
function resolveCallable(
  record: Record<string, unknown>,
  key: string,
): ((...args: unknown[]) => unknown) | null {
  const candidate = record[key]
  if (typeof candidate !== 'function') {
    return null
  }

  return candidate as (...args: unknown[]) => unknown
}
