// PRD contract adapter wrappers for the five requirement APIs identified in W1-T02.
// Each function is a thin named adapter over existing RuntimeEngine/bridge primitives;
// no new geometry or transform logic is introduced here — single-entry rules (W1-T03) are
// preserved by delegating all geometry work to resolveEngineGeometryPayload.
import type {
	EngineGeometryPayload,
	EngineRenderScheduler,
	ResolveEngineGeometryPayloadOptions,
	RuntimeEngine,
} from './engine.ts'
import {resolveEngineGeometryPayload} from './engine.ts'

// ---------------------------------------------------------------------------
// Local mirror types — avoids depending on unbuilt @venus/engine dist types.
// Shapes are structurally identical to EngineGraphPatchInput/EngineViewInput/
// EngineViewSnapshot from the engine package; kept in sync by W1-T02 contract.
// ---------------------------------------------------------------------------

/**
 * One sub-patch entry within a scene patch group.
 * Mirrors the inner shape of EngineGraphPatchInput.patches[] without a deep import.
 */
export interface ScenePatchEntry {
	/** Monotonic revision token used for ordering guard in syncSceneDelta. */
	revision?: string | number
	/** When true, replaces the entire composition plane with upsertNodes. */
	replaceAll?: boolean
	/** Nodes to upsert; typed as unknown to keep this adapter layer decoupled from node schemas. */
	upsertNodes?: readonly unknown[]
	/** IDs of nodes to remove from the graph. */
	removeNodeIds?: readonly string[]
}

/**
 * One logical patch group forwarded to engine.batchUpdateGraph.
 * Mirrors EngineGraphPatchInput; defined locally to tolerate unbuilt engine dist.
 */
export interface ScenePatchGroup {
	/** Ordered sub-patches within this group. */
	patches: ReadonlyArray<ScenePatchEntry>
}

/**
 * Partial viewport state mutation input forwarded to engine.setView.
 * Mirrors EngineViewInput; defined locally to tolerate unbuilt engine dist.
 */
export interface ViewportInput {
	/** Viewport width in logical pixels. */
	viewportWidth?: number
	/** Viewport height in logical pixels. */
	viewportHeight?: number
	/** World-space X scroll offset. */
	offsetX?: number
	/** World-space Y scroll offset. */
	offsetY?: number
	/** World-space zoom scale factor. */
	scale?: number
}

/**
 * Complete viewport state snapshot returned by engine.setView / engine.getView.
 * Mirrors EngineViewSnapshot; defined locally to tolerate unbuilt engine dist.
 */
export interface ViewportSnapshot {
	/** Viewport width in logical pixels after the mutation. */
	viewportWidth: number
	/** Viewport height in logical pixels after the mutation. */
	viewportHeight: number
	/** World-space X scroll offset after the mutation. */
	offsetX: number
	/** World-space Y scroll offset after the mutation. */
	offsetY: number
	/** World-space zoom scale factor after the mutation. */
	scale: number
}

// ---------------------------------------------------------------------------
// resolveHitGeometryV2 — GAP-01
// ---------------------------------------------------------------------------

/**
 * Timing and candidate diagnostics appended to hit-geometry V2 results.
 * Satisfies the PRD requirement for candidateCount/filteredCount/costMs fields.
 */
export interface HitGeometryV2Diagnostics {
	/** Candidate node count seen by the geometry resolver before filtering. */
	candidateCount: number
	/** Filtered (accepted) node count after priority and mode filtering. */
	filteredCount: number
	/** Wall-clock cost in milliseconds for the geometry resolution call. */
	costMs: number
}

/**
 * Extended geometry payload returned by resolveHitGeometryV2.
 * Adds apiVersion and diagnostics to the base EngineGeometryPayload contract.
 */
export interface HitGeometryV2Result extends EngineGeometryPayload {
	/** Monotonic API version string for contract-drift detection across releases. */
	apiVersion: string
	/** Per-call diagnostics emitted by the geometry resolution pass. */
	diagnostics: HitGeometryV2Diagnostics
}

/** Stable contract version; bump when output shape changes. */
const HIT_GEOMETRY_V2_API_VERSION = '2.0.0'

