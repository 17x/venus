import type { RuntimeMindmapAny, RuntimeMindmapLatest } from './types.ts'

export const LATEST_MINDMAP_SCHEMA_VERSION = 1 as const

export function upgradeMindmapToLatest(
  snapshot: RuntimeMindmapAny,
): RuntimeMindmapLatest {
  if (snapshot.version !== LATEST_MINDMAP_SCHEMA_VERSION) {
    throw new Error(`Unsupported mindmap schema version ${String(snapshot.version)}`)
  }

  return snapshot
}
