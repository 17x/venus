import { type EngineCanvasViewportState } from '../interaction/viewport.ts';
import type { EngineBackend, EngineRenderQuality, EngineRenderStats, EngineResourceLoader, EngineTextShaper } from '../renderer/types.ts';
import { type EngineSceneStoreDiagnostics, type EngineSceneStoreTransaction } from '../scene/store.ts';
import type { EngineHitTestResult } from '../scene/hitTest.ts';
import type { EngineNodeId, EngineRect, EngineRenderableNode, EngineSceneSnapshot } from '../scene/types.ts';
import type { EngineScenePatchApplyResult, EngineScenePatchBatch } from '../scene/patch.ts';
import { type EngineClock } from '../time/index.ts';
interface EnginePerformanceOptions {
    culling?: boolean;
    lod?: boolean;
}
interface EngineRenderOptions {
    quality?: EngineRenderQuality;
    canvasClearColor?: string;
    webglClearColor?: readonly [number, number, number, number];
    dpr?: number | 'auto';
    pixelRatio?: number | 'auto';
    maxPixelRatio?: number;
    imageSmoothing?: boolean;
    imageSmoothingQuality?: ImageSmoothingQuality;
    webglAntialias?: boolean;
}
interface EngineResourceOptions {
    loader?: EngineResourceLoader;
    textShaper?: EngineTextShaper;
}
interface EngineDebugOptions {
    onStats?: (stats: EngineRenderStats) => void;
}
interface EngineViewportOptions {
    viewportWidth?: number;
    viewportHeight?: number;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
}
export interface CreateEngineOptions {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    backend?: EngineBackend;
    initialScene?: EngineSceneSnapshot;
    viewport?: EngineViewportOptions;
    performance?: EnginePerformanceOptions;
    render?: EngineRenderOptions;
    resource?: EngineResourceOptions;
    debug?: EngineDebugOptions;
    clock?: EngineClock;
}
export interface EngineRuntimeDiagnostics {
    backend: EngineBackend;
    renderStats: EngineRenderStats | null;
    pixelRatio: number;
    scene: EngineSceneStoreDiagnostics;
    viewport: Pick<EngineCanvasViewportState, 'scale' | 'offsetX' | 'offsetY' | 'viewportWidth' | 'viewportHeight'>;
}
export interface Engine {
    loadScene(scene: EngineSceneSnapshot): EngineScenePatchApplyResult;
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
    setViewport(next: EngineViewportOptions): EngineCanvasViewportState;
    panBy(deltaX: number, deltaY: number): EngineCanvasViewportState;
    zoomTo(scale: number, anchor?: {
        x: number;
        y: number;
    }): EngineCanvasViewportState;
    resize(width: number, height: number): EngineCanvasViewportState;
    setDpr(dpr: number | 'auto', options?: {
        maxDpr?: number;
    }): number;
    setQuality(quality: EngineRenderQuality): void;
    setResourceLoader(loader?: EngineResourceLoader): void;
    setTextShaper(textShaper?: EngineTextShaper): void;
    renderFrame(): Promise<EngineRenderStats>;
    start(): void;
    stop(): void;
    isRunning(): boolean;
    getDiagnostics(): EngineRuntimeDiagnostics;
    dispose(): void;
}
/**
 * High-level engine facade with:
 * - one default renderer entry (`canvas2d` or `webgl`)
 * - batch-first scene mutation APIs
 * - optional render/resource/debug tuning grouped by concern
 */
export declare function createEngine(options: CreateEngineOptions): Engine;
export {};
