export interface EngineWorkerEnvironment {
  Worker?: unknown
  SharedArrayBuffer?: unknown
  Atomics?: unknown
  crossOriginIsolated?: boolean
}

export interface EngineWorkerCapabilities {
  worker: boolean
  sharedArrayBuffer: boolean
  atomics: boolean
  crossOriginIsolated: boolean
  sharedMemoryWorker: boolean
}

export interface ResolveEngineWorkerModeOptions {
  preferWorker?: boolean
  preferSharedMemory?: boolean
  requireWorker?: boolean
  requireSharedMemory?: boolean
  capabilities?: EngineWorkerCapabilities
  environment?: EngineWorkerEnvironment
}

export type EngineWorkerMode = 'main-thread' | 'worker-postmessage' | 'worker-shared-memory'

export interface EngineWorkerModeResolution {
  mode: EngineWorkerMode
  capabilities: EngineWorkerCapabilities
  reason: string
}

/**
 * Detects browser worker/shared-memory capabilities in one place so runtime
 * packages can use a consistent fallback policy.
 */
export function detectEngineWorkerCapabilities(
  environment: EngineWorkerEnvironment = globalThis as EngineWorkerEnvironment,
): EngineWorkerCapabilities {
  const worker = typeof environment.Worker !== 'undefined'
  const sharedArrayBuffer = typeof environment.SharedArrayBuffer !== 'undefined'
  const atomics = typeof environment.Atomics !== 'undefined'
  const crossOriginIsolated = environment.crossOriginIsolated === true

  return {
    worker,
    sharedArrayBuffer,
    atomics,
    crossOriginIsolated,
    sharedMemoryWorker: worker && sharedArrayBuffer && atomics && crossOriginIsolated,
  }
}

/**
 * Resolves the safest execution mode.
 *
 * Priority:
 * 1) `worker-shared-memory` when preferred and fully supported
 * 2) `worker-postmessage` when worker exists
 * 3) `main-thread` fallback
 */
export function resolveEngineWorkerMode(
  options: ResolveEngineWorkerModeOptions = {},
): EngineWorkerModeResolution {
  const capabilities =
    options.capabilities ?? detectEngineWorkerCapabilities(options.environment)
  const preferWorker = options.preferWorker ?? true
  const preferSharedMemory = options.preferSharedMemory ?? true

  if (options.requireSharedMemory && !capabilities.sharedMemoryWorker) {
    return {
      mode: 'main-thread',
      capabilities,
      reason:
        'shared memory worker was required but SharedArrayBuffer/Atomics/crossOriginIsolated support is unavailable',
    }
  }

  if (options.requireWorker && !capabilities.worker) {
    return {
      mode: 'main-thread',
      capabilities,
      reason: 'worker was required but Worker is unavailable',
    }
  }

  if (preferWorker && preferSharedMemory && capabilities.sharedMemoryWorker) {
    return {
      mode: 'worker-shared-memory',
      capabilities,
      reason:
        'using worker + SharedArrayBuffer + Atomics because full shared-memory acceleration is supported',
    }
  }

  if (preferWorker && capabilities.worker) {
    return {
      mode: 'worker-postmessage',
      capabilities,
      reason:
        'falling back to message-based worker because shared-memory prerequisites are not fully available',
    }
  }

  return {
    mode: 'main-thread',
    capabilities,
    reason: 'falling back to main-thread execution',
  }
}
