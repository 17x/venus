import type { EngineRenderer } from './types.ts';
interface WebGLEngineRendererOptions {
    id?: string;
    canvas: HTMLCanvasElement | OffscreenCanvas;
    enableCulling?: boolean;
    clearColor?: readonly [number, number, number, number];
    antialias?: boolean;
}
/**
 * Built-in WebGL renderer entry for engine standalone/runtime integrations.
 *
 * Current stage keeps one shared plan+instance pipeline and a minimal clear
 * commit so Canvas2D/WebGL can evolve with the same front-half optimization
 * path before WebGL draw-program wiring lands.
 */
export declare function createWebGLEngineRenderer(options: WebGLEngineRendererOptions): EngineRenderer;
export {};