/**
 * Resolves hit-geometry payload under the PRD-named V2 contract.
 * Wraps resolveEngineGeometryPayload (single-entry per W1-T03) and appends
 * apiVersion + diagnostics fields required by runtime-engine-api-requirements.
 * @param options Unified geometry query options forwarded to the underlying resolver.
 */
export function resolveHitGeometryV2(
	options: ResolveEngineGeometryPayloadOptions,
): HitGeometryV2Result {
	const start = Date.now()
	const payload = resolveEngineGeometryPayload(options)
	const costMs = Date.now() - start

	// candidateCount: union of point-hit + marquee candidates before mode filtering
	const candidateCount = payload.pointHitNodeIds.length + payload.marqueeCandidateNodeIds.length
	// filteredCount: nodes that made it through to resolved sets
	const filteredCount = payload.marqueeResolvedNodeIds.length + (payload.hovered != null ? 1 : 0)

	return {
		...payload,
		apiVersion: HIT_GEOMETRY_V2_API_VERSION,
		diagnostics: {candidateCount, filteredCount, costMs},
	}
}

// ---------------------------------------------------------------------------
// syncSceneDelta — GAP-03 (HIGH BLOCKER)
// ---------------------------------------------------------------------------

/**
 * Typed error shape for a revision ordering violation detected by syncSceneDelta.
 * Implemented as an interface + factory function (no constructor) to satisfy the
 * runtime no-constructor governance rule. Callers check via `isRevisionMismatchError`.
 */
export interface RevisionMismatchError extends Error {
	/** Discriminant name; always 'RevisionMismatchError'. */
	readonly name: 'RevisionMismatchError'
	/** Revision the caller expected to apply on top of. */
	readonly expected: string | number
	/** Revision found in the first patch header. */
	readonly received: string | number
}

/**
 * Creates a RevisionMismatchError tagged error without declaring a class.
 * @param expected Revision the caller believed was current.
 * @param received Revision embedded in the first incoming patch.
 */
export function createRevisionMismatchError(
	expected: string | number,
	received: string | number,
): RevisionMismatchError {
	const err = new Error(
		`syncSceneDelta revision mismatch: expected=${String(expected)}, received=${String(received)}`,
	) as RevisionMismatchError
	// Name tag used as discriminant; must be set before returning.
	;(err as {name: string}).name = 'RevisionMismatchError'
	Object.defineProperty(err, 'expected', {value: expected, enumerable: true, writable: false})
	Object.defineProperty(err, 'received', {value: received, enumerable: true, writable: false})
	return err
}

/**
 * Type-guard for RevisionMismatchError.
 * @param err Any caught value to test.
 */
export function isRevisionMismatchError(err: unknown): err is RevisionMismatchError {
	return err instanceof Error && err.name === 'RevisionMismatchError'
}

/**
 * Options accepted by syncSceneDelta.
 */
export interface SyncSceneDeltaOptions {
	/** Ordered patch groups forwarded to engine batchUpdateGraph. */
	patches: readonly ScenePatchGroup[]
	/**
	 * Expected head revision before applying these patches.
	 * When provided and a patch declares a revision that does not match,
	 * the function throws RevisionMismatchError before touching the engine.
	 */
	expectedRevision?: string | number
}

/**
 * Result returned by a successful syncSceneDelta call.
 */
export interface SyncSceneDeltaResult {
	/** Whether the batch was forwarded to the engine (false if all patches were empty). */
	applied: boolean
	/** Number of patch groups that contained no node changes and were therefore skipped. */
	skippedPatchCount: number
}

/**
 * Applies a delta batch to the engine under the PRD-named syncSceneDelta contract.
 * Guards against revision ordering violations before touching the engine and reports
 * skipped (empty) patch groups so callers can tune their delta generation logic.
 * @param engine Live RuntimeEngine session to apply the batch to.
 * @param options Patch batch and optional revision guard.
 */
