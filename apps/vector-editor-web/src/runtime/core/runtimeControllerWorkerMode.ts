/**
 * Declares worker mode metadata resolved from current runtime capability set.
 */
export interface CanvasRuntimeWorkerModeResolution {
  // Stores runtime worker mode label used for diagnostics.
  mode: 'worker-shared-memory' | 'worker-message'
  // Stores stable mode reason token.
  reason: 'shared-array-buffer-enabled' | 'shared-array-buffer-unavailable'
}

/**
 * Resolves worker mode metadata locally so runtime diagnostics preserve mode reason.
 * @param options SharedArrayBuffer capability sampled from current runtime.
 */
export function resolveRuntimeWorkerMode(options: {hasSharedArrayBuffer: boolean}): CanvasRuntimeWorkerModeResolution {
  if (options.hasSharedArrayBuffer) {
    return {
      mode: 'worker-shared-memory',
      reason: 'shared-array-buffer-enabled',
    }
  }

  return {
    mode: 'worker-message',
    reason: 'shared-array-buffer-unavailable',
  }
}
