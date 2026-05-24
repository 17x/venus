export interface EngineWorkerEnvironment {
    Worker?: unknown;
    SharedArrayBuffer?: unknown;
    Atomics?: unknown;
    crossOriginIsolated?: boolean;
}
export interface EngineWorkerCapabilities {
    worker: boolean;
    sharedArrayBuffer: boolean;
    atomics: boolean;
    crossOriginIsolated: boolean;
    sharedMemoryWorker: boolean;
}
export interface ResolveEngineWorkerModeOptions {
    preferWorker?: boolean;
    preferSharedMemory?: boolean;
    requireWorker?: boolean;
    requireSharedMemory?: boolean;
    capabilities?: EngineWorkerCapabilities;
    environment?: EngineWorkerEnvironment;
}
export type EngineWorkerMode = 'main-thread' | 'worker-postmessage' | 'worker-shared-memory';
export interface EngineWorkerModeResolution {
    mode: EngineWorkerMode;
    capabilities: EngineWorkerCapabilities;
    reason: string;
}
/**
 * Detects browser worker/shared-memory capabilities in one place so runtime
 * packages can use a consistent fallback policy.
 */
export declare function detectEngineWorkerCapabilities(environment?: EngineWorkerEnvironment): EngineWorkerCapabilities;
/**
 * Resolves the safest execution mode.
 *
 * Priority:
 * 1) `worker-shared-memory` when preferred and fully supported
 * 2) `worker-postmessage` when worker exists
 * 3) `main-thread` fallback
 */
export declare function resolveEngineWorkerMode(options?: ResolveEngineWorkerModeOptions): EngineWorkerModeResolution;
