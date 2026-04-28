export interface EngineSpatialBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface EngineSpatialItem<TMeta = unknown> extends EngineSpatialBounds {
    id: string;
    meta: TMeta;
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
 * This intentionally exposes a tiny adapter surface while keeping `rbush`
 * as an implementation detail.
 */
export declare function createEngineSpatialIndex<TMeta = unknown>(): EngineSpatialIndex<TMeta>;
