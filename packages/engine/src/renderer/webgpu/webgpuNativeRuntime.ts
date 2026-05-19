import { createWebGLEngineRenderer } from '../webgl/index.ts'
import type { EngineRenderStats } from '../types/index.ts'
import type { EngineRenderableNode } from '../../scene/types/types.ts'
import {
  resolveOrCreateStagedRectPipeline,
  type WebGPUStagedRectPipelineState,
} from './webgpuStagedRectPipeline.ts'
import {
  resolveWebGPURectBatchClearValue,
  resolveWebGPURectBatchGeometryPayload,
  type WebGPURectBatchGeometryPayload,
} from './webgpuRectBatchGeometry.ts'

const WEBGPU_CONTEXT_ID = 'webgpu'
const WEBGPU_FALLBACK_FORMAT = 'bgra8unorm'

/**
 * Stores one reusable native WebGPU execution state snapshot.
 */
export interface WebGPUNativeState {
  /** WebGPU context record bound to the probe surface. */
  context: Record<string, unknown>
  /** Device record used for command encoder/queue submission. */
  device: Record<string, unknown>
  /** Queue record used for submit calls. */
  queue: Record<string, unknown>
  /** Preferred canvas format used for context configuration. */
  format: string
  /** Tracks whether one successful submit has happened. */
  submittedCount: number
  /** Tracks failed native submit attempts. */
  failedCount: number
  /** Stores staged native rect pipeline cache state for format-based reuse. */
  stagedRectPipeline: WebGPUStagedRectPipelineState
}

/**
 * Stores per-frame native pass attempt diagnostics.
 */
export interface WebGPUNativePassResult {
  /** True when one native pass submission was successfully executed. */
  submitted: boolean
  /** True when one native pass submission attempt failed. */
  failed: boolean
}

/**
 * Stores one WebGPU native rect-batch eligibility snapshot.
 */
export interface WebGPURectBatchEligibility {
  /** Number of shape nodes that pass native rect-batch constraints. */
  eligibleCount: number
  /** First rejection reason when native rect-batch cannot be used. */
  rejectedReason: NonNullable<EngineRenderStats['webgpuNativeRectBatchRejectedReason']>
}

/**
 * Initializes reusable native WebGPU state and executes one probe clear pass.
 * @param options Renderer creation options shared with the WebGL backend.
 */
export async function initializeWebGPUNativeState(
  options: Parameters<typeof createWebGLEngineRenderer>[0],
): Promise<WebGPUNativeState | null> {
  const probeSurface = resolveWebGPUProbeSurface(options)
  if (!probeSurface) {
    return null
  }

  const webgpuContext = resolveWebGPUContext(probeSurface)
  if (!webgpuContext) {
    return null
  }

  const gpuRecord = resolveWebGPUProviderRecord(webgpuContext)
  if (!gpuRecord) {
    return null
  }

  const requestAdapter = resolveCallable(gpuRecord, 'requestAdapter')
  if (!requestAdapter) {
    return null
  }

  const adapterCandidate = await requestAdapter.call(gpuRecord)
  const adapterRecord = resolveRecord(adapterCandidate)
  if (!adapterRecord) {
    return null
  }

  const requestDevice = resolveCallable(adapterRecord, 'requestDevice')
  if (!requestDevice) {
    return null
  }

  const deviceCandidate = await requestDevice.call(adapterRecord)
  const deviceRecord = resolveRecord(deviceCandidate)
  if (!deviceRecord) {
    return null
  }

  const getPreferredCanvasFormat = resolveCallable(gpuRecord, 'getPreferredCanvasFormat')
  const preferredFormat = getPreferredCanvasFormat
    ? String(getPreferredCanvasFormat.call(gpuRecord))
    : WEBGPU_FALLBACK_FORMAT
  const configure = resolveCallable(webgpuContext, 'configure')
  if (!configure) {
    return null
  }

  configure.call(webgpuContext, {
    device: deviceCandidate,
    format: preferredFormat,
    alphaMode: 'premultiplied',
  })

  const queueRecord = resolveRecord(deviceRecord['queue'])
  if (!queueRecord) {
    return null
  }

  const nativeState: WebGPUNativeState = {
    context: webgpuContext,
    device: deviceRecord,
    queue: queueRecord,
    format: preferredFormat,
    submittedCount: 0,
    failedCount: 0,
    stagedRectPipeline: {
      key: null,
      pipeline: null,
    },
  }

  const probeResult = submitWebGPUNativePass(nativeState)
  if (probeResult.failed) {
    return null
  }

  return nativeState
}

/**
 * Submits one minimal native WebGPU rect-batch pass for eligible rect-only scenes.
 * @param state Initialized native WebGPU state.
 * @param nodes Scene node list from the current frame.
 */
