/**
 * Declares visibility tier for candidate precision budgeting.
 */
type EngineVisibilityTier = "tier-a" | "tier-b" | "tier-c" | "tier-d";

/**
 * Declares visibility score input for one candidate.
 */
interface EngineVisibilityMetricInput {
	/** Approximate screen-space candidate area in px^2. */
	screenAreaPx2: number;
	/** Candidate short edge in screen-space pixels. */
	screenMinEdgePx: number;
	/** Optional viewport area for normalization. */
	viewportAreaPx2?: number;
	/** Optional interaction affinity boost. */
	interactionBoost?: number;
	/** Optional semantic priority boost. */
	semanticBoost?: number;
	/** Optional local-density penalty. */
	densityPenalty?: number;
}

/**
 * Declares computed visibility profile for one candidate.
 */
interface EngineVisibilityProfile {
	/** Final visibility score in range [0, 1]. */
	score: number;
	/** Visibility tier bucket mapped from score thresholds. */
	tier: EngineVisibilityTier;
	/** Normalized area contribution score. */
	areaScore: number;
	/** Normalized edge-length contribution score. */
	edgeScore: number;
}

/**
 * Declares budget input for one pointer-hit resolution pass.
 */
interface EngineVisibilityHitTestBudgetInput {
	/** Candidate count in local pointer neighborhood. */
	candidateCount: number;
	/** Best candidate projected area proxy. */
	topCandidateAreaPx2: number;
	/** Best candidate projected min-edge proxy. */
	topCandidateMinEdgePx: number;
	/** Optional interaction priority boost. */
	interactionBoost?: number;
	/** Optional semantic priority boost. */
	semanticBoost?: number;
}

/**
 * Declares resolved hit-test budget policy.
 */
interface EngineVisibilityHitTestBudget {
	/** Resolved hit mode for candidate filtering. */
	hitMode: "exact" | "bbox_then_exact" | "bbox";
	/** Maximum exact candidate count allowed for this frame. */
	maxExactCandidateCount: number;
	/** Tier used for budget decision. */
	visibilityTier: EngineVisibilityTier;
	/** Score used for budget decision. */
	visibilityScore: number;
}

const DEFAULT_VIEWPORT_WIDTH_PX = 1920;
const DEFAULT_VIEWPORT_HEIGHT_PX = 1080;
const DEFAULT_VIEWPORT_AREA_PX2 = DEFAULT_VIEWPORT_WIDTH_PX * DEFAULT_VIEWPORT_HEIGHT_PX;
const AREA_SCORE_VIEWPORT_RATIO = 0.08;
const EDGE_SCORE_MAX_PX = 24;
const BOOST_MIN = -0.5;
const BOOST_MAX = 0.5;
const DENSITY_MAX = 0.5;
const AREA_WEIGHT = 0.55;
const EDGE_WEIGHT = 0.35;
const INTERACTION_WEIGHT = 0.25;
const SEMANTIC_WEIGHT = 0.2;
const DENSITY_WEIGHT = 0.35;
const DENSITY_BASE_CANDIDATE_COUNT = 6;
const DENSITY_CANDIDATE_WINDOW = 18;
const TIER_A_EXACT_BUDGET = 14;
const TIER_B_EXACT_BUDGET = 8;
const TIER_C_EXACT_BUDGET = 4;
const TIER_D_EXACT_BUDGET = 2;
const TIER_D_BBOX_ONLY_THRESHOLD = 28;
const TIER_A_SCORE_THRESHOLD = 0.72;
const TIER_B_SCORE_THRESHOLD = 0.5;
const TIER_C_SCORE_THRESHOLD = 0.3;

/**
 * Resolves visibility-aware hit-test candidate budget from scene and interaction signals.
 * @param options Visibility budget resolution input.
 */
