import { type EngineCanvasViewportState } from '../../interaction/viewport/viewport.ts';
import type { EngineOverlayDrawNode } from '../../interaction/overlayCanvas.ts';
import type { EngineLodConfig } from '../../interaction/lodConfig.ts';
import type { EngineTileConfig } from '../../renderer/tileManager/index.ts';
import type { EngineInitialRenderConfig } from '../../renderer/initialRender/index.ts';
import type { EngineEasingDefinition } from '../../animation/index.ts';
import type { EngineInteractionPreviewConfig, EngineRenderQuality, EngineRenderStats, EngineRenderSurfaceSize, EngineResourceLoader, EngineTextShaper } from '../../renderer/types/index.ts';
import { type EngineSceneStoreDiagnostics, type EngineSceneStoreTransaction } from '../../scene/store/store.ts';
import { type EngineFramePlan } from '../../scene/framePlan.ts';
import { type EngineHitPlan } from '../../scene/hitPlan.ts';
import type { EngineHitExecutionOptions, EngineHitTestResult } from '../../scene/hitTest/hitTest.ts';
import type { EngineNodeId, EngineRect, EngineRenderableNode, EngineSceneSnapshot } from '../../scene/types/types.ts';
import type { EngineScenePatchApplyResult, EngineScenePatchBatch } from '../../scene/patch/patch.ts';
import { type EngineClock } from '../../time/index.ts';
import type { EngineRenderFallbackReason } from '../../renderer/fallbackTaxonomy/index.ts';
import type { EngineInteractionMutationKind, EngineRenderStrategyPhase } from './strategy/strategy.ts';
import type { EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts';
type EnginePerformanceToggle<TOptions> = boolean | TOptions;
export interface EngineCullingOptions {
    enabled?: boolean;
}
export interface EngineOverscanOptions {
    enabled?: boolean;
    borderPx?: number;
}
export interface EnginePerformanceOptionsObject {
    overscan?: EnginePerformanceToggle<EngineOverscanOptions>;
    tiles?: EnginePerformanceToggle<EngineTileConfig>;
    culling?: EnginePerformanceToggle<EngineCullingOptions>;
    lod?: EnginePerformanceToggle<EngineLodConfig>;
}
export type EnginePerformanceOptions = boolean | EnginePerformanceOptionsObject;
interface EngineRenderOptions {
    quality?: EngineRenderQuality;
    webglClearColor?: readonly [number, number, number, number];
    dpr?: number | 'auto';
    pixelRatio?: number | 'auto';
    maxPixelRatio?: number;
    webglAntialias?: boolean;
    lod?: EngineLodConfig;
    tileConfig?: EngineTileConfig;
    initialRender?: EngineInitialRenderConfig;
    interactionPreview?: EngineInteractionPreviewConfig;
    modelCompleteComposite?: boolean;
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
export interface EngineViewportOptions {
    viewportWidth?: number;
    viewportHeight?: number;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
}
export interface EngineCameraAnimationOptions {
    durationMs?: number;
    easing?: EngineEasingDefinition;
    cachePreviewOnly?: boolean;
}
export interface EngineHostEnvironment {
    resolvePixelRatio?: () => number;
    createCanvasSurface?: import("../../renderer/types/index.ts").EngineCanvasSurfaceFactory['createSurface'];
}
export interface CreateEngineOptions {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    initialScene?: EngineSceneSnapshot;
    viewport?: EngineViewportOptions;
    culling?: boolean;
    lod?: EngineLodConfig;
    overscan?: EngineOverscanOptions;
    performance?: EnginePerformanceOptions;
    render?: EngineRenderOptions;
    resource?: EngineResourceOptions;
    debug?: EngineDebugOptions;
    clock?: EngineClock;
    host?: EngineHostEnvironment;
}
export interface EngineResizeOptions extends EngineRenderSurfaceSize {
}
export interface EngineRuntimeDiagnostics {
    backend: 'webgl';
    renderStats: EngineRenderStats | null;
    pixelRatio: number;
    outputPixelRatio: number;
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
    cameraAnimation: {
        active: boolean;
        cachePreviewOnly: boolean;
        previewHitCount: number;
        previewMissCount: number;
    };
    strategy: {
        phase: EngineRenderStrategyPhase;
        interactionActive: boolean;
        quality: EngineRenderQuality;
        lastInteractionKind: EngineInteractionMutationKind;
        lastInteractionElapsedMs: number;
    };
    predictor: {
        directionX: number;
        directionY: number;
        speedPxPerSec: number;
        confidence: number;
    };
    budget: {
        pressure: EngineFrameBudgetPressure;
        drawSubmitBudgetMs: number;
        textureUploadBudgetBytes: number;
        textureUploadTotalBudgetBytes: number;
        imageTextureUploadMaxCount: number;
        textTextureUploadMaxCount: number;
        tilePreloadBudgetMs: number;
        tilePreloadMaxUploads: number;
        overlayPassBudgetMs: number;
    };
    strategySnapshot: {
        lane: EngineRenderStrategyPhase;
        budgetPressure: EngineFrameBudgetPressure;
        fallbackReason: EngineRenderFallbackReason | null;
        predictorConfidence: number;
    };
    settleSharpness: {
        pending: boolean;
        remainingDeadlineMs: number;
        forceSharpFrame: boolean;
        metCount: number;
        missCount: number;
        lastLatencyMs: number;
        lastMissLatencyMs: number;
        highZoomTextSlaCheckedCount: number;
        highZoomTextSlaViolationCount: number;
    };
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
    }, tolerance?: number, options?: EngineHitExecutionOptions): EngineHitTestResult | null;
    hitTestAll(point: {
        x: number;
        y: number;
    }, tolerance?: number, options?: EngineHitExecutionOptions): EngineHitTestResult[];
    getNode(nodeId: EngineNodeId): EngineRenderableNode | null;
    getSnapshot(): EngineSceneSnapshot;
    setViewport(next: EngineViewportOptions): EngineCanvasViewportState;
    panBy(deltaX: number, deltaY: number): EngineCanvasViewportState;
    zoomTo(scale: number, anchor?: {
        x: number;
        y: number;
    }): EngineCanvasViewportState;
    startCameraAnimation(target: EngineViewportOptions, options?: EngineCameraAnimationOptions): void;
    updateCameraAnimation(target: EngineViewportOptions, options?: EngineCameraAnimationOptions): void;
    stopCameraAnimation(options?: {
        commitTarget?: boolean;
    }): void;
    resize(size: EngineResizeOptions): EngineCanvasViewportState;
    setProtectedNodeIds(nodeIds?: readonly EngineNodeId[]): void;
    setInteractionActiveNodeIds(nodeIds?: readonly EngineNodeId[]): void;
    setOverlayNodes(nodes?: readonly EngineOverlayDrawNode[]): void;
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