export function submitWebGPUNativeRectBatchPass(
  state: WebGPUNativeState | null,
  nodes: readonly EngineRenderableNode[],
): WebGPUNativePassResult {
  if (!state) {
    return {
      submitted: false,
      failed: false,
    }
  }

  const clearValue = resolveWebGPURectBatchClearValue(nodes)
  const geometryPayload = resolveWebGPURectBatchGeometryPayload(nodes)
  return submitWebGPUNativePassWithClearValue(state, clearValue, geometryPayload)
}

/**
 * Submits one minimal native WebGPU clear pass for execution-path diagnostics.
 * @param state Initialized native WebGPU state.
 */
export function submitWebGPUNativePass(
  state: WebGPUNativeState | null,
): WebGPUNativePassResult {
  return submitWebGPUNativePassWithClearValue(state, {r: 0, g: 0, b: 0, a: 0})
}

/**
 * Resolves whether current scene nodes can run through native WebGPU rect-batch path.
 * @param nodes Scene node list from the current frame.
 */
export function resolveWebGPURectBatchEligibility(
  nodes: readonly EngineRenderableNode[],
): WebGPURectBatchEligibility {
  if (nodes.length === 0) {
    return {
      eligibleCount: 0,
      rejectedReason: 'scene-empty',
    }
  }

  let eligibleCount = 0
  for (const node of nodes) {
    if (node.type === 'group') {
      return {
        eligibleCount,
        rejectedReason: 'group-node-unsupported',
      }
    }

    if (node.type !== 'shape') {
      return {
        eligibleCount,
        rejectedReason: 'non-shape-node-unsupported',
      }
    }

    if (node.shape !== 'rect') {
      return {
        eligibleCount,
        rejectedReason: 'non-rect-shape-unsupported',
      }
    }

    if (node.transform || node.stroke || node.strokeWidth || node.shadow || node.clip || node.blendMode) {
      return {
        eligibleCount,
        rejectedReason: node.transform
          ? 'shape-transform-unsupported'
          : 'shape-style-unsupported',
      }
    }

    eligibleCount += 1
  }

  return {
    eligibleCount,
    rejectedReason: 'none',
  }
}

/**
 * Submits one native WebGPU pass with the provided clear color payload.
 * @param state Initialized native WebGPU state.
 * @param clearValue Clear color payload forwarded to beginRenderPass.
 * @param drawPayload Optional staged rect geometry payload used for buffer sizing and draw emission.
 */
function submitWebGPUNativePassWithClearValue(
  state: WebGPUNativeState | null,
  clearValue: {r: number; g: number; b: number; a: number},
  drawPayload: WebGPURectBatchGeometryPayload | null = null,
): WebGPUNativePassResult {
  if (!state) {
    return {
      submitted: false,
      failed: false,
    }
  }

  try {
    const submit = resolveCallable(state.queue, 'submit')
    const writeBuffer = resolveCallable(state.queue, 'writeBuffer')
    const createCommandEncoder = resolveCallable(state.device, 'createCommandEncoder')
    const getCurrentTexture = resolveCallable(state.context, 'getCurrentTexture')
    if (!submit || !createCommandEncoder || !getCurrentTexture) {
      state.failedCount += 1
      return {
        submitted: false,
        failed: true,
      }
    }

    const encoderRecord = resolveRecord(createCommandEncoder.call(state.device))
    const textureRecord = resolveRecord(getCurrentTexture.call(state.context))
    const createView = textureRecord ? resolveCallable(textureRecord, 'createView') : null
    const beginRenderPass = encoderRecord ? resolveCallable(encoderRecord, 'beginRenderPass') : null
    const finish = encoderRecord ? resolveCallable(encoderRecord, 'finish') : null
    if (!encoderRecord || !textureRecord || !createView || !beginRenderPass || !finish) {
      state.failedCount += 1
      return {
        submitted: false,
        failed: true,
      }
    }

    const passEncoderRecord = resolveRecord(beginRenderPass.call(encoderRecord, {
      colorAttachments: [{
        view: createView.call(textureRecord),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue,
      }],
    }))
    const draw = passEncoderRecord ? resolveCallable(passEncoderRecord, 'draw') : null
    const drawIndexed = passEncoderRecord ? resolveCallable(passEncoderRecord, 'drawIndexed') : null
    const setPipeline = passEncoderRecord ? resolveCallable(passEncoderRecord, 'setPipeline') : null
    const setVertexBuffer = passEncoderRecord ? resolveCallable(passEncoderRecord, 'setVertexBuffer') : null
    const setIndexBuffer = passEncoderRecord ? resolveCallable(passEncoderRecord, 'setIndexBuffer') : null
    const end = passEncoderRecord ? resolveCallable(passEncoderRecord, 'end') : null
    if (!end) {
      state.failedCount += 1
      return {
        submitted: false,
        failed: true,
      }
    }

    const drawIndexCount = drawPayload?.indexData.length ?? 0
    if (drawIndexCount > 0) {
      if (!drawPayload) {
        state.failedCount += 1
        return {
          submitted: false,
          failed: true,
        }
      }

      if (!draw) {
        state.failedCount += 1
        return {
          submitted: false,
          failed: true,
        }
      }

      const createRenderPipeline = resolveCallable(state.device, 'createRenderPipeline')
      const createBuffer = resolveCallable(state.device, 'createBuffer')
      // AI-TEMP: stage minimal pipeline+buffer binding to exercise native draw plumbing before full shader/material pipeline lands; remove when production rect pipeline owns setup/bind; ref B3-webgpu-native-main-pass.
      if (createRenderPipeline && createBuffer && setPipeline && setVertexBuffer && setIndexBuffer) {
        const pipeline = resolveOrCreateStagedRectPipeline(
          state.stagedRectPipeline,
          state.format,
          (...args: unknown[]) => createRenderPipeline.call(state.device, ...args),
        )
        const vertexBuffer = createBuffer.call(state.device, {
          size: Math.max(drawPayload?.vertexData.byteLength ?? 0, 4),
          usage: 0,
        })
        const indexBuffer = createBuffer.call(state.device, {
          size: Math.max(drawPayload?.indexData.byteLength ?? 0, 2),
          usage: 0,
        })
        uploadWebGPURectBatchPayload(writeBuffer, vertexBuffer, indexBuffer, drawPayload)
        setPipeline.call(passEncoderRecord, pipeline)
        setVertexBuffer.call(passEncoderRecord, 0, vertexBuffer)
        setIndexBuffer.call(passEncoderRecord, indexBuffer, 'uint16')
      }

      if (drawIndexed) {
        drawIndexed.call(passEncoderRecord, drawIndexCount)
      } else {
        // AI-TEMP: keep compatibility fallback to draw for runtimes lacking drawIndexed in staged harness; remove when all supported runtimes expose drawIndexed; ref B3-webgpu-native-main-pass.
        draw.call(passEncoderRecord, drawPayload?.compatibilityDrawVertexCount ?? 0)
      }
    }

    end.call(passEncoderRecord)
    submit.call(state.queue, [finish.call(encoderRecord)])
    state.submittedCount += 1
    return {
      submitted: true,
      failed: false,
    }
  } catch {
    state.failedCount += 1
    return {
      submitted: false,
      failed: true,
    }
  }
}

