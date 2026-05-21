import { RBush3D, type BBox } from "rbush-3d";

/**
 * Declares one spatial item payload stored and queried by engine indices.
 */
export interface EngineSpatialItem<TMeta = unknown> {
	/** Minimum x coordinate. */
	minX: number;
	/** Minimum y coordinate. */
	minY: number;
	/** Maximum x coordinate. */
	maxX: number;
	/** Maximum y coordinate. */
	maxY: number;
	/** Optional minimum z coordinate. */
	minZ?: number;
	/** Optional maximum z coordinate. */
	maxZ?: number;
	/** Stable item identifier used for update/remove semantics. */
	id: string;
	/** Opaque metadata payload carried through query results. */
	meta: TMeta;
}

/**
 * Declares bounds used for spatial inserts and searches.
 */
interface EngineSpatialBounds {
	/** Minimum x coordinate. */
	minX: number;
	/** Minimum y coordinate. */
	minY: number;
	/** Maximum x coordinate. */
	maxX: number;
	/** Maximum y coordinate. */
	maxY: number;
	/** Optional minimum z coordinate. */
	minZ?: number;
	/** Optional maximum z coordinate. */
	maxZ?: number;
}

/**
 * Declares supported dimension mode for one spatial index instance.
 */
type EngineSpatialDimension = "2d" | "3d";

/**
 * Declares options for constructing one spatial index.
 */
interface CreateEngineSpatialIndexOptions {
	/** Dimension mode for normalization/query behavior. */
	dimension?: EngineSpatialDimension;
}

/**
 * Declares the public spatial index contract returned by the factory.
 */
export interface EngineSpatialIndex<TMeta = unknown> {
	/** Clears all indexed items. */
	clear: () => void;
	/** Inserts one item into the index. */
	insert: (item: EngineSpatialItem<TMeta>) => void;
	/** Replaces tree content with the provided item batch. */
	load: (items: Array<EngineSpatialItem<TMeta>>) => void;
	/** Removes one item by id if present. */
	remove: (id: string) => void;
	/** Returns items overlapping provided bounds. */
	search: (bounds: EngineSpatialBounds) => Array<EngineSpatialItem<TMeta>>;
	/** Updates one item by id via replace semantics. */
	update: (item: EngineSpatialItem<TMeta>) => void;
}

interface EngineSpatialItem3D<TMeta = unknown> {
	minX: number;
	minY: number;
	minZ: number;
	maxX: number;
	maxY: number;
	maxZ: number;
	id: string;
	meta: TMeta;
}

type EngineSpatialBBox<TMeta = unknown> = BBox & EngineSpatialItem3D<TMeta>;

/**
 * Creates the canonical spatial index adapter used by engine/runtime/worker layers.
 * @param options Spatial index creation options including 2D/3D dimension mode.
 */
