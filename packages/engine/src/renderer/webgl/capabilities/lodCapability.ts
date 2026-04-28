/**
 * Renderer/WebGL capability module.
 * Owns frame-level LOD decision state and policy resolution only.
 * Does not orchestrate frame rendering or GPU resource lifecycle.
 */
import type {
  BaseSceneRenderMode,
  EngineRenderFrame,
} from '../../types/index.ts'
import { resolveBaseSceneRenderMode, TEXT_PLACEHOLDER_MAX_SCALE } from '../runtime/index.ts'
import type { EngineZoomStrategyConfig } from '../../zoomPerformance/index.ts'

/**
 * Stores constructor options for WebGL LOD capability.
 */
export interface CreateWebGLLodCapabilityOptions {
  /** Stores renderer-level default LOD enabled flag. */
  lodEnabled: boolean
  /** Stores resolved zoom strategy used by base scene mode resolver. */
  zoomStrategy: Required<EngineZoomStrategyConfig>
}

/**
 * Stores read-query payload for per-frame LOD state resolution.
 */
export interface WebGLLodCapabilityReadInput {
  /** Stores frame used to compute interaction and placeholder decisions. */
  frame: EngineRenderFrame
  /** Stores whether tile cache lane is available for base scene mode choice. */
  tileCacheEnabled: boolean
  /** Stores scene visible-element estimate used by mode resolver. */
  visibleElementCount: number
}

/**
 * Stores resolved LOD decisions consumed by WebGL orchestration.
 */
export interface WebGLLodFrameState {
  /** Stores whether frame is running in interaction quality lane. */
  interactiveQuality: boolean
  /** Stores resolved base scene mode for this frame. */
  baseSceneRenderMode: BaseSceneRenderMode
  /** Stores final LOD gate after context override resolution. */
  frameLodEnabled: boolean
  /** Stores whether text placeholder lane should be used. */
  useTextPlaceholderMode: boolean
}

/**
 * Defines fixed CRUD-style methods for LOD decision capability.
 */
export interface WebGLLodCapability {
  /** Creates capability-owned state and returns capability key. */
  create(): 'default'
  /** Reads derived frame-level LOD decisions. */
  read(input: WebGLLodCapabilityReadInput): WebGLLodFrameState
  /** Updates runtime LOD defaults or zoom strategy. */
  update(input: {
    /** Stores optional LOD enabled override. */
    lodEnabled?: boolean
    /** Stores optional zoom strategy override. */
    zoomStrategy?: Required<EngineZoomStrategyConfig>
  }): void
  /** Deletes runtime overrides and restores constructor defaults. */
  delete(): void
  /** Returns immutable diagnostic snapshot of capability defaults. */
  snapshot(): {
    /** Stores current default LOD enabled value. */
    lodEnabled: boolean
    /** Stores current zoom strategy in effect. */
    zoomStrategy: Required<EngineZoomStrategyConfig>
  }
}

/**
 * Creates LOD capability that self-manages frame-level decision policy.
  * @param options Options object for this operation.
*/
export function createWebGLLodCapability(
  options: CreateWebGLLodCapabilityOptions,
): WebGLLodCapability {
  const initialState = {
    lodEnabled: options.lodEnabled,
    zoomStrategy: options.zoomStrategy,
  }
  let state = {
    ...initialState,
  }

  /**
   * Creates default capability state and returns static key for orchestration mapping.
   */
  const create = () => 'default' as const

  /**
   * Resolves LOD decisions for one frame without mutating capability state.
    * @param input Frame read input used for LOD decision resolution.
   */
  const read = (input: WebGLLodCapabilityReadInput): WebGLLodFrameState => {
    const interactiveQuality = input.frame.context.quality === 'interactive'
    const baseSceneRenderMode = resolveBaseSceneRenderMode({
      interactiveQuality,
      tileCacheEnabled: input.tileCacheEnabled,
      zoom: input.frame.viewport.scale,
      visibleElementCount: input.visibleElementCount,
      zoomStrategy: state.zoomStrategy,
    })
    const frameLodEnabled = input.frame.context.lodEnabled ?? state.lodEnabled
    const useTextPlaceholderMode =
      frameLodEnabled && input.frame.viewport.scale <= TEXT_PLACEHOLDER_MAX_SCALE

    return {
      interactiveQuality,
      baseSceneRenderMode,
      frameLodEnabled,
      useTextPlaceholderMode,
    }
  }

  /**
   * Applies runtime default overrides for subsequent frame reads.
    * @param input Partial default updates for capability state.
   */
  const update: WebGLLodCapability['update'] = (input) => {
    if (typeof input.lodEnabled === 'boolean') {
      state.lodEnabled = input.lodEnabled
    }

    if (input.zoomStrategy) {
      state.zoomStrategy = input.zoomStrategy
    }
  }

  /**
   * Resets capability defaults to constructor baseline.
   */
  const deleteLod = () => {
    state = {
      ...initialState,
    }
  }

  /**
   * Returns immutable capability defaults for diagnostics surfaces.
   */
  const snapshot = () => ({
    lodEnabled: state.lodEnabled,
    zoomStrategy: state.zoomStrategy,
  })

  return {
    create,
    read,
    update,
    delete: deleteLod,
    snapshot,
  }
}
