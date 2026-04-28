/**
 * Defines optional environment globals used for capability detection.
 */
export interface WorkerEnvironment {
  /** Stores the Worker constructor when available. */
  Worker?: unknown
  /** Stores the SharedArrayBuffer constructor when available. */
  SharedArrayBuffer?: unknown
  /** Stores the Atomics API when available. */
  Atomics?: unknown
  /** Stores cross-origin isolation status in browser-like environments. */
  crossOriginIsolated?: boolean
}

/**
 * Describes resolved worker and shared-memory capability flags.
 */
export interface WorkerCapabilities {
  /** Indicates whether Worker is available. */
  worker: boolean
  /** Indicates whether SharedArrayBuffer is available. */
  sharedArrayBuffer: boolean
  /** Indicates whether Atomics is available. */
  atomics: boolean
  /** Indicates whether the environment is cross-origin isolated. */
  crossOriginIsolated: boolean
  /** Indicates whether all shared-memory worker prerequisites are met. */
  sharedMemoryWorker: boolean
}

/**
 * Enumerates worker execution modes from fallback to accelerated path.
 */
export type WorkerMode = 'main-thread' | 'worker-postmessage' | 'worker-shared-memory'

/**
 * Defines options used to select a worker execution mode.
 */
export interface ResolveWorkerModeOptions {
  /** Prefers worker over main-thread mode when possible. */
  preferWorker?: boolean
  /** Prefers shared-memory worker over postmessage worker when possible. */
  preferSharedMemory?: boolean
  /** Requires worker support and falls back with reason when missing. */
  requireWorker?: boolean
  /** Requires full shared-memory support and falls back with reason when missing. */
  requireSharedMemory?: boolean
  /** Allows callers to provide pre-computed capabilities. */
  capabilities?: WorkerCapabilities
  /** Allows callers to provide an explicit environment object. */
  environment?: WorkerEnvironment
}

/**
 * Describes worker mode resolution output with detailed fallback reason.
 */
export interface WorkerModeResolution {
  /** Stores the selected execution mode. */
  mode: WorkerMode
  /** Stores the capabilities used to make the decision. */
  capabilities: WorkerCapabilities
  /** Stores the human-readable selection reason. */
  reason: string
}

/**
 * Detects worker capabilities from the provided environment.
 */
export function detectWorkerCapabilities(
  environment: WorkerEnvironment = globalThis as WorkerEnvironment,
): WorkerCapabilities {
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
 * Resolves a safe worker mode according to required and preferred options.
 */
export function resolveWorkerMode(
  options: ResolveWorkerModeOptions = {},
): WorkerModeResolution {
  const capabilities =
    options.capabilities ?? detectWorkerCapabilities(options.environment)
  const preferWorker = options.preferWorker ?? true
  const preferSharedMemory = options.preferSharedMemory ?? true

  // Guard strict requirements first so caller intent is preserved.
  if (options.requireSharedMemory && !capabilities.sharedMemoryWorker) {
    return {
      mode: 'main-thread',
      capabilities,
      reason:
        'shared memory worker was required but SharedArrayBuffer/Atomics/crossOriginIsolated support is unavailable',
    }
  }

  // Guard worker requirement next before applying preference-based fallback.
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

