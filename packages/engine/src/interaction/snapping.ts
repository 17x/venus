import { createEngineSpatialIndex } from "../spatial/engineSpatialIndex";

/**
 * Declares one snapping axis.
 */
export type EngineSnapAxis = "x" | "y";

/**
 * Declares one resolved snap guide.
 */
export interface EngineSnapGuide {
	/** Snap axis. */
	axis: EngineSnapAxis;
	/** Snapped world coordinate value. */
	value: number;
	/** Guide anchor kind. */
	kind: "edge-min" | "edge-max" | "center";
}

/**
 * Declares move-snap options.
 */
export interface EngineMoveSnapOptions {
	/** Optional snapping tolerance in world units. */
	tolerance?: number;
}

/**
 * Declares one movable shape for preview snapping.
 */
interface EngineMoveSnapShape {
	/** Shape identifier. */
	shapeId: string;
	/** Shape x position. */
	x: number;
	/** Shape y position. */
	y: number;
	/** Shape width. */
	width: number;
	/** Shape height. */
	height: number;
}

/**
 * Declares one move-snap preview payload.
 */
export interface EngineMoveSnapPreview {
	/** Shapes currently being moved. */
	shapes: EngineMoveSnapShape[];
}

/**
 * Declares one static scene shape for snapping candidates.
 */
interface EngineSnapSceneShape {
	/** Shape id. */
	id: string;
	/** Shape x position. */
	x: number;
	/** Shape y position. */
	y: number;
	/** Shape width. */
	width: number;
	/** Shape height. */
	height: number;
}

/**
 * Declares scene payload for move-snap candidate search.
 */
interface EngineSnapScene {
	/** All snap candidate shapes in the scene. */
	shapes: EngineSnapSceneShape[];
}

/**
 * Declares one snap-guide line segment payload for compatibility callsites.
 */
export interface EngineSnapGuideLine {
	/** Stable guide line id for keyed rendering. */
	id: string;
	/** Start-point x coordinate in viewport space. */
	x1: number;
	/** Start-point y coordinate in viewport space. */
	y1: number;
	/** End-point x coordinate in viewport space. */
	x2: number;
	/** End-point y coordinate in viewport space. */
	y2: number;
}

interface EngineBounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

type EngineSnapSpatialIndex = ReturnType<typeof createEngineSpatialIndex<{ shapeId: string }>>;

const snapIndexCache = new WeakMap<EngineSnapScene, EngineSnapSpatialIndex>();
const snapIndexShapesCache = new WeakMap<EngineSnapScene["shapes"], EngineSnapSpatialIndex>();
const DEFAULT_SNAP_TOLERANCE = 6;
const BOUNDS_CENTER_DIVISOR = 2;

/**
 * Resolves move-snap preview guides and offsets for an in-progress move interaction.
 * @param preview Moving-shapes preview payload.
 * @param scene Scene snapshot used for candidate guide extraction.
 * @param options Optional snapping controls such as tolerance.
 */
export function resolveEngineMoveSnapPreview<TShape extends EngineMoveSnapShape>(
	preview: EngineMoveSnapPreview & { shapes: TShape[] },
	scene: EngineSnapScene,
	options?: EngineMoveSnapOptions,
): { preview: { shapes: TShape[] }; guides: EngineSnapGuide[] } {
	const tolerance = options?.tolerance ?? DEFAULT_SNAP_TOLERANCE;
	const previewBounds = resolvePreviewBounds(preview.shapes);
	if (!previewBounds) {
		return {
			preview,
			guides: [],
		};
	}

	const movingIds = new Set(preview.shapes.map((shape) => shape.shapeId));
	const candidates = collectBoundsSnapCandidates(scene, movingIds, previewBounds, tolerance);
	const xSources = [
		{ value: previewBounds.minX, kind: "edge-min" as const },
		{
			value: (previewBounds.minX + previewBounds.maxX) / BOUNDS_CENTER_DIVISOR,
			kind: "center" as const,
		},
		{ value: previewBounds.maxX, kind: "edge-max" as const },
	];
	const ySources = [
		{ value: previewBounds.minY, kind: "edge-min" as const },
		{
			value: (previewBounds.minY + previewBounds.maxY) / BOUNDS_CENTER_DIVISOR,
			kind: "center" as const,
		},
		{ value: previewBounds.maxY, kind: "edge-max" as const },
	];

	const snapX = resolveBestAxisSnap(xSources, candidates.x, tolerance);
	const snapY = resolveBestAxisSnap(ySources, candidates.y, tolerance);
	const offsetX = snapX?.delta ?? 0;
	const offsetY = snapY?.delta ?? 0;
	const snappedPreview =
		offsetX !== 0 || offsetY !== 0
			? {
					shapes: preview.shapes.map((shape) => ({
						...shape,
						x: shape.x + offsetX,
						y: shape.y + offsetY,
					})) as TShape[],
				}
			: preview;
	const guides: EngineSnapGuide[] = [];

	if (snapX) {
		guides.push({
			axis: "x",
			value: snapX.snapped,
			kind: snapX.kind,
		});
	}
	if (snapY) {
		guides.push({
			axis: "y",
			value: snapY.snapped,
			kind: snapY.kind,
		});
	}

	return {
		preview: snappedPreview,
		guides,
	};
}