export function resolveEngineVisibilityHitTestBudget(
	options: EngineVisibilityHitTestBudgetInput,
): EngineVisibilityHitTestBudget {
	const densityPenalty =
		clamp01((Math.max(0, options.candidateCount) - DENSITY_BASE_CANDIDATE_COUNT) / DENSITY_CANDIDATE_WINDOW) *
		DENSITY_WEIGHT;
	const profile = resolveEngineVisibilityProfile({
		screenAreaPx2: options.topCandidateAreaPx2,
		screenMinEdgePx: options.topCandidateMinEdgePx,
		interactionBoost: options.interactionBoost,
		semanticBoost: options.semanticBoost,
		densityPenalty,
	});

	if (profile.tier === "tier-a") {
		return {
			hitMode: "exact",
			maxExactCandidateCount: TIER_A_EXACT_BUDGET,
			visibilityTier: profile.tier,
			visibilityScore: profile.score,
		};
	}

	if (profile.tier === "tier-b") {
		return {
			hitMode: "bbox_then_exact",
			maxExactCandidateCount: TIER_B_EXACT_BUDGET,
			visibilityTier: profile.tier,
			visibilityScore: profile.score,
		};
	}

	if (profile.tier === "tier-c") {
		return {
			hitMode: "bbox_then_exact",
			maxExactCandidateCount: TIER_C_EXACT_BUDGET,
			visibilityTier: profile.tier,
			visibilityScore: profile.score,
		};
	}

	return {
		hitMode: options.candidateCount > TIER_D_BBOX_ONLY_THRESHOLD ? "bbox" : "bbox_then_exact",
		maxExactCandidateCount: TIER_D_EXACT_BUDGET,
		visibilityTier: profile.tier,
		visibilityScore: profile.score,
	};
}

/**
 * Resolves normalized visibility profile from projected area/edge signals.
 * @param input Visibility profile input payload.
 */
function resolveEngineVisibilityProfile(input: EngineVisibilityMetricInput): EngineVisibilityProfile {
	const viewportAreaPx2 = Math.max(1, input.viewportAreaPx2 ?? DEFAULT_VIEWPORT_AREA_PX2);
	const area = Math.max(0, input.screenAreaPx2);
	const minEdge = Math.max(0, input.screenMinEdgePx);

	const areaScore = clamp01(area / Math.max(1, viewportAreaPx2 * AREA_SCORE_VIEWPORT_RATIO));
	const edgeScore = clamp01(minEdge / EDGE_SCORE_MAX_PX);

	const interactionBoost = clampRange(input.interactionBoost ?? 0, BOOST_MIN, BOOST_MAX);
	const semanticBoost = clampRange(input.semanticBoost ?? 0, BOOST_MIN, BOOST_MAX);
	const densityPenalty = clampRange(input.densityPenalty ?? 0, 0, DENSITY_MAX);

	const score = clamp01(
		areaScore * AREA_WEIGHT +
			edgeScore * EDGE_WEIGHT +
			interactionBoost * INTERACTION_WEIGHT +
			semanticBoost * SEMANTIC_WEIGHT -
			densityPenalty * DENSITY_WEIGHT,
	);

	return {
		score,
		tier: resolveVisibilityTier(score),
		areaScore,
		edgeScore,
	};
}

/**
 * Maps one visibility score to tier thresholds.
 * @param score Visibility score in range [0, 1].
 */
function resolveVisibilityTier(score: number): EngineVisibilityTier {
	if (score >= TIER_A_SCORE_THRESHOLD) {
		return "tier-a";
	}
	if (score >= TIER_B_SCORE_THRESHOLD) {
		return "tier-b";
	}
	if (score >= TIER_C_SCORE_THRESHOLD) {
		return "tier-c";
	}
	return "tier-d";
}

/**
 * Clamps one numeric value to range [0, 1].
 * @param value Numeric value to clamp.
 */
function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

/**
 * Clamps one numeric value to the provided min/max range.
 * @param value Numeric value to clamp.
 * @param min Inclusive lower bound.
 * @param max Inclusive upper bound.
 */
function clampRange(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
