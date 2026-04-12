import { type EngineSpatialIndex } from '../spatial/index.ts';
import type { EngineNodeId, EngineRenderableNode } from './types.ts';
export interface EngineSceneSpatialMeta {
    nodeType: EngineRenderableNode['type'];
}
export declare function createEngineSceneSpatialIndex(): EngineSpatialIndex<EngineSceneSpatialMeta>;
export declare function createEngineSceneNodeMap(nodes: readonly EngineRenderableNode[]): Map<string, EngineRenderableNode>;
export declare function loadEngineSceneSpatialIndex(index: EngineSpatialIndex<EngineSceneSpatialMeta>, nodes: readonly EngineRenderableNode[]): void;
export declare function removeEngineSceneNodeSubtree(node: EngineRenderableNode, nodeMap: Map<EngineNodeId, EngineRenderableNode>, spatialIndex: EngineSpatialIndex<EngineSceneSpatialMeta>): void;
export declare function upsertEngineSceneNodeSubtree(node: EngineRenderableNode, nodeMap: Map<EngineNodeId, EngineRenderableNode>, spatialIndex: EngineSpatialIndex<EngineSceneSpatialMeta>): void;
