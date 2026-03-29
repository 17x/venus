import type { RuntimeStreamlineAny, RuntimeStreamlineLatest } from './types.ts'

export const LATEST_STREAMLINE_SCHEMA_VERSION = 1 as const

export function upgradeStreamlineToLatest(
  snapshot: RuntimeStreamlineAny,
): RuntimeStreamlineLatest {
  if (snapshot.version !== LATEST_STREAMLINE_SCHEMA_VERSION) {
    throw new Error(`Unsupported streamline schema version ${String(snapshot.version)}`)
  }

  return snapshot
}