export function createEngineSpatialIndex<TMeta = unknown>(
	options: CreateEngineSpatialIndexOptions = {},
): EngineSpatialIndex<TMeta> {
	const dimension: EngineSpatialDimension = options.dimension ?? "3d";
	const tree = new RBush3D();
	// Keep stable references by id so remove/update can evict previous entries precisely.
	const itemMap = new Map<string, EngineSpatialBBox<TMeta>>();

	/**
	 * Casts one normalized 3D item into the rbush-compatible bbox payload shape.
	 * @param item Normalized 3D item payload.
	 */
	function toSpatialBBox(item: EngineSpatialItem3D<TMeta>): EngineSpatialBBox<TMeta> {
		return item as EngineSpatialBBox<TMeta>;
	}

	/**
	 * Normalizes one user-provided spatial item into 3D bounds.
	 * @param item Public spatial item payload.
	 */
	function toSpatialItem3D(item: EngineSpatialItem<TMeta>): EngineSpatialItem3D<TMeta> {
		if (dimension === "2d") {
			// In 2D mode we force a zero-thickness z slice to preserve old 2D semantics.
			return {
				minX: item.minX,
				minY: item.minY,
				minZ: 0,
				maxX: item.maxX,
				maxY: item.maxY,
				maxZ: 0,
				id: item.id,
				meta: item.meta,
			};
		}

		return {
			minX: item.minX,
			minY: item.minY,
			minZ: item.minZ ?? 0,
			maxX: item.maxX,
			maxY: item.maxY,
			maxZ: item.maxZ ?? 0,
			id: item.id,
			meta: item.meta,
		};
	}

	/**
	 * Normalizes one search bounds payload into 3D space for tree queries.
	 * @param bounds Search bounds payload.
	 */
	function toSearchBounds3D(bounds: EngineSpatialBounds): EngineSpatialItem3D<TMeta> {
		return {
			minX: bounds.minX,
			minY: bounds.minY,
			// Keep deterministic behavior by searching all Z slices when none are provided.
			minZ: bounds.minZ ?? Number.NEGATIVE_INFINITY,
			maxX: bounds.maxX,
			maxY: bounds.maxY,
			maxZ: bounds.maxZ ?? Number.POSITIVE_INFINITY,
			id: "__search__",
			meta: undefined as TMeta,
		};
	}

	/**
	 * Maps one rbush record back into the public spatial item contract.
	 * @param item Tree item payload.
	 */
	function toSpatialItem(item: EngineSpatialItem3D<TMeta>): EngineSpatialItem<TMeta> {
		return {
			minX: item.minX,
			minY: item.minY,
			minZ: item.minZ,
			maxX: item.maxX,
			maxY: item.maxY,
			maxZ: item.maxZ,
			id: item.id,
			meta: item.meta,
		};
	}

	return {
		clear() {
			tree.clear();
			itemMap.clear();
		},
		/**
		 * Inserts one item and replaces any previous record with the same id.
		 * @param item Spatial item payload.
		 */
		insert(item) {
			const normalizedItem = toSpatialItem3D(item);
			const normalizedBbox = toSpatialBBox(normalizedItem);
			const previous = itemMap.get(normalizedItem.id);
			if (previous) {
				tree.remove(previous, (left, right) => left.id === right.id);
			}

			tree.insert(normalizedBbox);
			itemMap.set(normalizedItem.id, normalizedBbox);
		},
		/**
		 * Bulk-loads items and rebuilds id lookup for subsequent update/remove operations.
		 * @param items Spatial item payload array.
		 */
		load(items) {
			const normalizedItems = items.map((item) => toSpatialBBox(toSpatialItem3D(item)));
			tree.clear();
			tree.load(normalizedItems);
			itemMap.clear();
			normalizedItems.forEach((item) => {
				itemMap.set(item.id, item);
			});
		},
		/**
		 * Removes one item by id if present.
		 * @param id Item id to remove.
		 */
		remove(id) {
			const previous = itemMap.get(id);
			if (!previous) {
				return;
			}

			tree.remove(previous, (left, right) => left.id === right.id);
			itemMap.delete(id);
		},
		/**
		 * Searches tree candidates overlapping the provided bounds.
		 * @param bounds Query bounds payload.
		 */
		search(bounds) {
			const results = tree.search(
				toSpatialBBox(toSearchBounds3D(bounds)),
			) as EngineSpatialBBox<TMeta>[];
			return results.map((item) => toSpatialItem(item));
		},
		/**
		 * Updates one item by id via remove+insert semantics.
		 * @param item Spatial item payload.
		 */
		update(item) {
			const normalizedItem = toSpatialItem3D(item);
			const normalizedBbox = toSpatialBBox(normalizedItem);
			const previous = itemMap.get(normalizedItem.id);
			if (previous) {
				tree.remove(previous, (left, right) => left.id === right.id);
			}

			tree.insert(normalizedBbox);
			itemMap.set(normalizedItem.id, normalizedBbox);
		},
	};
}