/**
 * Uploads staged rect vertex/index payload into created WebGPU buffers when queue writeBuffer is available.
 * @param writeBuffer Queue writeBuffer callable resolved from native queue.
 * @param vertexBuffer Created staged vertex buffer token.
 * @param indexBuffer Created staged index buffer token.
 * @param drawPayload Staged geometry payload for the current frame.
 */
function uploadWebGPURectBatchPayload(
  writeBuffer: ((...args: unknown[]) => unknown) | null,
  vertexBuffer: unknown,
  indexBuffer: unknown,
  drawPayload: WebGPURectBatchGeometryPayload,
): void {
  // AI-TEMP: keep upload optional because compatibility harnesses may omit queue.writeBuffer; remove when runtime baseline guarantees writeBuffer availability; ref B3-webgpu-native-main-pass.
  if (!writeBuffer) {
    return
  }

  writeBuffer(vertexBuffer, 0, drawPayload.vertexData)
  writeBuffer(indexBuffer, 0, drawPayload.indexData)
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
 * Resolves one GPU provider record from navigator.gpu or WebGPU context fallbacks.
 * @param webgpuContext WebGPU context used during native initialization.
 */
function resolveWebGPUProviderRecord(
  webgpuContext: Record<string, unknown>,
): Record<string, unknown> | null {
  const navigatorRecord = resolveRecord((globalThis as Record<string, unknown>)['navigator'])
  const navigatorGpuRecord = navigatorRecord ? resolveRecord(navigatorRecord['gpu']) : null
  if (navigatorGpuRecord && resolveCallable(navigatorGpuRecord, 'requestAdapter')) {
    return navigatorGpuRecord
  }

  const contextGpuRecord = resolveRecord(webgpuContext['gpu'])
  if (contextGpuRecord && resolveCallable(contextGpuRecord, 'requestAdapter')) {
    return contextGpuRecord
  }

  const contextRequestAdapter = resolveCallable(webgpuContext, 'requestAdapter')
  if (!contextRequestAdapter) {
    return null
  }

  // AI-TEMP: promote context-level adapter request as compatibility fallback for constrained runtimes; remove when test/runtime environments expose stable navigator.gpu; ref B3-webgpu-native-main-pass.
  return {
    requestAdapter: contextRequestAdapter,
    getPreferredCanvasFormat: resolveCallable(webgpuContext, 'getPreferredCanvasFormat')
      ?? (() => WEBGPU_FALLBACK_FORMAT),
  }
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
