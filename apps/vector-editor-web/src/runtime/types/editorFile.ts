import type {ElementProps} from './editorElement.ts'

/**
 * Declares one replayable history entry used by crash-recovery recent-N snapshots.
 */
export interface EditorFileHistoryRecoveryReplayEntry {
  // Stores history entry id.
  id: string
  // Stores history entry label.
  label: string
  // Stores history entry source kind.
  source: 'local' | 'remote'
  // Stores forward patch list replayed during recovery apply.
  forward: unknown[]
  // Stores backward patch list replayed during recovery rollback.
  backward: unknown[]
  // Stores optional transaction id for command-chain replay grouping.
  transactionId?: string
  // Stores optional issued-at timestamp for deterministic ordering diagnostics.
  issuedAt?: number
}

/**
 * Declares crash-recovery replay mode used by startup replay selection.
 */
export type EditorFileHistoryRecoveryReplayMode = 'local-only' | 'merged'

/**
 * Declares one replay mode snapshot for crash-recovery reconstruction.
 */
export interface EditorFileHistoryRecoveryReplayModeSnapshot {
  // Stores replay mode label.
  mode: EditorFileHistoryRecoveryReplayMode
  // Stores replay entries in deterministic replay order.
  entries: EditorFileHistoryRecoveryReplayEntry[]
}

/**
 * Declares crash-recovery replay payload persisted in editor file config.
 */
export interface EditorFileHistoryRecoveryReplaySnapshot {
  // Stores max replay length used while building this snapshot.
  maxEntries: number
  // Stores local-only replay snapshot used by local undo/redo recovery.
  localOnly: EditorFileHistoryRecoveryReplayModeSnapshot
  // Stores merged replay snapshot that includes remote-log visibility.
  merged: EditorFileHistoryRecoveryReplayModeSnapshot
}

// Declares one persisted binary/text asset referenced by a file document.
export interface EditorFileAsset {
  // Stores stable asset id used by element.asset references.
  id: string
  // Stores original display name for export/import surfaces.
  name: string
  // Stores logical asset category (for example: image).
  type: string
  // Stores MIME type used by zip import/export adapters.
  mimeType: string
  // Stores optional in-memory browser File for local session workflows.
  file?: File
  // Stores optional decoded image handle resolved during import.
  imageRef?: unknown
  // Stores optional object URL used by UI/runtime preview rendering.
  objectUrl?: string
}

// Declares file-level page geometry and unit configuration.
export interface EditorFilePageSpec {
  // Stores canonical unit label used by document config.
  unit: string
  // Stores page width in document unit space.
  width: number
  // Stores page height in document unit space.
  height: number
  // Stores document DPI metadata for export/import compatibility.
  dpi: number
}

// Declares one persisted page payload used by multi-page file contracts.
export interface EditorFilePage {
  // Stores stable page id.
  id: string
  // Stores page display name.
  name: string
  // Stores page width in document unit space.
  width: number
  // Stores page height in document unit space.
  height: number
}

// Declares one persisted lifecycle snapshot for file-level save/recovery workflows.
export interface EditorFileLifecycleTransitionSource {
  // Stores stable source category for lifecycle transition diagnostics.
  kind: 'system' | 'user' | 'command' | 'import'
  // Stores semantic source event label.
  event: string
  // Stores optional source command id when transition is command-driven.
  commandId?: string
  // Stores optional source transaction id when transition is command-driven.
  transactionId?: string
  // Stores optional source command type when transition is command-driven.
  commandType?: string
  // Stores transition timestamp in epoch milliseconds.
  issuedAt: number
}

// Declares one command-derived dirty source payload for save/recovery tracing.
export interface EditorFileLifecycleDirtySource {
  // Stores stable command type that introduced unsaved changes.
  commandType: string
  // Stores optional command id for deterministic diagnostics mapping.
  commandId?: string
  // Stores stable transaction id for grouped command chains.
  transactionId: string
  // Stores dirty-source timestamp in epoch milliseconds.
  issuedAt: number
}

