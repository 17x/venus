import { type EngineCanvasViewportState } from '../interaction/viewport.ts';
import type { EngineRenderQuality, EngineRenderStats, EngineResourceLoader, EngineTextShaper } from '../renderer/types.ts';
import { type EngineSceneStoreDiagnostics, type EngineSceneStoreTransaction } from '../scene/store.ts';
import { type EngineFramePlan } from '../scene/framePlan.ts';
import { type EngineHitPlan } from '../scene/hitPlan.ts';
import type { EngineHitTestResult } from '../scene/hitTest.ts';
import type { EngineNodeId, EngineRect, EngineRenderableNode, EngineSceneSnapshot } from '../scene/types.ts';
import type { EngineScenePatchApplyResult, EngineScenePatchBatch } from '../scene/patch.ts';
import { type EngineClock } from '../time/index.ts';
interface EnginePerformanceOptions {
    culling?: boolean;
    lod?: boolean;
}
interface EngineOverscanOptions {
    enabled?: boolean;
    borderPx?: number;
}
interface EngineRenderOptions {
    quality?: EngineRenderQuality;
    webglClearColor?: readonly [number, number, number, number];
    dpr?: number | 'auto';
    pixelRatio?: number | 'auto';
    maxPixelRatio?: number;
    webglAntialias?: boolean;
    lod?: import("../index.ts").EngineLodConfig;
    tileConfig?: import("../index.ts").EngineTileConfig;
    initialRender?: import("../index.ts").EngineInitialRenderConfig;
    interactionPreview?: import("../renderer/types.ts").EngineInteractionPreviewConfig;
    shortlist?: {
        enabled?: boolean;
        minSceneNodes?: number;
        ratioThreshold?: number;
        hysteresisRatio?: number;
        stableFrameCount?: number;
    };
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
    initialScene?: EngineSceneSnapshot;
    viewport?: EngineViewportOptions;
    /** Top-level culling switch for host integration. */
    culling?: boolean;
    /** Top-level LOD config; disabling keeps full-detail rendering. */
    lod?: import("../index.ts").EngineLodConfig;
    /** Top-level overscan config merged into tileConfig when present. */
    overscan?: EngineOverscanOptions;
    performance?: EnginePerformanceOptions;
    render?: EngineRenderOptions;
    resource?: EngineResourceOptions;
    debug?: EngineDebugOptions;
    clock?: EngineClock;
}
export interface EngineRuntimeDiagnostics {
    backend: 'webgl';
    renderStats: EngineRenderStats | null;
    pixelRatio: number;
    scene: EngineSceneStoreDiagnostics;
    framePlan: EngineFramePlan | null;
    hitPlan: EngineHitPlan | null;
    shortlist: {
        active: boolean;
        candidateRatio: number;
        appliedCandidateCount: number;
        pendingState: boolean | null;
        pendingFrameCount: number;
        toggleCount: number;
        debounceBlockedToggleCount: number;
        minSceneNodes: number;
        ratioThreshold: number;
        hysteresisRatio: number;
        enterRatioThreshold: number;
        leaveRatioThreshold: number;
        stableFrameCount: number;
    };
    viewport: Pick<EngineCanvasViewportState, 'scale' | 'offsetX' | 'offsetY' | 'viewportWidth' | 'viewportHeight'>;
}
export interface Engine {
    loadScene(scene: EngineSceneSnapshot): EngineScenePatchApplyResult;
    applyScenePatchBatch(batch: EngineScenePatchBatch): EngineScenePatchApplyResult;
    transaction(run: (transaction: EngineSceneStoreTransaction) => void, options?: {
        revision?: string | number;
    }): EngineScenePatchApplyResult | null;
    queryViewportCandidates(padding?: number): EngineNodeId[];
    queryPointCandidates(point: {
        x: number;
        y: number;
    }, tolerance?: number): EngineNodeId[];
    prepareFramePlan(padding?: number): EngineFramePlan;
    prepareHitPlan(point: {
        x: number;
        y: number;
    }, tolerance?: number): EngineHitPlan;
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
    setProtectedNodeIds(nodeIds?: readonly EngineNodeId[]): void;
    setResourceLoader(loader?: EngineResourceLoader): void;
    setTextShaper(textShaper?: EngineTextShaper): void;
    markDirtyBounds(bounds: EngineRect, zoomLevel?: number): void;
    renderFrame(): Promise<EngineRenderStats>;
    start(): void;
    stop(): void;
    isRunning(): boolean;
    getDiagnostics(): EngineRuntimeDiagnostics;
    dispose(): void;
}
/**
 * High-level engine facade with:
 * - one default WebGL renderer entry
 * - batch-first scene mutation APIs
 * - optional render/resource/debug tuning grouped by concern
 */
export declare function createEngine(options: CreateEngineOptions): Engine;
export {};
