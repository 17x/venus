/**
 * Renderer/WebGL capability module.
 * Owns snapshot capture/reuse state and preview-policy CRUD operations.
 * Does not own full frame orchestration or tile rendering control flow.
 */
import type {
  EngineInteractionPreviewConfig,
  EngineRenderFrame,
} from '../../types/index.ts'
import {
  ENGINE_RENDER_FALLBACK_REASON,
  type EngineRenderFallbackReason,
} from '../../fallbackTaxonomy/index.ts'
import {
  captureCompositeSnapshotFromCurrentFramebuffer,
  tryReuseInteractiveCompositeFrame,
  type InteractionCompositeSnapshot,
  type ScreenRectPx,
} from '../preview/index.ts'
import type { WebGLQuadPipeline } from '../core/index.ts'

/**
 * Default interaction preview policy used when caller does not provide overrides.
 */
const DEFAULT_INTERACTION_PREVIEW: Required<EngineInteractionPreviewConfig> = {
  enabled: true,
  mode: 'interaction',
  // AI-TEMP: keep reuse enabled while pan O(1) stabilization is in progress; remove when pan regressions are green across stress scenes; ref packages/engine/docs/task/debug.md
  disableReuse: false,
  // Keep pan frames on pure snapshot reprojection; tile work stays schedule-only.
  cacheOnly: true,
  maxScaleStep: 1.2,
  // Allow long drags to stay on snapshot path instead of falling back too early.
  maxTranslatePx: 2400,
}

/**
 * Stores options required to initialize snapshot capability state.
 */
export interface CreateWebGLSnapshotCapabilityOptions {
  /** Stores active WebGL context used by capture/reuse operations. */
  context: WebGLRenderingContext | WebGL2RenderingContext
  /** Stores quad pipeline used for snapshot reprojection draw calls. */
  pipeline: WebGLQuadPipeline
  /** Stores reusable texture backing snapshot blits. */
  texture: WebGLTexture
  /** Stores optional initial interaction-preview policy overrides. */
  initialConfig?: EngineInteractionPreviewConfig
}

/**
 * Stores framebuffer capture input used to create/update snapshot state.
 */
export interface WebGLSnapshotCaptureInput {
  /** Stores current render frame metadata associated with the capture. */
  frame: EngineRenderFrame
  /** Stores visible node count for diagnostics carried by snapshot. */
  visibleCount: number
  /** Stores culled node count for diagnostics carried by snapshot. */
  culledCount: number
}

/**
 * Stores output from snapshot reuse lookup against the current frame.
 */
export interface WebGLSnapshotReuseResult {
  /** Indicates whether cached snapshot was reused this frame. */
  reused: boolean
  /** Stores miss reason when reuse is skipped. */
  missReason: EngineRenderFallbackReason | null
  /** Stores visible count propagated from snapshot metadata. */
  visibleCount: number
  /** Stores culled count propagated from snapshot metadata. */
  culledCount: number
  /** Stores optional edge redraw regions reported by preview path. */
  edgeRedrawRegions: ScreenRectPx[]
}

/**
 * Defines fixed CRUD-style snapshot capability methods for renderer orchestration.
 */
export interface WebGLSnapshotCapability {
  /** Creates snapshot state by capturing the current framebuffer output. */
  create(input: WebGLSnapshotCaptureInput): InteractionCompositeSnapshot | null
  /** Reads snapshot reuse decision against the provided frame. */
  read(frame: EngineRenderFrame): WebGLSnapshotReuseResult
  /** Updates preview policy or explicit snapshot payload. */
  update(input: {
    /** Stores optional interaction preview policy overrides. */
    config?: EngineInteractionPreviewConfig
    /** Stores optional direct snapshot replacement. */
    snapshot?: InteractionCompositeSnapshot | null
  }): void
  /** Deletes current snapshot payload while preserving config. */
  delete(): void
  /** Returns immutable snapshot of capability-owned state. */
  snapshot(): {
    /** Stores resolved interaction preview policy currently in effect. */
    config: Required<EngineInteractionPreviewConfig>
    /** Stores latest cached snapshot payload, if any. */
    snapshot: InteractionCompositeSnapshot | null
  }
}

/**
 * Creates a self-managed snapshot capability with fixed CRUD methods.
 * @param options Capability construction options.
 */
export function createWebGLSnapshotCapability(
  options: CreateWebGLSnapshotCapabilityOptions,
): WebGLSnapshotCapability {
  let config = resolvePreviewConfig(options.initialConfig)
  let currentSnapshot: InteractionCompositeSnapshot | null = null

  /**
   * Captures framebuffer metadata and stores it as the latest snapshot.
    * @param input Per-frame capture input and draw stats.
   */
  const create = (input: WebGLSnapshotCaptureInput) => {
    const nextSnapshot = captureCompositeSnapshotFromCurrentFramebuffer({
      context: options.context,
      texture: options.texture,
      frame: input.frame,
      visibleCount: input.visibleCount,
      culledCount: input.culledCount,
    })

    // Persist only successful captures so stale snapshot remains usable on transient failures.
    if (nextSnapshot) {
      currentSnapshot = nextSnapshot
    }

    return nextSnapshot
  }

  /**
   * Resolves whether the latest snapshot can be reused for the current frame.
    * @param frame Frame evaluated for snapshot reuse.
   */
  const read = (frame: EngineRenderFrame): WebGLSnapshotReuseResult => {
    if (config.disableReuse) {
      return {
        reused: false,
        missReason: ENGINE_RENDER_FALLBACK_REASON.L0_NO_SNAPSHOT,
        visibleCount: 0,
        culledCount: 0,
        edgeRedrawRegions: [],
      }
    }

    return tryReuseInteractiveCompositeFrame({
      context: options.context,
      pipeline: options.pipeline,
      frame,
      texture: options.texture,
      snapshot: currentSnapshot,
      interactionPreview: config,
    })
  }

  /**
   * Applies config or explicit snapshot replacement into capability state.
    * @param input Snapshot/config updates applied to capability state.
   */
  const update: WebGLSnapshotCapability['update'] = (input) => {
    if (input.config) {
      config = resolvePreviewConfig(input.config)
    }

    // Allow renderer orchestration paths to inject externally composed snapshots.
    if (Object.prototype.hasOwnProperty.call(input, 'snapshot')) {
      currentSnapshot = input.snapshot ?? null
    }
  }

  /**
   * Clears current snapshot payload while keeping preview config unchanged.
   */
  const deleteSnapshot = () => {
    currentSnapshot = null
  }

  /**
   * Returns current capability state for diagnostics and cross-capability orchestration.
   */
  const snapshot = () => ({
    config,
    snapshot: currentSnapshot,
  })

  return {
    create,
    read,
    update,
    delete: deleteSnapshot,
    snapshot,
  }
}

/**
 * Resolves effective preview config from defaults plus caller overrides.
  * @param config Configuration values.
*/
function resolvePreviewConfig(config?: EngineInteractionPreviewConfig) {
  return {
    ...DEFAULT_INTERACTION_PREVIEW,
    ...config,
  }
}
