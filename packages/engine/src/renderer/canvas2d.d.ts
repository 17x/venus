import type { EngineRenderer } from './types.ts';
interface Canvas2DEngineRendererOptions {
    id?: string;
    canvas: HTMLCanvasElement | OffscreenCanvas;
    enableCulling?: boolean;
    clearColor?: string;
    imageSmoothing?: boolean;
    imageSmoothingQuality?: ImageSmoothingQuality;
}
/**
 * Minimal built-in canvas2d renderer for standalone engine usage.
 *
 * Coverage:
 * - text and text runs
 * - image and source-rect draw
 * - clip rect/path and clip-by-node-id fallback
 */
export declare function createCanvas2DEngineRenderer(options: Canvas2DEngineRendererOptions): EngineRenderer;
export {};
