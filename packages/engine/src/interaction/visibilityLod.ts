export type EngineVisibilityTier = 'tier-a' | 'tier-b' | 'tier-c' | 'tier-d'

export interface EngineVisibilityMetricInput {
  // Approximate screen-space area in px^2 for the current node/candidate.
  screenAreaPx2: number
  // Short edge in screen space so tiny-sliver objects can be deprioritized.
  screenMinEdgePx: number
  // Optional viewport area for normalization; defaults to a stable baseline.
  viewportAreaPx2?: number
  // Optional interaction affinity boost (pointer-near / selected / editing).
  interactionBoost?: number
  // Optional semantic importance boost (text edit target / active transform).
  semanticBoost?: number
  // Optional local density penalty to avoid over-investing in crowded zones.
  densityPenalty?: number
}

export interface EngineVisibilityProfile {
  score: number
  tier: EngineVisibilityTier
  areaScore: number
  edgeScore: number
}

export interface EngineVisibilityHitTestBudgetInput {
  // Local spatial candidate count around the pointer query.
  candidateCount: number
  // Best-candidate projected area proxy in screen-like units.
  topCandidateAreaPx2: number
  // Best-candidate projected min edge proxy in screen-like units.
  topCandidateMinEdgePx: number
  // Optional interaction boost for direct-select or active manipulation tools.
  interactionBoost?: number
  // Optional semantic boost for selected/active objects.
  semanticBoost?: number
}

export interface EngineVisibilityHitTestBudget {
  hitMode: 'exact' | 'bbox_then_exact' | 'bbox'
  maxExactCandidateCount: number
  visibilityTier: EngineVisibilityTier
  visibilityScore: number
}

const DEFAULT_VIEWPORT_AREA_PX2 = 1920 * 1080

/**
 * Resolve a visibility profile from screen contribution and interaction affinity.
 */
export function resolveEngineVisibilityProfile(
  input: EngineVisibilityMetricInput,
): EngineVisibilityProfile {
  const viewportAreaPx2 = Math.max(1, input.viewportAreaPx2 ?? DEFAULT_VIEWPORT_AREA_PX2)
  const area = Math.max(0, input.screenAreaPx2)
  const minEdge = Math.max(0, input.screenMinEdgePx)

  // Area favors objects that materially occupy screen pixels.
  const areaScore = clamp01(area / Math.max(1, viewportAreaPx2 * 0.08))
  // Edge score prevents needle-thin candidates from stealing precision budget.
  const edgeScore = clamp01(minEdge / 24)

  const interactionBoost = clampRange(input.interactionBoost ?? 0, -0.5, 0.5)
  const semanticBoost = clampRange(input.semanticBoost ?? 0, -0.5, 0.5)
  const densityPenalty = clampRange(input.densityPenalty ?? 0, 0, 0.5)

  // Weighted score keeps visibility primary while still honoring interaction context.
  const score = clamp01(
    areaScore * 0.55 +
      edgeScore * 0.35 +
      interactionBoost * 0.25 +
      semanticBoost * 0.2 -
      densityPenalty * 0.35,
  )

  return {
    score,
    tier: resolveVisibilityTier(score),
    areaScore,
    edgeScore,
  }
}

/**
 * Convert visibility to hit-test cost budget so exact tests focus on visible targets.
 */
export function resolveEngineVisibilityHitTestBudget(
  input: EngineVisibilityHitTestBudgetInput,
): EngineVisibilityHitTestBudget {
  const densityPenalty = clamp01((Math.max(0, input.candidateCount) - 6) / 18) * 0.35
  const profile = resolveEngineVisibilityProfile({
    screenAreaPx2: input.topCandidateAreaPx2,
    screenMinEdgePx: input.topCandidateMinEdgePx,
    interactionBoost: input.interactionBoost,
    semanticBoost: input.semanticBoost,
    densityPenalty,
  })

  if (profile.tier === 'tier-a') {
    return {
      hitMode: 'exact',
      maxExactCandidateCount: 14,
      visibilityTier: profile.tier,
      visibilityScore: profile.score,
    }
  }

  if (profile.tier === 'tier-b') {
    return {
      hitMode: 'bbox_then_exact',
      maxExactCandidateCount: 8,
      visibilityTier: profile.tier,
      visibilityScore: profile.score,
    }
  }

  if (profile.tier === 'tier-c') {
    return {
      hitMode: 'bbox_then_exact',
      maxExactCandidateCount: 4,
      visibilityTier: profile.tier,
      visibilityScore: profile.score,
    }
  }

  return {
    hitMode: input.candidateCount > 28 ? 'bbox' : 'bbox_then_exact',
    maxExactCandidateCount: 2,
    visibilityTier: profile.tier,
    visibilityScore: profile.score,
  }
}

function resolveVisibilityTier(score: number): EngineVisibilityTier {
  if (score >= 0.72) {
    return 'tier-a'
  }
  if (score >= 0.5) {
    return 'tier-b'
  }
  if (score >= 0.3) {
    return 'tier-c'
  }
  return 'tier-d'
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
