export interface CreateEngineRenderSchedulerOptions {
    render: () => Promise<unknown>;
    interactiveIntervalMs?: number;
    onError?: (error: unknown) => void;
}
export interface EngineRenderScheduler {
    request(mode?: 'interactive' | 'normal'): void;
    cancel(): void;
    dispose(): void;
}
/**
 * Engine-owned render scheduler that keeps render submission single-flight,
 * coalesces burst requests, and optionally rate-limits interactive mode.
 */
export declare function createEngineRenderScheduler(options: CreateEngineRenderSchedulerOptions): EngineRenderScheduler;
