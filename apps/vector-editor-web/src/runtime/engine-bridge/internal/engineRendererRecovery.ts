import type {RuntimeInteractionPreviewConfig} from '../renderPolicy.ts'

export interface DeferredVisualRecoveryStats {
  engineFrameQuality?: 'full' | 'interactive'
  deferredImageTextureCount: number
  interactiveTextFallbackCount: number
}

export function shouldQueueDeferredVisualRecovery(
  stats: DeferredVisualRecoveryStats,
): boolean {
  // Only interactive frames need a follow-up settle pass because settled frames
  // already own the final upload/text resolution work.
  if (stats.engineFrameQuality !== 'interactive') {
    return false
  }

  return stats.deferredImageTextureCount > 0 || stats.interactiveTextFallbackCount > 0
}

export function resolveEngineInteractionPreviewConfig(input: {
  interactionPreview: RuntimeInteractionPreviewConfig | false
  visualRecoveryPending: boolean
}): RuntimeInteractionPreviewConfig | false {
  if (input.interactionPreview === false) {
    return false
  }

  if (!input.visualRecoveryPending || input.interactionPreview.cacheOnly !== true) {
    return input.interactionPreview
  }

  // Drop cache-only while recovery is pending so preview misses can fall back
  // to packet work instead of waiting for an unrelated settled redraw.
  return {
    ...input.interactionPreview,
    cacheOnly: false,
  }
}