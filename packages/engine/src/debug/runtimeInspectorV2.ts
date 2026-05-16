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
  }
}