// Declares one persisted lifecycle snapshot for file-level save/recovery workflows.
export interface EditorFileLifecycleState {
  // Stores lifecycle phase.
  state: 'created' | 'opened' | 'dirty' | 'saving' | 'saved' | 'recovery' | 'closed'
  // Stores whether unsaved edits exist.
  dirty: boolean
  // Stores optional last-save timestamp.
  lastSavedAt?: number
  // Stores optional recovery reason.
  recoveryReason?: string
  // Stores latest lifecycle transition source for state-machine observability.
  lastTransitionSource?: EditorFileLifecycleTransitionSource
  // Stores latest dirty-source chain for command/transaction traceability.
  lastDirtySource?: EditorFileLifecycleDirtySource
}

// Declares one persisted schema header used by migration entry points.
export interface EditorFileSchema {
  // Stores schema namespace identifier.
  name: string
  // Stores schema version number.
  version: number
  // Stores schema major version used by compatibility gates.
  major?: number
  // Stores schema minor version used by additive migration gates.
  minor?: number
}

// Declares one migration diagnostic payload for readonly recovery mode.
export interface EditorFileMigrationDiagnostic {
  // Stores stable diagnostic code.
  code:
    | 'migration.payload.invalid'
    | 'migration.schema.unsupported-major'
    | 'migration.schema.unsupported-version'
    | 'migration.config.invalid'
  // Stores migration phase where diagnostic was produced.
  phase: 'normalize' | 'migrate'
  // Stores human-readable diagnostic message.
  message: string
  // Stores diagnostic severity.
  severity: 'warning' | 'error'
  // Stores optional freeform details payload.
  details?: Record<string, unknown>
}

// Declares editor-specific persisted config payload.
export interface EditorFileEditorConfig {
  // Stores whether this file is currently forced into readonly mode.
  readOnly?: boolean
  // Stores migration diagnostics produced during import normalization.
  migrationDiagnostics?: EditorFileMigrationDiagnostic[]
  // Stores crash-recovery recent-N replay payload for recovery orchestration.
  crashRecoveryReplay?: EditorFileHistoryRecoveryReplaySnapshot
  // Stores startup replay mode used when consuming crash-recovery snapshots.
  crashRecoveryReplayMode?: EditorFileHistoryRecoveryReplayMode
}

// Declares one persisted style reference registry grouped by style category.
export interface EditorFileStyleReferences {
  // Stores fill style map keyed by style id.
  fills: Record<string, {name?: string}>
  // Stores stroke style map keyed by style id.
  strokes: Record<string, {name?: string}>
  // Stores text style map keyed by style id.
  texts: Record<string, {name?: string}>
  // Stores effect style map keyed by style id.
  effects: Record<string, {name?: string}>
}

// Declares persisted editor file schema used across app/runtime adapters.
export interface EditorFileDocument {
  // Stores unique file id.
  id: string
  // Stores file display name.
  name: string
  // Stores file format version string.
  version: string
  // Stores file creation timestamp.
  createdAt: number
  // Stores file update timestamp.
  updatedAt: number
  // Stores optional schema header used for compatibility migration.
  schema?: EditorFileSchema
  // Stores optional page list for multi-page file semantics.
  pages?: EditorFilePage[]
  // Stores optional active page id for multi-page routing.
  activePageId?: string
  // Stores optional lifecycle state persisted across sessions.
  lifecycle?: EditorFileLifecycleState
  // Stores optional style reference registry.
  styleReferences?: EditorFileStyleReferences
  // Stores optional extension namespace payload for forward compatibility.
  extensions?: Record<string, unknown>
  // Stores page/editor configuration payload.
  config: {
    // Stores page geometry metadata.
    page: EditorFilePageSpec
    // Stores optional editor-specific config payload.
    editor?: EditorFileEditorConfig
  }
  // Stores persisted element payload list.
  elements: ElementProps[]
  // Stores optional persisted asset list.
  assets?: EditorFileAsset[]
}