export function syncSceneDelta(
	engine: RuntimeEngine,
	options: SyncSceneDeltaOptions,
): SyncSceneDeltaResult {
	const {patches, expectedRevision} = options

	// Revision guard: compare expectedRevision against the first patch's revision marker.
	// Mismatch means the caller's local state has diverged; they must recover with setGraph.
	if (expectedRevision != null && patches.length > 0) {
		const firstPatch = patches[0]
		const firstSubRevision = firstPatch.patches[0]?.revision
		if (firstSubRevision != null && String(firstSubRevision) !== String(expectedRevision)) {
			throw createRevisionMismatchError(expectedRevision, firstSubRevision)
		}
	}

	// Count empty patch groups (nothing to upsert and nothing to remove) as skipped.
	// ScenePatchGroup wraps sub-patch entries in `patches[]`; content checks must go one level down.
	let skippedPatchCount = 0
	const effectivePatches = patches.filter((pg) => {
		if (pg.patches.length === 0) {
			skippedPatchCount += 1
			return false
		}
		const hasContent = pg.patches.some((entry) => {
			const hasUpserts = (entry.upsertNodes?.length ?? 0) > 0
			const hasRemovals = (entry.removeNodeIds?.length ?? 0) > 0
			const hasReplaceAll = entry.replaceAll === true
			return hasUpserts || hasRemovals || hasReplaceAll
		})
		if (!hasContent) {
			skippedPatchCount += 1
			return false
		}
		return true
	})

	if (effectivePatches.length === 0) {
		return {applied: false, skippedPatchCount}
	}

	engine.batchUpdateGraph(effectivePatches as never)
	return {applied: true, skippedPatchCount}
}

// ---------------------------------------------------------------------------
// commitViewportState — GAP-04
// ---------------------------------------------------------------------------

/**
 * Options accepted by commitViewportState.
 */
export interface CommitViewportStateOptions {
	/** Viewport mutation input forwarded to engine setView. */
	viewport: ViewportInput
	/**
	 * Interaction phase tag (e.g. 'pinch-zoom', 'pan', 'animation') used for
	 * diagnostics and interpolation hinting; not forwarded to the engine.
	 */
	interactionPhase?: string
	/**
	 * Originating source tag (e.g. 'user-gesture', 'camera-animation', 'programmatic')
	 * used for diagnostics; not forwarded to the engine.
	 */
	source?: string
}

/**
 * Result returned by commitViewportState.
 */
export interface CommitViewportStateResult {
	/** Whether the viewport change was committed (always true; reserved for future guard). */
	committed: boolean
	/**
	 * Whether the engine clamped any viewport dimension.
	 * Derived by comparing input intent vs output snapshot on scale/offsets.
	 */
	clamped: boolean
	/** Full viewport snapshot returned by the engine after the mutation. */
	snapshot: ViewportSnapshot
}

/**
 * Commits a viewport mutation under the PRD-named commitViewportState contract.
 * Wraps engine.setView and derives clamped/committed fields from input-vs-output diff.
 * @param engine Live RuntimeEngine session to apply the viewport change to.
 * @param options Viewport mutation options with optional interaction diagnostics context.
 */
export function commitViewportState(
	engine: RuntimeEngine,
	options: CommitViewportStateOptions,
): CommitViewportStateResult {
	const {viewport} = options
	// Cast needed when engine dist is not yet built; structurally safe — EngineViewSnapshot
	// has identical shape to ViewportSnapshot (W1-T02 contract).
	const snapshot = engine.setView(viewport as never) as ViewportSnapshot

	// Detect clamping: any provided dimension that differs in the returned snapshot.
	const scaleClamped =
		viewport.scale != null && Math.abs((viewport.scale) - snapshot.scale) > 1e-9
	const offsetXClamped =
		viewport.offsetX != null && Math.abs((viewport.offsetX) - snapshot.offsetX) > 1e-9
	const offsetYClamped =
		viewport.offsetY != null && Math.abs((viewport.offsetY) - snapshot.offsetY) > 1e-9

	return {
		committed: true,
		clamped: scaleClamped || offsetXClamped || offsetYClamped,
		snapshot,
	}
}

// ---------------------------------------------------------------------------
// invalidateSceneRegions — GAP-02
// ---------------------------------------------------------------------------

/**
 * One axis-aligned region in world coordinates passed to invalidateSceneRegions.
 */
export interface SceneRegion {
	/** Region x offset in world coordinates. */
	x: number
	/** Region y offset in world coordinates. */
	y: number
	/** Region width in world coordinates. */
	width: number
	/** Region height in world coordinates. */
	height: number
}

