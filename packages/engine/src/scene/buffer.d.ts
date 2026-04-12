import type { EngineNodeId, EngineRenderableNode, EngineSceneSnapshot } from './types.ts';
export interface EngineSceneBufferLayout {
    capacity: number;
    count: number;
    nodeIds: Array<string | null>;
    slotByNodeId: Map<EngineNodeId, number>;
    kindCodes: Uint8Array;
    parentIndices: Int32Array;
    dirtyFlags: Uint32Array;
    bounds: Float32Array;
    transform: Float32Array;
    order: Uint32Array;
}
export declare function createEngineSceneBufferLayout(scene: Pick<EngineSceneSnapshot, 'nodes'>): EngineSceneBufferLayout;
export declare function syncEngineSceneBufferLayout(layout: EngineSceneBufferLayout, scene: Pick<EngineSceneSnapshot, 'nodes'>, options?: {
    dirtyNodeIds?: readonly EngineNodeId[];
    removedNodeIds?: readonly EngineNodeId[];
    structureDirty?: boolean;
}): void;
export declare function writeSceneToBufferLayout(layout: EngineSceneBufferLayout, nodes: readonly EngineRenderableNode[]): void;
