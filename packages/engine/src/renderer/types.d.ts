import type { EnginePoint, EngineRect, EngineSceneSnapshot, EngineTextNode } from '../scene/types.ts';
export type EngineBackend = 'canvas2d' | 'webgl';
export type EngineRenderQuality = 'full' | 'interactive';
export interface EngineViewportState {
    viewportWidth: number;
    viewportHeight: number;
    scale: number;
    offsetX: number;
    offsetY: number;
    matrix: readonly [number, number, number, number, number, number, number, number, number];
}
export interface EngineRenderSurfaceSize {
    viewportWidth: number;
    viewportHeight: number;
    outputWidth: number;
    outputHeight: number;
}
export interface EngineRenderStats {
    drawCount: number;
    visibleCount: number;
    culledCount: number;
    cacheHits: number;
    cacheMisses: number;
    frameReuseHits: number;
    frameReuseMisses: number;
    frameMs: number;
    webglRenderPath?: 'model-complete' | 'packet';
    webglInteractiveTextFallbackCount?: number;
    webglTextTextureUploadCount?: number;
    webglTextTextureUploadBytes?: number;
    webglTextCacheHitCount?: number;
    webglCompositeUploadBytes?: number;
}
export interface EngineRendererCapabilities {
    backend: EngineBackend;
    textRuns: boolean;
    imageClip: boolean;
    culling: boolean;
    lod: boolean;
}
export interface EngineResourceLoader {
    resolveImage(assetId: string): CanvasImageSource | null;
}
export interface EngineTextLayout {
    lines: Array<{
        text: string;
        width: number;
        ascent: number;
        descent: number;
        baselineY: number;
    }>;
    bounds: EngineRect;
}
export interface EngineTextLayoutContext {
    measureText(text: string, node: EngineTextNode): {
        width: number;
        ascent: number;
        descent: number;
    };
}
export interface EngineTextShaper {
    layout(node: EngineTextNode, context: EngineTextLayoutContext): EngineTextLayout;
    hitTest?(node: EngineTextNode, point: EnginePoint, layout: EngineTextLayout): {
        runIndex: number;
        offset: number;
    } | null;
}
export interface EngineRendererContext {
    /** Render quality lane used for gesture responsiveness. */
    quality: EngineRenderQuality;
    /** Explicit LOD gate for planner/renderer detail simplifications. */
    lodEnabled?: boolean;
    pixelRatio?: number;
    outputPixelRatio?: number;
    loader?: EngineResourceLoader;
    textShaper?: EngineTextShaper;
    dirtyRegions?: Array<{
        zoomLevel: number;
        gridX: number;
        gridY: number;
    }>;
    framePlanCandidateIds?: readonly string[];
    framePlanVersion?: number;
    protectedNodeIds?: readonly string[];
}
export interface EngineRenderFrame {
    scene: EngineSceneSnapshot;
    viewport: EngineViewportState;
    context: EngineRendererContext;
}
export interface EngineRenderer {
    readonly id: string;
    readonly capabilities: EngineRendererCapabilities;
    init?(): void | Promise<void>;
    resize?(size: EngineRenderSurfaceSize): void;
    render(frame: EngineRenderFrame): EngineRenderStats | Promise<EngineRenderStats>;
    dispose?(): void;
}
