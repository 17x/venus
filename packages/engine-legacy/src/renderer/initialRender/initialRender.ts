/**
 * Initial render optimization for large scenes (50K+ elements).
 *
 * Provides low-fidelity preview immediately, then progressively refines
 * with higher detail as tile rendering completes.
 */

export interface EngineInitialRenderConfig {
  /**
   * Enable progressive rendering. Default: false.
   * When enabled, shows low-DPR preview, then refines to full detail.
   */
  enabled: boolean

  /**
   * DPR (device pixel ratio) for initial preview. Default: 0.25 (4x speed).
   * Lower = faster preview, but blurry. Typical: 0.25 to 0.5.
   */
  lowDprPreview?: number

  /**
   * Delay before showing initial preview (ms). Default: 50ms.
   * Too low: user doesn't see preview. Too high: feels delayed.
   */
  previewDelayMs?: number

  /**
   * Delay before starting detail pass (ms). Default: 200ms.
   * Allows preview to settle before starting to refine.
   */
  detailPassDelayMs?: number

  /**
   * Target duration for detail pass (ms). Default: 1000ms.
   * Incrementally render tiles over this duration.
   */
  detailPassDurationMs?: number
}

/**
 * Render initialization state machine.
 * Keep this as a const object instead of a TS enum so the package test runner
 * can execute it directly under Node's strip-types mode.
 */
export const InitialRenderPhase = {
  Idle: 'idle',
  PreviewQueued: 'preview-queued',
  PreviewActive: 'preview-active',
  DetailQueued: 'detail-queued',
  DetailActive: 'detail-active',
  Complete: 'complete',
} as const

export type InitialRenderPhase =
  typeof InitialRenderPhase[keyof typeof InitialRenderPhase]

const INITIAL_RENDER_LOW_DPR_PREVIEW_DEFAULT = 0.25
const INITIAL_RENDER_PREVIEW_DELAY_MS_DEFAULT = 50
const INITIAL_RENDER_DETAIL_PASS_DELAY_MS_DEFAULT = 200
const INITIAL_RENDER_DETAIL_PASS_DURATION_MS_DEFAULT = 1000

/**
 * Controller for progressive initialization rendering.
 */
export class EngineInitialRenderController {
  private config: Required<EngineInitialRenderConfig>
  private phase: InitialRenderPhase = InitialRenderPhase.Idle
  // Use runtime timer handle type so Node test and browser build share one safe declaration.
  private previewHandle: ReturnType<typeof globalThis.setTimeout> | null = null
  // Use runtime timer handle type so nested detail scheduling stays cross-environment safe.
  private detailHandle: ReturnType<typeof globalThis.setTimeout> | null = null
  private startAt: number = 0

    /**
   * Handles function.
   * @param config Configuration values.
   */
constructor(config: EngineInitialRenderConfig) {
    this.config = {
      enabled: config.enabled,
      lowDprPreview: config.lowDprPreview ?? INITIAL_RENDER_LOW_DPR_PREVIEW_DEFAULT,
      previewDelayMs: config.previewDelayMs ?? INITIAL_RENDER_PREVIEW_DELAY_MS_DEFAULT,
      detailPassDelayMs: config.detailPassDelayMs ?? INITIAL_RENDER_DETAIL_PASS_DELAY_MS_DEFAULT,
      detailPassDurationMs: config.detailPassDurationMs ?? INITIAL_RENDER_DETAIL_PASS_DURATION_MS_DEFAULT,
    }
  }

  /**
   * Begin initial render sequence for a large scene.
    * @param onPreviewReady onPreviewReady parameter.
 * @param onDetailReady onDetailReady parameter.
*/
  beginInitialRender(onPreviewReady?: () => void, onDetailReady?: () => void): void {
    if (!this.config.enabled) return
    if (this.phase !== InitialRenderPhase.Idle) return

    this.startAt = performance.now()
    this.phase = InitialRenderPhase.PreviewQueued

    // Schedule preview render
    // Use the standard timer global so engine stays detached from browser-only `window`.
    this.previewHandle = globalThis.setTimeout(() => {
      this.phase = InitialRenderPhase.PreviewActive
      onPreviewReady?.()

      // Schedule detail pass start
      this.detailHandle = globalThis.setTimeout(() => {
        this.phase = InitialRenderPhase.DetailActive
        onDetailReady?.()
      }, this.config.detailPassDelayMs - this.config.previewDelayMs)
    }, this.config.previewDelayMs)
  }

  /**
   * Mark initial render as complete.
   */
  completeInitialRender(): void {
    this.phase = InitialRenderPhase.Complete
    this.cleanup()
  }

  /**
   * Cancel initial render sequence.
   */
  cancel(): void {
    this.cleanup()
    this.phase = InitialRenderPhase.Idle
  }

  /**
   * Get current initialization phase.
   */
  getPhase(): InitialRenderPhase {
    return this.phase
  }

  /**
   * Get DPR to use for current phase.
   * Preview phase uses low DPR, detail phase uses full DPR.
   */
  getDprForPhase(): number {
    return this.phase === InitialRenderPhase.PreviewActive ? this.config.lowDprPreview : 1.0
  }

  /**
   * Get elapsed milliseconds in detail pass.
   */
  getDetailPassElapsedMs(): number {
    if (this.phase !== InitialRenderPhase.DetailActive) return 0
    return Math.max(0, performance.now() - this.startAt - this.config.previewDelayMs - this.config.detailPassDelayMs)
  }

  /**
   * Get progress (0-1) through detail pass.
   */
  getDetailPassProgress(): number {
    const elapsed = this.getDetailPassElapsedMs()
    return Math.min(1, elapsed / this.config.detailPassDurationMs)
  }

  private cleanup(): void {
    if (this.previewHandle !== null) {
      globalThis.clearTimeout(this.previewHandle)
      this.previewHandle = null
    }
    if (this.detailHandle !== null) {
      globalThis.clearTimeout(this.detailHandle)
      this.detailHandle = null
    }
  }
}
