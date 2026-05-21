// Module responsibility: derive deterministic screen-space hierarchy occlusion decisions for 3D visibility planning.
// Non-responsibility: GPU occlusion queries, scene traversal ownership, or renderer-specific culling execution.

import type { EngineRect2 } from '../../../math/dimension/types.ts'
import type { EngineNodeId } from '../../types/types.ts'

/**
 * Declares one candidate considered by the hierarchical occlusion planner.
 */
export interface EngineVisibilityOcclusionCandidate {
  /** Node id represented by this occlusion candidate. */
  nodeId: EngineNodeId
  /** Optional parent id used for hierarchy occlusion propagation. */
  parentId?: EngineNodeId
  /** Projected screen-space bounds in pixels. */
  screenBounds: EngineRect2
  /** Camera-relative depth where lower values are closer to the camera. */
  depth: number
  /** Whether this candidate can hide later/deeper candidates. */
  occluder: boolean
}

/**
 * Declares threshold controls for screen-space occlusion decisions.
 */
export interface EngineVisibilityOcclusionThresholds {
  /** Minimum covered area ratio required before a candidate is considered occluded. */
  coverageRatio: number
  /** Minimum screen-space area required before a visible candidate can become an occluder. */
  minOccluderArea: number
  /** Minimum depth separation required before an occluder can hide another candidate. */
  depthEpsilon: number
}

/**
 * Declares one occlusion decision entry.
 */
export interface EngineVisibilityOcclusionEntry {
  /** Node id represented by this occlusion decision. */
  nodeId: EngineNodeId
  /** True when the candidate should be culled by occlusion. */
  occluded: boolean
  /** Optional node id that caused the occlusion decision. */
  occludedBy?: EngineNodeId
  /** Explanation label for diagnostics and tests. */
  reason: 'visible' | 'behind-occluder' | 'parent-occluded'
}

/**
 * Declares one hierarchical occlusion planning result.
 */
export interface EngineVisibilityOcclusionPlan {
  /** Occlusion entries returned in the same order as input candidates. */
  entries: readonly EngineVisibilityOcclusionEntry[]
  /** Count of entries that remain visible. */
  visibleCount: number
  /** Count of entries culled by screen-space or hierarchy occlusion. */
  occludedCount: number
}

/**
 * Declares one hierarchical occlusion planning input.
 */
export interface EngineVisibilityOcclusionPlanInput {
  /** Candidates to classify for occlusion. */
  candidates: readonly EngineVisibilityOcclusionCandidate[]
  /** Thresholds controlling coverage, area, and depth comparisons. */
  thresholds: EngineVisibilityOcclusionThresholds
}

/**
 * Intent: resolve a deterministic hierarchical occlusion plan from projected candidate bounds.
 * @param input Hierarchical occlusion planner input.
 * @returns Occlusion plan entries in input order.
 */
