import type { EngineNodeId } from '../../types/types.ts'

/**
 * Declares visibility LOD bands used by 3D frame planning.
 */
export type EngineVisibilityLodLevel = 'full' | 'reduced' | 'proxy' | 'culled'

/**
 * Declares pressure tier used to tighten dynamic LOD thresholds.
 */
export type EngineVisibilityLodPressure = 'low' | 'medium' | 'high'

/**
 * Declares one visible candidate with camera-relative metrics.
 */
export interface EngineVisibilityLodCandidate {
  /** Node id represented by this LOD candidate. */
  nodeId: EngineNodeId
  /** Distance from active camera in world units. */
  distanceToCamera: number
  /** Projected screen-space area in pixels squared. */
  projectedScreenArea: number
}

/**
 * Declares distance and area thresholds for dynamic LOD classification.
 */
export interface EngineVisibilityLodThresholds {
  /** Maximum distance that can remain full detail under low pressure. */
  fullDistance: number
  /** Maximum distance that can remain reduced detail under low pressure. */
  reducedDistance: number
  /** Minimum projected area required to avoid proxy detail. */
  proxyArea: number
}

/**
 * Declares one LOD classification result.
 */
export interface EngineVisibilityLodEntry {
  /** Node id that was classified. */
  nodeId: EngineNodeId
  /** Detail level selected for the node. */
  lodLevel: EngineVisibilityLodLevel
  /** Distance threshold scale applied for the active pressure tier. */
  thresholdScale: number
}

/**
 * Declares one visibility LOD plan snapshot.
 */
export interface EngineVisibilityLodPlan {
  /** Per-node LOD classification entries in input order. */
  entries: readonly EngineVisibilityLodEntry[]
  /** Number of full-detail entries. */
  fullCount: number
  /** Number of reduced-detail entries. */
  reducedCount: number
  /** Number of proxy-detail entries. */
  proxyCount: number
  /** Number of culled entries. */
  culledCount: number
}

/**
 * Declares visibility LOD planner input.
 */
export interface EngineVisibilityLodPlanInput {
  /** Visible candidates with camera-relative metrics. */
  candidates: readonly EngineVisibilityLodCandidate[]
  /** Baseline low-pressure thresholds. */
  thresholds: EngineVisibilityLodThresholds
  /** Active budget pressure tier. */
  pressure: EngineVisibilityLodPressure
}

/**
 * Resolves a pressure-aware LOD plan for 3D visibility candidates.
 * @param input Visibility LOD planner input.
 */
export function resolveEngineVisibilityLodPlan(input: EngineVisibilityLodPlanInput): EngineVisibilityLodPlan {
  const thresholdScale = resolvePressureThresholdScale(input.pressure)
  const entries = input.candidates.map((candidate) => ({
    nodeId: candidate.nodeId,
    lodLevel: resolveCandidateLodLevel(candidate, input.thresholds, thresholdScale),
    thresholdScale,
  }))

  return {
    entries,
    fullCount: entries.filter((entry) => entry.lodLevel === 'full').length,
    reducedCount: entries.filter((entry) => entry.lodLevel === 'reduced').length,
    proxyCount: entries.filter((entry) => entry.lodLevel === 'proxy').length,
    culledCount: entries.filter((entry) => entry.lodLevel === 'culled').length,
  }
}

/**
 * Resolves one candidate LOD level from distance, screen area, and pressure scale.
 * @param candidate Candidate metrics.
 * @param thresholds Baseline low-pressure thresholds.
 * @param thresholdScale Pressure-derived distance threshold scale.
 */
function resolveCandidateLodLevel(
  candidate: EngineVisibilityLodCandidate,
  thresholds: EngineVisibilityLodThresholds,
  thresholdScale: number,
): EngineVisibilityLodLevel {
  if (candidate.projectedScreenArea <= 0) {
    return 'culled'
  }

  if (candidate.projectedScreenArea < thresholds.proxyArea) {
    return 'proxy'
  }

  const fullDistance = thresholds.fullDistance * thresholdScale
  const reducedDistance = thresholds.reducedDistance * thresholdScale
  if (candidate.distanceToCamera <= fullDistance) {
    return 'full'
  }

  if (candidate.distanceToCamera <= reducedDistance) {
    return 'reduced'
  }

  return 'proxy'
}

/**
 * Resolves distance threshold scale from active pressure tier.
 * @param pressure Active pressure tier.
 */
function resolvePressureThresholdScale(pressure: EngineVisibilityLodPressure): number {
  if (pressure === 'high') {
    return 0.5
  }

  if (pressure === 'medium') {
    return 0.75
  }

  return 1
}
