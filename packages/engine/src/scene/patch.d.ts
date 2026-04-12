import type { EngineNodeId, EngineRenderableNode, EngineSceneSnapshot } from './types.ts';
import type { EngineSpatialIndex } from '../spatial/index.ts';
import { type EngineSceneSpatialMeta } from './indexing.ts';
export type EngineSceneDirtyKind = 'structure' | 'geometry' | 'transform' | 'style' | 'resource';
export interface EngineScenePatch {
    revision: string | number;
    replaceAll?: boolean;
    upsertNodes?: readonly EngineRenderableNode[];
    removeNodeIds?: readonly EngineNodeId[];
    sceneSize?: {
        width: number;
        height: number;
    };
}
export interface EngineScenePatchBatch {
    patches: readonly EngineScenePatch[];
}
export interface EngineScenePatchApplyResult {
    revision: string | number;
    structureDirty: boolean;
    sceneSizeDirty: boolean;
    dirtyNodeIds: readonly EngineNodeId[];
    removedNodeIds: readonly EngineNodeId[];
    dirtyKindsByNodeId: Readonly<Record<EngineNodeId, readonly EngineSceneDirtyKind[]>>;
}
export interface MutableEngineSceneState {
    revision: string | number;
    width: number;
    height: number;
    nodes: EngineRenderableNode[];
    nodeMap: Map<EngineNodeId, EngineRenderableNode>;
    spatialIndex: EngineSpatialIndex<EngineSceneSpatialMeta>;
}
export declare function createMutableEngineSceneState(scene?: EngineSceneSnapshot): MutableEngineSceneState;
/**
 * Applies an incremental scene patch while preserving existing node order
 * whenever possible.
 */
export declare function applyEngineScenePatch(state: MutableEngineSceneState, patch: EngineScenePatch): EngineScenePatchApplyResult;
export declare function applyEngineScenePatchBatch(state: MutableEngineSceneState, batch: EngineScenePatchBatch): EngineScenePatchApplyResult;
export declare function flattenEngineSceneNodes(nodes: readonly EngineRenderableNode[]): EngineRenderableNode[];
export declare function resolveNodeByFlattenedIndex(nodes: readonly EngineRenderableNode[], targetIndex: number): EngineRenderableNode | null;
