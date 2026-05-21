import type { EngineRenderFrame } from '../types/index.ts';
import type { EngineRect, EngineRenderableNode } from '../../scene/types/types.ts';
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
        collapsedGroupCount: number;
        collapsedDescendantCulledCount: number;
        geometryCacheHitCount: number;
        geometryCacheMissCount: number;
        geometryCacheHitRate: number;
    };
}
export interface EngineRenderPlanCacheDiagnostics {
    geometryCacheHitCount: number;
    geometryCacheMissCount: number;
    geometryCacheHitRate: number;
}
export declare function getEngineRenderPlanCacheDiagnostics(): EngineRenderPlanCacheDiagnostics;
export declare function prepareEngineRenderPlan(frame: EngineRenderFrame): EngineRenderPlan;
export declare function multiplyMatrix(left: EngineWorldMatrix, right: EngineWorldMatrix): EngineWorldMatrix;
