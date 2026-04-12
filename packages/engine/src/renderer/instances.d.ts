import type { EngineRenderFrame } from './types.ts';
import type { EngineRenderPlan } from './plan.ts';
export interface EngineRenderInstanceBatch {
    key: string;
    nodeType: string;
    assetId?: string;
    count: number;
    indices: Uint32Array;
}
export interface EngineRenderInstanceView {
    count: number;
    indices: Uint32Array;
    transforms: Float32Array;
    bounds: Float32Array;
    batches: EngineRenderInstanceBatch[];
}
/**
 * Build a backend-agnostic instance view from scene-store buffers.
 *
 * The output is intentionally simple and typed-array based so future WebGL
 * backends can upload one compact render view per frame without re-walking
 * scene object trees.
 */
export declare function prepareEngineRenderInstanceView(frame: EngineRenderFrame, plan?: EngineRenderPlan): EngineRenderInstanceView;
