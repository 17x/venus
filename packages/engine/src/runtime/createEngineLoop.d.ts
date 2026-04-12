import type { EngineRenderFrame, EngineRenderStats, EngineRenderer } from '../renderer/types.ts';
import type { EngineClock, EngineFrameInfo } from '../time/index.ts';
interface EngineLoopOptions {
    clock: EngineClock;
    renderer: EngineRenderer;
    resolveFrame: () => EngineRenderFrame;
    beforeRender?: (frame: EngineFrameInfo) => void;
    onStats?: (stats: EngineRenderStats) => void;
}
export interface EngineLoopController {
    start(): void;
    stop(): void;
    isRunning(): boolean;
    renderOnce(): Promise<EngineRenderStats>;
}
/**
 * Shared render loop helper for standalone engine usage.
 *
 * The loop is intentionally small:
 * - pull latest frame inputs from `resolveFrame`
 * - render once per clock frame
 * - surface render stats back to callers
 */
export declare function createEngineLoop(options: EngineLoopOptions): EngineLoopController;
export {};
