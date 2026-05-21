/**
 * Stores one staged native rect pipeline cache snapshot.
 */
export interface WebGPUStagedRectPipelineState {
  /** Stores cache key bound to the currently cached pipeline instance. */
  key: string | null
  /** Stores cached pipeline record for staged native rect rendering. */
  pipeline: unknown | null
}

/**
 * Resolves one staged native rect pipeline from cache or creates a new one.
 * @param state Mutable staged pipeline cache state.
 * @param format Current WebGPU canvas format.
 * @param createRenderPipeline Device createRenderPipeline callable.
 */
export function resolveOrCreateStagedRectPipeline(
  state: WebGPUStagedRectPipelineState,
  format: string,
  createRenderPipeline: (...args: unknown[]) => unknown,
): unknown {
  const cacheKey = resolveStagedRectPipelineCacheKey(
    format,
    resolveStagedRectVertexLayoutSignature(),
  )
  if (state.pipeline && state.key === cacheKey) {
    return state.pipeline
  }

  const nextPipeline = createRenderPipeline(resolveStagedRectPipelineDescriptor(format))
  state.pipeline = nextPipeline
  state.key = cacheKey
  return nextPipeline
}

/**
 * Resolves one cache key used by staged rect pipeline reuse.
 * @param format Current WebGPU canvas format.
 * @param vertexLayoutSignature Canonical staged vertex layout signature.
 */
function resolveStagedRectPipelineCacheKey(
  format: string,
  vertexLayoutSignature: string,
): string {
  return `staged-rect:${format}:${vertexLayoutSignature}`
}

/**
 * Resolves one canonical signature for staged rect vertex layout.
 */
function resolveStagedRectVertexLayoutSignature(): string {
  return 'pos2-f32x2-stride8'
}

/**
 * Builds one minimal render pipeline descriptor placeholder for staged rect path.
 * @param format Current WebGPU canvas format.
 */
function resolveStagedRectPipelineDescriptor(format: string): Record<string, unknown> {
  // AI-TEMP: staged native path still uses synthetic shader modules to keep deterministic tests stable; remove when production shader/module contracts are wired into native WebGPU rect pipeline; ref B3-webgpu-native-main-pass.
  return {
    label: 'venus-staged-rect-pipeline',
    layout: 'auto',
    vertex: {
      module: {label: 'venus-staged-rect-vertex-module'},
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: 8,
          stepMode: 'vertex',
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: {label: 'venus-staged-rect-fragment-module'},
      entryPoint: 'main',
      targets: [{format}],
    },
    primitive: {
      topology: 'triangle-list',
      frontFace: 'ccw',
      cullMode: 'none',
    },
  }
}
