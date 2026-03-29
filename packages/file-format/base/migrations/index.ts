import type { RuntimeDocumentAny, RuntimeDocumentLatest } from './types.ts'

export const LATEST_CORE_SCHEMA_VERSION = 1 as const

export function upgradeCoreDocumentToLatest(
  document: RuntimeDocumentAny,
): RuntimeDocumentLatest {
  if (document.version !== LATEST_CORE_SCHEMA_VERSION) {
    throw new Error(`Unsupported core schema version ${String(document.version)}`)
  }

  return document
}
