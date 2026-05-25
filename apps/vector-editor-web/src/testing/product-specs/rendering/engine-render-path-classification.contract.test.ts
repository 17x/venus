import {strict as assert} from 'node:assert'
import test from 'node:test'

import {
  resolveEngineBackendRenderPaths,
} from '../../../runtime/engine-bridge/internal/engineRenderer/engineRenderPathClassification.ts'

/**
 * Verifies empty WebGL frames classify as none when fallback diagnostics are absent.
 */
test('engine render-path classifier reports none for empty webgl frames', () => {
  const result = resolveEngineBackendRenderPaths({
    backendResolved: 'webgl',
    drawCount: 0,
    visibleCount: 0,
    backendPresentCompleted: true,
  })

  assert.equal(result.webglRenderPath, 'none')
  assert.equal(result.webgpuRenderPath, 'hybrid-webgl')
})

/**
 * Verifies WebGPU frames downgrade to hybrid fallback when native present does not complete.
 */
test('engine render-path classifier reports hybrid fallback for incomplete webgpu present', () => {
  const result = resolveEngineBackendRenderPaths({
    backendResolved: 'webgpu',
    drawCount: 12,
    visibleCount: 18,
    backendPresentCompleted: false,
  })

  assert.equal(result.webgpuRenderPath, 'hybrid-webgl')
  assert.equal(result.webglRenderPath, 'none')
})

/**
 * Verifies backend-provided path diagnostics keep precedence over derived fallback classification.
 */
test('engine render-path classifier preserves backend diagnostics precedence', () => {
  const result = resolveEngineBackendRenderPaths({
    backendResolved: 'webgpu',
    drawCount: 0,
    visibleCount: 0,
    backendPresentCompleted: false,
    backendWebglRenderPath: 'model-complete',
    backendWebgpuRenderPath: 'native-model-complete',
  })

  assert.equal(result.webglRenderPath, 'model-complete')
  assert.equal(result.webgpuRenderPath, 'native-model-complete')
})
