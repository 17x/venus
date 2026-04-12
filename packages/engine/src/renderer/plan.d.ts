import type { EngineRenderFrame } from './types.ts';
import type { EngineRect, EngineRenderableNode } from '../scene/types.ts';
export type EngineWorldMatrix = readonly [number, number, number, number, number, number];
export interface EnginePreparedNode {
    node: EngineRenderableNode;
    worldMatrix: EngineWorldMatrix;
    worldBounds: EngineRect | null;
    culled: boolean;
    bucketKey: string;
}
export interface EngineRenderBatch {
    key: string;
    nodeType: EngineRenderableNode['type'];
    assetId?: string;
    indices: number[];
}
export interface EngineRenderPlan {
    preparedNodes: EnginePreparedNode[];
    drawList: number[];
    batches: EngineRenderBatch[];
    stats: {
        visibleCount: number;
        culledCount: number;
    };
}
export declare function prepareEngineRenderPlan(frame: EngineRenderFrame): EngineRenderPlan;
export declare function multiplyMatrix(left: EngineWorldMatrix, right: EngineWorldMatrix): EngineWorldMatrix;
