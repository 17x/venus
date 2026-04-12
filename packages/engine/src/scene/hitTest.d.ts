import type { EnginePoint, EngineRenderableNode } from './types.ts';
import type { MutableEngineSceneState } from './patch.ts';
export interface EngineHitTestResult {
    index: number;
    nodeId: string;
    nodeType: EngineRenderableNode['type'];
}
export declare function hitTestEngineSceneState(state: MutableEngineSceneState, point: EnginePoint, tolerance?: number): EngineHitTestResult | null;
