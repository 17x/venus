import type {RenderParityReplayBatchDashboardArtifact} from '../../../../scripts/render-parity-runtime-replay-history-gate.ts'

/**
 * Builds one deterministic replay dashboard fixture for history/gate contracts.
 * @param overrides Partial dashboard overrides.
 */
export function createDashboardFixture(
  overrides: Partial<RenderParityReplayBatchDashboardArtifact> = {},
): RenderParityReplayBatchDashboardArtifact {
  return {
    generatedAt: '2026-05-24T00:00:00.000Z',
    outputDir: '/tmp/output',
    processedCount: 2,
    trendCounter: {
      improved: 0,
      regressed: 0,
      mixed: 0,
      unchanged: 2,
      unknown: 0,
    },
    featureCapabilityGateCounter: {
      webglKnownRejected: 0,
      webglUnknownRejected: 0,
      webgpuKnownRejected: 0,
      webgpuUnknownRejected: 0,
    },
    frameStageSchedulerModeCounter: {
      interactive: 0,
      normal: 0,
      unknown: 0,
    },
    frameStageSceneApplyModeCounter: {
      none: 0,
      fullLoad: 0,
      previewLoad: 0,
      incrementalPatch: 0,
      unknown: 0,
    },
    runtimeResourceDecodeStatusCounter: {
      queued: 0,
      decoding: 0,
      ready: 0,
      failed: 0,
      unknown: 0,
    },
    runtimeResourceCompressionCodecCounter: {
      none: 0,
      brotli: 0,
      gzip: 0,
      zstd: 0,
      lz4: 0,
      unknown: 0,
    },
    ...overrides,
  }
}
