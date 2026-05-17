import type { EngineRenderStats } from '../../renderer/types/index.ts'

/**
 * Renders one frame and applies bounded sharpness/empty-frame recovery retries.
 * @param options Render-loop dependencies and recovery predicates.
 * @returns Latest render stats after recovery loop.
 */
export async function renderEngineFrameWithRecovery(options: {
  renderOnce: () => Promise<EngineRenderStats>
  maxExtraFrames: number
  isSettlingPhase: boolean
  hasSceneNodes: () => boolean
  latestRenderStats: () => EngineRenderStats | null
  forceSharpFrame: () => void
}) {
  let stats = await options.renderOnce()

  for (let extraFrame = 0; extraFrame < options.maxExtraFrames; extraFrame += 1) {
    const currentStats = options.latestRenderStats() ?? stats
    const hasDeferredDetail =
      (currentStats.webglDeferredImageTextureCount ?? 0) > 0 ||
      (currentStats.webglDeferredTextTextureCount ?? 0) > 0 ||
      (currentStats.webglInteractiveTextFallbackCount ?? 0) > 0
    const requiresEmptyFrameRecovery = options.hasSceneNodes() && currentStats.drawCount <= 0
    const requiresSettleSharpRecovery =
      options.isSettlingPhase &&
      (currentStats.engineFrameQuality !== 'full' || hasDeferredDetail)

    if (!requiresEmptyFrameRecovery && !requiresSettleSharpRecovery) {
      break
    }

    options.forceSharpFrame()
    stats = await options.renderOnce()
  }

  return options.latestRenderStats() ?? stats
}