import { type EngineHitTestResult } from './hitTest.ts';
import { type EngineScenePatch, type EngineScenePatchApplyResult, type EngineScenePatchBatch, type MutableEngineSceneState } from './patch.ts';
import type { EngineNodeId, EngineRect, EngineRenderableNode, EngineSceneSnapshot } from './types.ts';
import { type EngineSceneBufferLayout } from './buffer.ts';
export interface EngineSceneStoreDiagnostics {
    revision: string | number;
    nodeCount: number;
    indexedNodeCount: number;
    planVersion: number;
    bufferVersion: number;
    width: number;
    height: number;
}
export interface EngineSceneStoreTransaction {
    insertNodes(nodes: readonly EngineRenderableNode[]): void;
    updateNodes(nodes: readonly EngineRenderableNode[]): void;
    removeNodeIds(ids: readonly EngineNodeId[]): void;
    resizeScene(size: {
        width: number;
        height: number;
    }): void;
}
export interface EngineSceneStore {
    loadScene(scene: EngineSceneSnapshot): EngineScenePatchApplyResult;
    applyScenePatch(patch: EngineScenePatch): EngineScenePatchApplyResult;
    applyScenePatchBatch(batch: EngineScenePatchBatch): EngineScenePatchApplyResult;
    transaction(run: (transaction: EngineSceneStoreTransaction) => void, options?: {
        revision?: string | number;
    }): EngineScenePatchApplyResult | null;
    query(bounds: EngineRect): EngineNodeId[];
    hitTest(point: {
        x: number;
        y: number;
    }, tolerance?: number): EngineHitTestResult | null;
    getNode(nodeId: EngineNodeId): EngineRenderableNode | null;
    getSnapshot(): EngineSceneSnapshot;
    getMutableState(): MutableEngineSceneState;
    getBufferLayout(): EngineSceneBufferLayout;
    getDiagnostics(): EngineSceneStoreDiagnostics;
}
export interface CreateEngineSceneStoreOptions {
    initialScene?: EngineSceneSnapshot;
}
/**
 * Engine-owned scene store.
 *
 * Responsibility split:
 * - runtime/app layers keep document truth and produce scene patches
 * - engine owns render-facing state, indexes, and query/hit-test surfaces
 *
 * This keeps buffer/index evolution inside engine without forcing external
 * callers to mutate low-level memory structures directly.
 */
export declare function createEngineSceneStore(options?: CreateEngineSceneStoreOptions): EngineSceneStore;