/**
 * Resolves aggregate bounds for all moving preview shapes.
 * @param shapes Moving preview shapes.
 */
function resolvePreviewBounds<TShape extends EngineMoveSnapShape>(shapes: TShape[]): EngineBounds | null {
	if (shapes.length === 0) {
		return null;
	}

	const first = toBounds(shapes[0].x, shapes[0].y, shapes[0].width, shapes[0].height);
	return shapes
		.slice(1)
		.map((shape) => toBounds(shape.x, shape.y, shape.width, shape.height))
		.reduce(
			(acc, bounds) => ({
				minX: Math.min(acc.minX, bounds.minX),
				minY: Math.min(acc.minY, bounds.minY),
				maxX: Math.max(acc.maxX, bounds.maxX),
				maxY: Math.max(acc.maxY, bounds.maxY),
			}),
			first,
		);
}

/**
 * Collects x/y snap anchors from nearby static scene shapes.
 * @param scene Scene snapshot.
 * @param excludeIds Moving shape ids to ignore.
 * @param previewBounds Moving preview aggregate bounds.
 * @param tolerance Snap tolerance.
 */
function collectBoundsSnapCandidates(
	scene: EngineSnapScene,
	excludeIds: Set<string>,
	previewBounds: EngineBounds,
	tolerance: number,
) {
	const index = getOrCreateSnapIndex(scene);
	const nearby = index.search({
		minX: previewBounds.minX - tolerance,
		minY: previewBounds.minY - tolerance,
		maxX: previewBounds.maxX + tolerance,
		maxY: previewBounds.maxY + tolerance,
	});
	const x = new Set<number>();
	const y = new Set<number>();

	nearby.forEach((item) => {
		if (excludeIds.has(item.meta.shapeId)) {
			return;
		}

		x.add(item.minX);
		x.add((item.minX + item.maxX) / BOUNDS_CENTER_DIVISOR);
		x.add(item.maxX);
		y.add(item.minY);
		y.add((item.minY + item.maxY) / BOUNDS_CENTER_DIVISOR);
		y.add(item.maxY);
	});

	return {
		x: Array.from(x.values()),
		y: Array.from(y.values()),
	};
}

/**
 * Resolves or builds one cached spatial index for scene snapping candidates.
 * @param scene Scene snapshot.
 */
function getOrCreateSnapIndex(scene: EngineSnapScene): EngineSnapSpatialIndex {
	const cached = snapIndexCache.get(scene);
	if (cached) {
		return cached;
	}

	const byShapes = snapIndexShapesCache.get(scene.shapes);
	if (byShapes) {
		snapIndexCache.set(scene, byShapes);
		return byShapes;
	}

	const index = createEngineSpatialIndex<{ shapeId: string }>({ dimension: "2d" });
	index.load(
		scene.shapes.map((shape) => {
			const bounds = toBounds(shape.x, shape.y, shape.width, shape.height);
			return {
				id: shape.id,
				minX: bounds.minX,
				minY: bounds.minY,
				maxX: bounds.maxX,
				maxY: bounds.maxY,
				meta: {
					shapeId: shape.id,
				},
			};
		}),
	);

	snapIndexCache.set(scene, index);
	snapIndexShapesCache.set(scene.shapes, index);
	return index;
}

/**
 * Resolves best snap candidate on one axis.
 * @param sources Candidate source anchors from moving preview bounds.
 * @param candidates Candidate anchors from nearby static shapes.
 * @param tolerance Snap tolerance.
 */
function resolveBestAxisSnap(
	sources: Array<{ value: number; kind: EngineSnapGuide["kind"] }>,
	candidates: number[],
	tolerance: number,
): { delta: number; snapped: number; kind: EngineSnapGuide["kind"] } | null {
	let best: { delta: number; snapped: number; kind: EngineSnapGuide["kind"] } | null = null;

	for (const source of sources) {
		for (const candidate of candidates) {
			const delta = candidate - source.value;
			const absDelta = Math.abs(delta);
			if (absDelta > tolerance) {
				continue;
			}

			if (!best || absDelta < Math.abs(best.delta)) {
				best = {
					delta,
					snapped: candidate,
					kind: source.kind,
				};
			}
		}
	}

	return best;
}

/**
 * Normalizes one rectangle-like payload into bounds.
 * @param x X coordinate.
 * @param y Y coordinate.
 * @param width Shape width.
 * @param height Shape height.
 */
function toBounds(x: number, y: number, width: number, height: number): EngineBounds {
	const minX = Math.min(x, x + width);
	const maxX = Math.max(x, x + width);
	const minY = Math.min(y, y + height);
	const maxY = Math.max(y, y + height);
	return {
		minX,
		minY,
		maxX,
		maxY,
	};
}
