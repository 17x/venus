export interface EngineSpatialBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    minZ?: number;
    maxZ?: number;
}
export interface EngineSpatialItem<TMeta = unknown> extends EngineSpatialBounds {
    id: string;
    meta: TMeta;
}
/**
 * Declares spatial-dimension strategy used by the spatial index adapter.
 */
export type EngineSpatialDimension = '2d' | '3d';
/**
 * Declares options for creating one engine spatial index instance.
 */
export interface CreateEngineSpatialIndexOptions {
    /** Declares whether this index instance should run in 2D or 3D mode. */
    dimension?: EngineSpatialDimension;
}
export interface EngineSpatialIndex<TMeta = unknown> {
    clear: () => void;
    insert: (item: EngineSpatialItem<TMeta>) => void;
    load: (items: Array<EngineSpatialItem<TMeta>>) => void;
    remove: (id: string) => void;
    search: (bounds: EngineSpatialBounds) => Array<EngineSpatialItem<TMeta>>;
    update: (item: EngineSpatialItem<TMeta>) => void;
}
/**
 * Shared coarse spatial query mechanism for engine/runtime/worker consumers.
 *
 * This intentionally exposes a tiny adapter surface while keeping `rbush-3d`
 * as an implementation detail.
 * @param options Spatial index options.
 */
export declare function createEngineSpatialIndex<TMeta = unknown>(options?: CreateEngineSpatialIndexOptions): EngineSpatialIndex<TMeta>;