export function resolveEngineVisibilityOcclusionPlan(
  input: EngineVisibilityOcclusionPlanInput,
): EngineVisibilityOcclusionPlan {
  const thresholds = resolveOcclusionThresholds(input.thresholds)
  const entriesByNodeId = new Map<EngineNodeId, EngineVisibilityOcclusionEntry>()
  const activeOccluders: EngineVisibilityOcclusionCandidate[] = []
  const sortedCandidates = input.candidates
    .map((candidate, inputIndex) => ({candidate, inputIndex}))
    .sort((left, right) => {
      if (left.candidate.depth !== right.candidate.depth) {
        return left.candidate.depth - right.candidate.depth
      }

      return left.inputIndex - right.inputIndex
    })

  for (const {candidate} of sortedCandidates) {
    const parentEntry = candidate.parentId ? entriesByNodeId.get(candidate.parentId) : undefined
    if (parentEntry?.occluded) {
      // Hierarchy propagation keeps descendants from re-entering visibility once an ancestor is hidden.
      entriesByNodeId.set(candidate.nodeId, {
        nodeId: candidate.nodeId,
        occluded: true,
        occludedBy: parentEntry.occludedBy ?? parentEntry.nodeId,
        reason: 'parent-occluded',
      })
      continue
    }

    const occluder = resolveCoveringOccluder(candidate, activeOccluders, thresholds)
    if (occluder) {
      entriesByNodeId.set(candidate.nodeId, {
        nodeId: candidate.nodeId,
        occluded: true,
        occludedBy: occluder.nodeId,
        reason: 'behind-occluder',
      })
      continue
    }

    const visibleEntry: EngineVisibilityOcclusionEntry = {
      nodeId: candidate.nodeId,
      occluded: false,
      reason: 'visible',
    }
    entriesByNodeId.set(candidate.nodeId, visibleEntry)
    if (candidate.occluder && resolveArea(candidate.screenBounds) >= thresholds.minOccluderArea) {
      activeOccluders.push(candidate)
    }
  }

  const entries = input.candidates.map((candidate) => entriesByNodeId.get(candidate.nodeId) ?? {
    nodeId: candidate.nodeId,
    occluded: false,
    reason: 'visible' as const,
  })

  return {
    entries,
    visibleCount: entries.filter((entry) => !entry.occluded).length,
    occludedCount: entries.filter((entry) => entry.occluded).length,
  }
}

/**
 * Intent: normalize occlusion thresholds into safe planner ranges.
 * @param thresholds Raw threshold payload.
 * @returns Safe threshold payload.
 */
function resolveOcclusionThresholds(
  thresholds: EngineVisibilityOcclusionThresholds,
): EngineVisibilityOcclusionThresholds {
  return {
    coverageRatio: Math.max(0, Math.min(1, thresholds.coverageRatio)),
    minOccluderArea: Math.max(0, thresholds.minOccluderArea),
    depthEpsilon: Math.max(0, thresholds.depthEpsilon),
  }
}

/**
 * Intent: find the first active occluder that hides a candidate.
 * @param candidate Candidate being classified.
 * @param occluders Active nearer occluders.
 * @param thresholds Safe occlusion thresholds.
 * @returns Covering occluder or null when candidate remains visible.
 */
function resolveCoveringOccluder(
  candidate: EngineVisibilityOcclusionCandidate,
  occluders: readonly EngineVisibilityOcclusionCandidate[],
  thresholds: EngineVisibilityOcclusionThresholds,
): EngineVisibilityOcclusionCandidate | null {
  for (const occluder of occluders) {
    if (candidate.depth <= occluder.depth + thresholds.depthEpsilon) {
      continue
    }

    const coverageRatio = resolveCoverageRatio(candidate.screenBounds, occluder.screenBounds)
    if (coverageRatio >= thresholds.coverageRatio) {
      return occluder
    }
  }

  return null
}

/**
 * Intent: resolve how much of one candidate bounds is covered by one occluder bounds.
 * @param candidateBounds Candidate projected bounds.
 * @param occluderBounds Occluder projected bounds.
 * @returns Candidate area coverage ratio in range [0, 1].
 */
function resolveCoverageRatio(candidateBounds: EngineRect2, occluderBounds: EngineRect2): number {
  const candidateArea = resolveArea(candidateBounds)
  if (candidateArea <= 0) {
    return 0
  }

  const intersectionWidth = Math.max(
    0,
    Math.min(candidateBounds.x + candidateBounds.width, occluderBounds.x + occluderBounds.width)
      - Math.max(candidateBounds.x, occluderBounds.x),
  )
  const intersectionHeight = Math.max(
    0,
    Math.min(candidateBounds.y + candidateBounds.height, occluderBounds.y + occluderBounds.height)
      - Math.max(candidateBounds.y, occluderBounds.y),
  )

  return Math.max(0, Math.min(1, (intersectionWidth * intersectionHeight) / candidateArea))
}

/**
 * Intent: resolve positive screen-space rectangle area.
 * @param bounds Screen-space rectangle bounds.
 * @returns Non-negative area.
 */
function resolveArea(bounds: EngineRect2): number {
  return Math.max(0, bounds.width) * Math.max(0, bounds.height)
}
