import type { EnginePoint, EngineRenderableNode } from '../types/types.ts';
import type { MutableEngineSceneState } from '../patch/patch.ts';
export interface EngineHitTestResult {
    index: number;
    nodeId: string;
    nodeType: EngineRenderableNode['type'];
    hitType: 'shape-body';
    score: number;
    zOrder: number;
    hitPoint: EnginePoint;
}
export interface EngineHitExecutionSummary {
    hits: EngineHitTestResult[];
    exactCheckCount: number;
    exactCheckBudget: number;
    exactBudgetExceeded: boolean;
}
export interface EngineHitExecutionOptions {
    maxExactCandidateCount?: number;
    respectClip?: boolean;
}
export declare function hitTestEngineSceneState(state: MutableEngineSceneState, point: EnginePoint, tolerance?: number, options?: EngineHitExecutionOptions): EngineHitTestResult | null;
export declare function hitTestEngineSceneStateAll(state: MutableEngineSceneState, point: EnginePoint, tolerance?: number, options?: EngineHitExecutionOptions): EngineHitTestResult[];
export declare function hitTestEngineSceneStateAllWithSummary(state: MutableEngineSceneState, point: EnginePoint, tolerance?: number, options?: EngineHitExecutionOptions): EngineHitExecutionSummary;
