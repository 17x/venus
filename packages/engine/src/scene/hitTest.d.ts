import type { EnginePoint, EngineRenderableNode } from './types.ts';
import type { MutableEngineSceneState } from './patch.ts';
export interface EngineHitTestResult {
    index: number;
    nodeId: string;
    nodeType: EngineRenderableNode['type'];
    hitType: 'shape-body';
    score: number;
    zOrder: number;
    hitPoint: EnginePoint;
}
export declare function hitTestEngineSceneState(state: MutableEngineSceneState, point: EnginePoint, tolerance?: number): EngineHitTestResult | null;
export declare function hitTestEngineSceneStateAll(state: MutableEngineSceneState, point: EnginePoint, tolerance?: number): EngineHitTestResult[];
