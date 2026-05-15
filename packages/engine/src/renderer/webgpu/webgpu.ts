import { createWebGLEngineRenderer } from '../webgl/index.ts'
import type { EngineRenderer } from '../types/index.ts'

/**
 * Creates one WebGPU renderer entrypoint backed by the shared WebGL adapter.
 * @param options Renderer creation options shared with the WebGL backend.
 */
export function createWebGPUEngineRenderer(
  options: Parameters<typeof createWebGLEngineRenderer>[0],
): EngineRenderer {
  // Use one stable adapter path so runtime/backend diagnostics can expose
  // WebGPU selection without forking render orchestration contracts.
  const webglRenderer = createWebGLEngineRenderer(options)

  return {
    id: webglRenderer.id.replace('webgl', 'webgpu-compat'),
    capabilities: {
      ...webglRenderer.capabilities,
      backend: 'webgpu',
    },
    init: webglRenderer.init
      ? async () => {
        return webglRenderer.init?.()
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
