import type {
  EditorFileDocument,
  EditorFileHistoryRecoveryReplayMode,
  EditorFileHistoryRecoveryReplaySnapshot,
} from '../types/index.ts'

const DEFAULT_SCHEMA_NAME = 'venus.vector.document'
const DEFAULT_SCHEMA_VERSION = 1
const DEFAULT_SCHEMA_MAJOR = 1
const DEFAULT_SCHEMA_MINOR = 0

/**
 * Resolves one raw file payload into canonical elements/assets arrays.
 * @param fileJson Raw parsed JSON payload.
 */
function resolveWorkspacePayload(fileJson: any): {
  elements: unknown[]
  assets: unknown[]
} {
  if (Array.isArray(fileJson.workspace)) {
    const workspace = fileJson.workspace[0] || {}
    return {
      elements: Array.isArray(workspace.elements) ? workspace.elements : [],
      assets: Array.isArray(workspace.assets) ? workspace.assets : [],
    }
  }

  return {
    elements: Array.isArray(fileJson.elements) ? fileJson.elements : [],
    assets: Array.isArray(fileJson.assets) ? fileJson.assets : [],
  }
}

/**
 * Builds one readonly-recovery file payload when migration normalization fails.
 * @param fileJson Raw parsed JSON payload.
 * @param code Stable migration diagnostic code.
 * @param message Human-readable migration diagnostic message.
 * @param details Optional diagnostic details payload.
 */
function createReadonlyRecoveryFile(input: {
  fileJson: any
  code: 'migration.payload.invalid' | 'migration.schema.unsupported-major' | 'migration.schema.unsupported-version' | 'migration.config.invalid'
  message: string
  details?: Record<string, unknown>
}): EditorFileDocument {
  const now = Date.now()
  const {elements, assets} = resolveWorkspacePayload(input.fileJson ?? {})

  return {
    id: typeof input.fileJson?.id === 'string' ? input.fileJson.id : `recovery-${now}`,
    name: typeof input.fileJson?.name === 'string' ? input.fileJson.name : 'Recovery Document',
    version: typeof input.fileJson?.version === 'string' ? input.fileJson.version : '0.0.0',
    createdAt: typeof input.fileJson?.createdAt === 'number' ? input.fileJson.createdAt : now,
    updatedAt: now,
    schema: {
      name: DEFAULT_SCHEMA_NAME,
      version: DEFAULT_SCHEMA_VERSION,
      major: DEFAULT_SCHEMA_MAJOR,
      minor: DEFAULT_SCHEMA_MINOR,
    },
    lifecycle: {
      state: 'recovery',
      dirty: true,
      recoveryReason: input.code,
      lastTransitionSource: {
        kind: 'import',
        event: 'file.normalize.recovery',
        issuedAt: now,
      },
    },
    config: {
      page: {
        unit: 'px',
        width: typeof input.fileJson?.config?.page?.width === 'number' ? input.fileJson.config.page.width : 1920,
        height: typeof input.fileJson?.config?.page?.height === 'number' ? input.fileJson.config.page.height : 1080,
        dpi: typeof input.fileJson?.config?.page?.dpi === 'number' ? input.fileJson.config.page.dpi : 72,
      },
      editor: {
        readOnly: true,
        migrationDiagnostics: [
          {
            code: input.code,
            phase: 'normalize',
            message: input.message,
            severity: 'error',
            details: input.details,
          },
        ],
      },
    },
    elements: elements as EditorFileDocument['elements'],
    assets: assets as EditorFileDocument['assets'],
    pages: Array.isArray(input.fileJson?.pages) ? input.fileJson.pages : undefined,
    activePageId: typeof input.fileJson?.activePageId === 'string' ? input.fileJson.activePageId : undefined,
    styleReferences: input.fileJson?.styleReferences,
    extensions: input.fileJson?.extensions,
  }
}

/**
 * Validates schema compatibility and returns recovery payload when unsupported.
 * @param fileJson Raw parsed JSON payload.
 */