/**
 * Options accepted by invalidateSceneRegions.
 */
export interface InvalidateSceneRegionsOptions {
	/** List of world-space dirty regions to invalidate. */
	regions: SceneRegion[]
	/** Human-readable invalidation reason forwarded to engine diagnostics. */
	reason?: string
}

/**
 * Result returned by invalidateSceneRegions.
 */
export interface InvalidateSceneRegionsResult {
	/** Number of regions submitted as individual invalidate calls. */
	accepted: number
	/** Number of regions dropped (currently always 0). */
	dropped: number
	/**
	 * Number of distinct invalidate calls made to the engine.
	 * For multi-region batches the engine receives one merged full-redraw call;
	 * in that case mergedRegionCount equals the input region count.
	 */
	mergedRegionCount: number
	/**
	 * Whether the engine was asked for a full redraw instead of granular regions.
	 * True when regions array has zero entries or more than one entry (merged path).
	 */
	fallbackFullRedraw: boolean
}

/**
 * Invalidates one or more scene regions under the PRD-named invalidateSceneRegions contract.
 * Single-region calls map 1:1 to engine.invalidate; multi-region calls merge to a full
 * redraw because the engine's current public API accepts one region per call.
 * @param engine Live RuntimeEngine session to invalidate.
 * @param options Region list and optional reason annotation.
 */
export function invalidateSceneRegions(
	engine: RuntimeEngine,
	options: InvalidateSceneRegionsOptions,
): InvalidateSceneRegionsResult {
	const {regions, reason} = options

	// Empty region list → full redraw to ensure nothing is missed.
	if (regions.length === 0) {
		engine.invalidate({reason})
		return {accepted: 0, dropped: 0, mergedRegionCount: 0, fallbackFullRedraw: true}
	}

	// Single region → precise targeted invalidation.
	if (regions.length === 1) {
		engine.invalidate({reason, region: regions[0]})
		return {accepted: 1, dropped: 0, mergedRegionCount: 1, fallbackFullRedraw: false}
	}

	// Multiple regions → merge into full redraw until engine grows a multi-region API.
	// AI-TEMP: full-redraw fallback for multi-region; remove when EngineHandle.invalidate
	//   accepts a regions[] array; ref W1-T06 GAP-02 engine-orchestration extension.
	engine.invalidate({reason})
	return {
		accepted: regions.length,
		dropped: 0,
		mergedRegionCount: regions.length,
		fallbackFullRedraw: true,
	}
}

// ---------------------------------------------------------------------------
// getRuntimeDiagnosticsSnapshot — GAP-05
// ---------------------------------------------------------------------------

/**
 * Unified runtime diagnostics snapshot merging engine-side and scheduler-side data.
 * Satisfies the PRD requirement for a single named diagnostics API.
 */
export interface RuntimeDiagnosticsSnapshot {
	/** Monotonic API version for contract-drift detection. */
	apiVersion: string
	/** Engine-side diagnostics from engine.getDiagnostics(). */
	engine: ReturnType<RuntimeEngine['getDiagnostics']>
	/** Scheduler-side diagnostics from the bridge render scheduler. */
	scheduler: ReturnType<EngineRenderScheduler['getDiagnostics']>
}

/** Stable version; bump when snapshot shape changes. */
const DIAGNOSTICS_SNAPSHOT_API_VERSION = '1.0.0'

/**
 * Returns a unified runtime diagnostics snapshot under the PRD-named contract.
 * Merges engine.getDiagnostics() and scheduler.getDiagnostics() into one typed payload.
 * @param engine Live RuntimeEngine session to read engine diagnostics from.
 * @param scheduler Active render scheduler to read scheduler diagnostics from.
 */
export function getRuntimeDiagnosticsSnapshot(
	engine: RuntimeEngine,
	scheduler: EngineRenderScheduler,
): RuntimeDiagnosticsSnapshot {
	return {
		apiVersion: DIAGNOSTICS_SNAPSHOT_API_VERSION,
		engine: engine.getDiagnostics(),
		scheduler: scheduler.getDiagnostics(),
	}
}
