// Module responsibility: compose runtime inspector v2 payload from diagnostics snapshots.
// Non-responsibility: UI rendering.

/**
 * Describes compact runtime inspector panel payload.
 */
export interface EngineRuntimeInspectorV2Snapshot {
  /** Current strategy phase. */
  phase: string
  /** Current budget pressure tier. */
  pressure: string
  /** Current profile name. */
  profile: string
  /** Current fallback reason. */
  fallbackReason: string | null
  /** Current 3D visibility execution mode. */
  visibility3dExecutionMode: string
  /** Current interaction preview execution mode. */
  previewExecutionMode: string
}

/**
 * Intent: normalize runtime inspector payload.
 * @param snapshot Runtime inspector snapshot.
 * @returns Normalized snapshot.
 */
export function resolveEngineRuntimeInspectorV2Snapshot(
  snapshot: EngineRuntimeInspectorV2Snapshot,
): EngineRuntimeInspectorV2Snapshot {
  return {
    ...snapshot,
    fallbackReason: snapshot.fallbackReason ?? null,
    visibility3dExecutionMode: snapshot.visibility3dExecutionMode || 'fallback-frustum-coarse',
    previewExecutionMode: snapshot.previewExecutionMode || 'unknown',
  }
}