function validateSchemaCompatibility(fileJson: any): EditorFileDocument | null {
  if (!fileJson || typeof fileJson !== 'object') {
    return createReadonlyRecoveryFile({
      fileJson,
      code: 'migration.payload.invalid',
      message: 'Imported payload is not an object; fallback to readonly recovery mode.',
    })
  }

  const major = typeof fileJson?.schema?.major === 'number'
    ? fileJson.schema.major
    : typeof fileJson?.schema?.version === 'number'
      ? fileJson.schema.version
      : DEFAULT_SCHEMA_MAJOR

  if (major > DEFAULT_SCHEMA_MAJOR) {
    return createReadonlyRecoveryFile({
      fileJson,
      code: 'migration.schema.unsupported-major',
      message: `Imported schema major ${String(major)} is newer than supported ${String(DEFAULT_SCHEMA_MAJOR)}.`,
      details: {
        supportedMajor: DEFAULT_SCHEMA_MAJOR,
        incomingMajor: major,
      },
    })
  }

  const version = typeof fileJson?.schema?.version === 'number'
    ? fileJson.schema.version
    : DEFAULT_SCHEMA_VERSION

  if (version > DEFAULT_SCHEMA_VERSION + 1) {
    return createReadonlyRecoveryFile({
      fileJson,
      code: 'migration.schema.unsupported-version',
      message: `Imported schema version ${String(version)} is ahead of migration support window.`,
      details: {
        supportedVersion: DEFAULT_SCHEMA_VERSION,
        incomingVersion: version,
      },
    })
  }

  if (typeof fileJson?.config?.page?.width !== 'number' || typeof fileJson?.config?.page?.height !== 'number') {
    return createReadonlyRecoveryFile({
      fileJson,
      code: 'migration.config.invalid',
      message: 'Imported config.page is invalid; fallback to readonly recovery mode.',
    })
  }

  return null
}

/**
 * Normalizes crash-recovery replay payload from imported editor config.
 * @param value Raw replay payload from imported file config.
 */
function normalizeCrashRecoveryReplay(value: unknown): EditorFileHistoryRecoveryReplaySnapshot | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const replay = value as {
    maxEntries?: unknown
    localOnly?: {mode?: unknown; entries?: unknown}
    merged?: {mode?: unknown; entries?: unknown}
  }

  if (typeof replay.maxEntries !== 'number' || !replay.localOnly || !replay.merged) {
    return undefined
  }

  if (!Array.isArray(replay.localOnly.entries) || !Array.isArray(replay.merged.entries)) {
    return undefined
  }

  return replay as EditorFileHistoryRecoveryReplaySnapshot
}

/**
 * Normalizes crash-recovery replay mode from imported editor config.
 * @param value Raw replay mode payload from imported file config.
 */
function normalizeCrashRecoveryReplayMode(value: unknown): EditorFileHistoryRecoveryReplayMode {
  if (value === 'local-only' || value === 'merged') {
    return value
  }

  // Keep backward compatibility with legacy files that persisted replay snapshots only.
  return 'merged'
}

/**
 * Normalizes imported file payload to current file contract while preserving unknown extensions.
 * @param fileJson Raw parsed JSON payload from imported zip.
 */
export function normalizeFile(fileJson: any): EditorFileDocument {
  const recoveryFile = validateSchemaCompatibility(fileJson)
  if (recoveryFile) {
    return recoveryFile
  }

  const {elements, assets} = resolveWorkspacePayload(fileJson)

  const schemaMajor = typeof fileJson?.schema?.major === 'number'
    ? fileJson.schema.major
    : typeof fileJson?.schema?.version === 'number'
      ? fileJson.schema.version
      : DEFAULT_SCHEMA_MAJOR
  const schemaMinor = typeof fileJson?.schema?.minor === 'number'
    ? fileJson.schema.minor
    : DEFAULT_SCHEMA_MINOR

  return {
    ...fileJson,
    schema: {
      name: typeof fileJson?.schema?.name === 'string' ? fileJson.schema.name : DEFAULT_SCHEMA_NAME,
      version: typeof fileJson?.schema?.version === 'number' ? fileJson.schema.version : DEFAULT_SCHEMA_VERSION,
      major: schemaMajor,
      minor: schemaMinor,
    },
    elements: elements as EditorFileDocument['elements'],
    assets: assets as EditorFileDocument['assets'],
    lifecycle: fileJson.lifecycle,
    pages: fileJson.pages,
    activePageId: fileJson.activePageId,
    styleReferences: fileJson.styleReferences,
    extensions: fileJson.extensions,
    config: {
      ...fileJson.config,
      editor: {
        ...fileJson?.config?.editor,
        readOnly: fileJson?.config?.editor?.readOnly === true,
        migrationDiagnostics: Array.isArray(fileJson?.config?.editor?.migrationDiagnostics)
          ? fileJson.config.editor.migrationDiagnostics
          : undefined,
        crashRecoveryReplay: normalizeCrashRecoveryReplay(fileJson?.config?.editor?.crashRecoveryReplay),
        crashRecoveryReplayMode: normalizeCrashRecoveryReplayMode(fileJson?.config?.editor?.crashRecoveryReplayMode),
      },
    },
  }
}
