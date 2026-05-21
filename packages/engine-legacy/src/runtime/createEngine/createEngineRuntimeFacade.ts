import { renderEngineFrameWithRecovery } from './createEngineRenderRecovery.ts'
import { buildEngineRuntimeDiagnosticsSnapshot } from './createEngineDiagnosticsBuilder.ts'
import type { Engine } from './createEngineContracts.ts'
import type { EngineRenderStats } from '../../renderer/types/index.ts'

const RENDER_RECOVERY_MAX_EXTRA_FRAMES = 2

/**
 * Builds runtime execution and diagnostics facade methods.
 * @param options Runtime loop, recovery, and diagnostics dependencies.
 * @returns Engine facade slice with render/loop lifecycle methods.
 */
export function createEngineRuntimeFacade(options: {
  cameraAnimationTick: () => void
  renderOnce: () => Promise<Engine['renderFrame'] extends () => Promise<infer T> ? T : never>
  isSettlingPhase: () => boolean
  hasSceneNodes: () => boolean
  getLatestRenderStats: () => EngineRenderStats | null
  forceSharpFrame: () => void
  clearDirtyRegions: () => void
  startLoop: Engine['start']
  stopLoop: Engine['stop']
  isRunning: Engine['isRunning']
  resolveDiagnosticsInput: () => Parameters<typeof buildEngineRuntimeDiagnosticsSnapshot>[0]
  stopAllCameraAnimations: () => void
  resetInteractionPredictor: () => void
  disposeRenderer: () => void
}) {
  return {
    /**
     * Handles renderFrame.
     */
    renderFrame: async () => {
      options.cameraAnimationTick()
      const stats = await renderEngineFrameWithRecovery({
        renderOnce: () => options.renderOnce(),
        maxExtraFrames: RENDER_RECOVERY_MAX_EXTRA_FRAMES,
        isSettlingPhase: options.isSettlingPhase(),
        hasSceneNodes: options.hasSceneNodes,
        latestRenderStats: options.getLatestRenderStats,
        forceSharpFrame: options.forceSharpFrame,
      })

      // Clear dirty regions after each render so they don't stale-accumulate.
      options.clearDirtyRegions()
      return stats
    },
    start() {
      options.startLoop()
    },
    stop() {
      options.stopLoop()
    },
    isRunning() {
      return options.isRunning()
    },
    getDiagnostics() {
      return buildEngineRuntimeDiagnosticsSnapshot(options.resolveDiagnosticsInput())
    },
    dispose() {
      options.stopLoop()
      options.stopAllCameraAnimations()
      options.resetInteractionPredictor()
      options.disposeRenderer()
    },
  } satisfies Pick<
    Engine,
    | 'renderFrame'
    | 'start'
    | 'stop'
    | 'isRunning'
    | 'getDiagnostics'
    | 'dispose'
  >
}
