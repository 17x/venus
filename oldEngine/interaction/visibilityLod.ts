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

const DEFAULT_VIEWPORT_WIDTH_PX = 1920
const DEFAULT_VIEWPORT_HEIGHT_PX = 1080
const DEFAULT_VIEWPORT_AREA_PX2 = DEFAULT_VIEWPORT_WIDTH_PX * DEFAULT_VIEWPORT_HEIGHT_PX
const AREA_SCORE_VIEWPORT_RATIO = 0.08
const EDGE_SCORE_MAX_PX = 24
const BOOST_MIN = -0.5
const BOOST_MAX = 0.5
const DENSITY_MAX = 0.5
const AREA_WEIGHT = 0.55
const EDGE_WEIGHT = 0.35
const INTERACTION_WEIGHT = 0.25
const SEMANTIC_WEIGHT = 0.2
const DENSITY_WEIGHT = 0.35
const DENSITY_BASE_CANDIDATE_COUNT = 6
const DENSITY_CANDIDATE_WINDOW = 18
const TIER_A_EXACT_BUDGET = 14
const TIER_B_EXACT_BUDGET = 8
const TIER_C_EXACT_BUDGET = 4
const TIER_D_EXACT_BUDGET = 2
const TIER_D_BBOX_ONLY_THRESHOLD = 28
const TIER_A_SCORE_THRESHOLD = 0.72
const TIER_B_SCORE_THRESHOLD = 0.5
const TIER_C_SCORE_THRESHOLD = 0.3

/**
 * Resolve a visibility profile from screen contribution and interaction affinity.
  * @param input Input payload for this operation.
*/
export function resolveEngineVisibilityProfile(
  input: EngineVisibilityMetricInput,
): EngineVisibilityProfile {
  const viewportAreaPx2 = Math.max(1, input.viewportAreaPx2 ?? DEFAULT_VIEWPORT_AREA_PX2)
  const area = Math.max(0, input.screenAreaPx2)
  const minEdge = Math.max(0, input.screenMinEdgePx)

  // Area favors objects that materially occupy screen pixels.
  const areaScore = clamp01(area / Math.max(1, viewportAreaPx2 * AREA_SCORE_VIEWPORT_RATIO))
  // Edge score prevents needle-thin candidates from stealing precision budget.
  const edgeScore = clamp01(minEdge / EDGE_SCORE_MAX_PX)

  const interactionBoost = clampRange(input.interactionBoost ?? 0, BOOST_MIN, BOOST_MAX)
  const semanticBoost = clampRange(input.semanticBoost ?? 0, BOOST_MIN, BOOST_MAX)
  const densityPenalty = clampRange(input.densityPenalty ?? 0, 0, DENSITY_MAX)

  // Weighted score keeps visibility primary while still honoring interaction context.
  const score = clamp01(
    areaScore * AREA_WEIGHT +
      edgeScore * EDGE_WEIGHT +
      interactionBoost * INTERACTION_WEIGHT +
      semanticBoost * SEMANTIC_WEIGHT -
      densityPenalty * DENSITY_WEIGHT,
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
  * @param input Input payload for this operation.
*/
export function resolveEngineVisibilityHitTestBudget(
  input: EngineVisibilityHitTestBudgetInput,
): EngineVisibilityHitTestBudget {
  const densityPenalty = clamp01((Math.max(0, input.candidateCount) - DENSITY_BASE_CANDIDATE_COUNT) / DENSITY_CANDIDATE_WINDOW) * DENSITY_WEIGHT
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
      maxExactCandidateCount: TIER_A_EXACT_BUDGET,
      visibilityTier: profile.tier,
      visibilityScore: profile.score,
    }
  }

  if (profile.tier === 'tier-b') {
    return {
      hitMode: 'bbox_then_exact',
      maxExactCandidateCount: TIER_B_EXACT_BUDGET,
      visibilityTier: profile.tier,
      visibilityScore: profile.score,
    }
  }

  if (profile.tier === 'tier-c') {
    return {
      hitMode: 'bbox_then_exact',
      maxExactCandidateCount: TIER_C_EXACT_BUDGET,
      visibilityTier: profile.tier,
      visibilityScore: profile.score,
    }
  }

  return {
    hitMode: input.candidateCount > TIER_D_BBOX_ONLY_THRESHOLD ? 'bbox' : 'bbox_then_exact',
    maxExactCandidateCount: TIER_D_EXACT_BUDGET,
    visibilityTier: profile.tier,
    visibilityScore: profile.score,
  }
}

/**
 * Handles resolveVisibilityTier.
 * @param score score parameter.
 */
function resolveVisibilityTier(score: number): EngineVisibilityTier {
  if (score >= TIER_A_SCORE_THRESHOLD) {
    return 'tier-a'
  }
  if (score >= TIER_B_SCORE_THRESHOLD) {
    return 'tier-b'
  }
  if (score >= TIER_C_SCORE_THRESHOLD) {
    return 'tier-c'
  }
  return 'tier-d'
}

/**
 * Handles clamp01.
 * @param value value parameter.
 */
function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

/**
 * Handles clampRange.
 * @param value value parameter.
 * @param min min parameter.
 * @param max max parameter.
 */
function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
