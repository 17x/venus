// Module responsibility: classify engine optimization mechanisms by scene dimension strategy.
// Non-responsibility: applying runtime renderer behavior changes.

/**
 * Declares canonical optimization mechanism identifiers used by migration planning.
 */
export type EngineOptimizationMechanismId =
  | 'tile-cache'
  | 'interaction-snapshot'
  | 'partial-redraw-dirty-region'
  | 'lod-degradation'
  | 'frame-budget-broker'
  | 'visibility-culling'
  | 'resource-residency'
  | 'bitmap-replay'

/**
 * Declares migration disposition for one optimization mechanism.
 */
export type EngineOptimizationDisposition = 'retain' | 'upgrade' | 'deprecate'

/**
 * Describes input scene-dimension strategy used for mechanism decisions.
 */
export interface EngineOptimizationPolicyInput {
  /** Indicates whether optimization decisions target 2D, 3D, or mixed runtime. */
  dimensionMode: '2d' | '3d' | 'hybrid'
}

/**
 * Describes one optimization mechanism classification decision.
 */
export interface EngineOptimizationDecision {
  /** Stable optimization mechanism identifier. */
  id: EngineOptimizationMechanismId
  /** Migration disposition for the mechanism. */
  disposition: EngineOptimizationDisposition
  /** Rationale tags for governance reviews and implementation planning. */
  rationale: readonly string[]
}

const ENGINE_OPTIMIZATION_MECHANISM_ORDER: readonly EngineOptimizationMechanismId[] = [
  'tile-cache',
  'interaction-snapshot',
  'partial-redraw-dirty-region',
  'lod-degradation',
  'frame-budget-broker',
  'visibility-culling',
  'resource-residency',
  'bitmap-replay',
]

/**
 * Intent: return deterministic optimization mechanism decisions for a scene strategy.
 * @param input Scene-dimension policy input.
 * @returns Ordered optimization mechanism decisions.
 */
export function resolveEngineOptimizationMechanismPolicy(
  input: EngineOptimizationPolicyInput,
): readonly EngineOptimizationDecision[] {
  return ENGINE_OPTIMIZATION_MECHANISM_ORDER.map((id) => {
    return resolveEngineOptimizationMechanismDecision(id, input.dimensionMode)
  })
}

/**
 * Intent: resolve one mechanism decision for the requested scene mode.
 * @param id Mechanism identifier to classify.
 * @param dimensionMode Target scene strategy.
 * @returns One mechanism migration decision.
 */
function resolveEngineOptimizationMechanismDecision(
  id: EngineOptimizationMechanismId,
  dimensionMode: EngineOptimizationPolicyInput['dimensionMode'],
): EngineOptimizationDecision {
  if (id === 'bitmap-replay') {
    // Bitmap replay is not part of current source-path runtime optimization and should be phased out.
    return {
      id,
      disposition: 'deprecate',
      rationale: ['non-core-path', 'maintenance-cost'],
    }
  }

  if (id === 'partial-redraw-dirty-region') {
    if (dimensionMode === '2d') {
      return {
        id,
        disposition: 'retain',
        rationale: ['2d-screen-space-stable'],
      }
    }

    // 3D and hybrid paths should migrate away from rect-count heuristics.
    return {
      id,
      disposition: 'upgrade',
      rationale: ['replace-with-pass-cost-model', 'depth-aware-required'],
    }
  }

  if (id === 'tile-cache') {
    if (dimensionMode === '2d') {
      return {
        id,
        disposition: 'retain',
        rationale: ['2d-world-rect-effective'],
      }
    }

    return {
      id,
      disposition: 'upgrade',
      rationale: ['streaming-key-needs-camera-and-depth'],
    }
  }

  if (id === 'interaction-snapshot') {
    if (dimensionMode === '2d') {
      return {
        id,
        disposition: 'retain',
        rationale: ['affine-reprojection-effective'],
      }
    }

    return {
      id,
      disposition: 'upgrade',
      rationale: ['temporal-reprojection-required', 'affine-insufficient-for-3d-camera'],
    }
  }

  if (id === 'visibility-culling') {
    if (dimensionMode === '2d') {
      return {
        id,
        disposition: 'retain',
        rationale: ['bounds-query-effective'],
      }
    }

    return {
      id,
      disposition: 'upgrade',
      rationale: ['frustum-plus-occlusion-required'],
    }
  }

  if (id === 'resource-residency') {
    return {
      id,
      disposition: 'upgrade',
      rationale: ['unified-vram-budget-required'],
    }
  }

  if (id === 'frame-budget-broker') {
    if (dimensionMode === '2d') {
      return {
        id,
        disposition: 'retain',
        rationale: ['existing-frame-heuristics-viable'],
      }
    }

    return {
      id,
      disposition: 'upgrade',
      rationale: ['gpu-time-and-visible-cost-signals-required'],
    }
  }

  return {
    id,
    disposition: 'retain',
    rationale: ['keep-lod-lane-and-tune-thresholds'],
  }
}
