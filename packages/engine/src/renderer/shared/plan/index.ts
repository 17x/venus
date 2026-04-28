/**
 * Shared renderer planning barrel used during folder-structure migration.
 */
// AI-TEMP: keep shared barrel as compatibility forwarder while callers migrate to renderer/plan/index.ts; remove when no imports remain under renderer/shared/plan; ref R-PLAN-ENTRY.
export * from '../../plan/index.ts'
export type * from '../../plan/index.ts'
