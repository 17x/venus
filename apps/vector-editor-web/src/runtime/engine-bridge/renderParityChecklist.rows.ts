import type {RenderParityChecklistRow} from './renderParityChecklist.ts'

/**
 * Builds deterministic baseline checklist rows used by parity reports.
 */
export function createBaselineRenderParityChecklistRows(): RenderParityChecklistRow[] {
  return [
    {
      id: 'line-path-polygon-bezier-parity',
      feature: 'Line/Path/Polygon/Bezier parity',
      category: 'geometry',
      webgl: {
        status: 'degraded',
        reason: 'WebGL packet fallback path can bypass model-complete geometry fidelity in interactive frames.',
        evidenceSignals: ['webglRenderPath', 'cacheFallbackReason'],
      },
      webgpu: {
        status: 'degraded',
        reason: 'Current native WebGPU path is rect-batch oriented and falls back for non-rect/vector geometry.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason'],
      },
    },
    {
      id: 'text-run-rich-typography-parity',
      feature: 'Text run and rich typography parity',
      category: 'text-image',
      webgl: {
        status: 'degraded',
        reason: 'Interactive text fallback/deferred uploads indicate non-uniform text path quality under pressure.',
        evidenceSignals: ['webglInteractiveTextFallbackCount', 'webglDeferredTextTextureCount'],
      },
      webgpu: {
        status: 'degraded',
        reason: 'WebGPU native path still leans on hybrid fallback for full text semantics.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason', 'webgpuFeatureCapabilityGateReason'],
      },
    },
    {
      id: 'gradient-shadow-filter-parity',
      feature: 'Gradient/Shadow/Filter parity',
      category: 'paint-effect',
      webgl: {
        status: 'degraded',
        reason: 'Model-complete features can be lost when packet fallback is selected during pressure.',
        evidenceSignals: ['webglRenderPath', 'webglBudgetPressure', 'cacheFallbackReason', 'webglFeatureCapabilityGateReason'],
      },
      webgpu: {
        status: 'degraded',
        reason: 'Native rect-batch path rejects style-heavy shapes and relies on fallback pipelines.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason', 'webgpuFeatureCapabilityGateReason'],
      },
    },
    {
      id: 'image-clip-mask-parity',
      feature: 'Image clip and mask parity',
      category: 'text-image',
      webgl: {
        status: 'degraded',
        reason: 'Image upload budgeting and deferred texture counters indicate quality trade-offs under load.',
        evidenceSignals: ['webglImageTextureUploadCount', 'webglDeferredImageTextureCount', 'webglFeatureCapabilityGateReason'],
      },
      webgpu: {
        status: 'degraded',
        reason: 'WebGPU route often resolves to hybrid-webgl for non-rect compositing requirements.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuFeatureCapabilityGateReason'],
      },
    },
    {
      id: 'model-complete-failure-fallback-classification',
      feature: 'Model-complete failure fallback classification',
      category: 'fallback-classification',
      webgl: {
        status: 'pass',
        reason: 'Fallback is explicitly classified via webglRenderPath and cacheFallbackReason taxonomy.',
        evidenceSignals: ['webglRenderPath', 'cacheFallbackReason'],
      },
      webgpu: {
        status: 'pass',
        reason: 'Fallback outcome is explicitly classified via webgpuRenderPath and rect-batch reject reason.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason'],
      },
    },
    {
      id: 'cross-backend-parity-diagnostics-coverage',
      feature: 'Cross-backend parity diagnostics coverage',
      category: 'diagnostics',
      webgl: {
        status: 'pass',
        reason: 'Runtime diagnostics already publish backend path, pressure, and fallback taxonomy signals.',
        evidenceSignals: ['webglRenderPath', 'webglBudgetPressure', 'cacheFallbackReason'],
      },
      webgpu: {
        status: 'pass',
        reason: 'Runtime diagnostics already publish native submission and render-path classification signals.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeSubmissionAttemptedCount'],
      },
    },
  ]
}
