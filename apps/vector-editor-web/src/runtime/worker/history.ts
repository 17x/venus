import type {
  HistoryEntry,
  HistoryLocalCommandMeta,
  HistoryLocalMergeOptions,
  HistoryManager,
  HistoryRecoveryReplayEntry,
  HistoryRecoveryReplaySnapshot,
  HistorySummary,
  HistorySummaryTransactionGroup,
} from './historyContracts.ts'

export type {
  HistoryEntry,
  HistoryEntrySource,
  HistoryLocalCommandMeta,
  HistoryLocalMergeOptions,
  HistoryManager,
  HistoryPatch,
  HistoryPushLocalEntryOptions,
  HistoryRecoveryReplayEntry,
  HistoryRecoveryReplayModeSnapshot,
  HistoryRecoveryReplaySnapshot,
  HistorySummary,
  HistorySummaryEntry,
  HistorySummaryTransactionGroup,
  HistoryTransition,
} from './historyContracts.ts'

const DEFAULT_HISTORY_RECOVERY_REPLAY_MAX_ENTRIES = 20

/**
 * Local history stack with a separate remote activity log.
 *
 * Why:
 * - Local edits need reversible patches for undo/redo.
 * - Remote edits should still appear in history UI, but they should not be
 *   undone by the local user.
 *
 * Result:
 * - undo/redo only traverses local entries
 * - summary includes both local and remote records for observability
 * @param seed Optional initial local history entries.
 */
export function createHistoryManager(seed: Array<Omit<HistoryEntry, 'source'>> = []): HistoryManager {
  let localEntries: HistoryEntry[] = seed.map((entry) => ({
    ...entry,
    source: 'local',
  }))
  let localCommandMeta: Array<HistoryLocalCommandMeta | null> = seed.map(() => null)
  let remoteEntries: HistoryEntry[] = []
  let cursor = localEntries.length - 1

  const getSummary = (): HistorySummary => ({
    entries: [...localEntries, ...remoteEntries].map(({ id, label, source }) => ({
      id,
      label,
      source,
    })),
    transactionGroups: createHistorySummaryTransactionGroups({
      localEntries,
      localCommandMeta,
      remoteEntries,
    }),
    cursor,
    canUndo: cursor >= 0,
    canRedo: cursor < localEntries.length - 1,
    recoveryReplay: createHistoryRecoveryReplaySnapshot({
      localEntries,
      localCommandMeta,
      remoteEntries,
      maxEntries: DEFAULT_HISTORY_RECOVERY_REPLAY_MAX_ENTRIES,
    }),
  })

  return {
    getSummary,
    pushLocalEntry(entry, options) {
      if (cursor < localEntries.length - 1) {
        localEntries = localEntries.slice(0, cursor + 1)
        localCommandMeta = localCommandMeta.slice(0, cursor + 1)
      }

      const entryWithSource: HistoryEntry = {
        ...entry,
        // Repeated edits of the same target often produce the same semantic
        // entry id. Keep every committed operation addressable in the
        // timeline instead of letting duplicate ids collapse UI metadata.
        id: resolveUniqueLocalHistoryEntryId(entry.id, localEntries),
        source: 'local',
      }

      const canMergeWithPrevious = resolveShouldMergeLocalEntry({
        localEntries,
        localCommandMeta,
        nextEntry: entryWithSource,
        nextMeta: options?.commandMeta,
        mergeOptions: options?.merge,
      })

      if (canMergeWithPrevious) {
        const previousIndex = localEntries.length - 1
        const previousEntry = localEntries[previousIndex]
        const mergedEntry: HistoryEntry = {
          ...previousEntry,
          // Keep previous entry id/label for timeline readability while merging command effects.
          forward: [...previousEntry.forward, ...entryWithSource.forward],
          // Undo path must invert newest patches first, then previous patches.
          backward: [...entryWithSource.backward, ...previousEntry.backward],
        }

        localEntries[previousIndex] = mergedEntry
        localCommandMeta[previousIndex] = options?.commandMeta ?? localCommandMeta[previousIndex]
        cursor = localEntries.length - 1
        return getSummary()
      }

      localEntries.push(entryWithSource)
      localCommandMeta.push(options?.commandMeta ?? null)
      cursor = localEntries.length - 1
      return getSummary()
    },
    pushRemoteEntry(entry) {
      remoteEntries = [
        ...remoteEntries,
        {
          ...entry,
          source: 'remote',
        },
      ]
      return getSummary()
    },
    undo() {
      if (cursor < 0) {
        return {
          appliedEntry: null,
          summary: getSummary(),
        }
      }

      const appliedEntry = localEntries[cursor]
      cursor -= 1
      return {
        appliedEntry,
        summary: getSummary(),
      }
    },
    redo() {
      if (cursor >= localEntries.length - 1) {
        return {
          appliedEntry: null,
          summary: getSummary(),
        }
      }

      cursor += 1
      const appliedEntry = localEntries[cursor]
      return {
        appliedEntry,
        summary: getSummary(),
      }
    },
    getRecoveryReplay(maxEntries = DEFAULT_HISTORY_RECOVERY_REPLAY_MAX_ENTRIES) {
      return createHistoryRecoveryReplaySnapshot({
        localEntries,
        localCommandMeta,
        remoteEntries,
        maxEntries,
      })
    },
  }
}

function resolveUniqueLocalHistoryEntryId(
  requestedId: string,
  entries: readonly HistoryEntry[],
): string {
  if (!entries.some((entry) => entry.id === requestedId)) {
    return requestedId
  }
  let suffix = 2
  while (entries.some((entry) => entry.id === `${requestedId}#${suffix}`)) {
    suffix += 1
  }
  return `${requestedId}#${suffix}`
}

/**
 * Builds crash-recovery replay snapshot from local/remote history slices.
 * @param input Local/remote history slices, command metadata, and replay window size.
 */
function createHistoryRecoveryReplaySnapshot(input: {
  localEntries: HistoryEntry[]
  localCommandMeta: Array<HistoryLocalCommandMeta | null>
  remoteEntries: HistoryEntry[]
  maxEntries: number
}): HistoryRecoveryReplaySnapshot {
  const maxEntries = Number.isFinite(input.maxEntries) && input.maxEntries > 0
    ? Math.max(1, Math.floor(input.maxEntries))
    : DEFAULT_HISTORY_RECOVERY_REPLAY_MAX_ENTRIES

  const localReplayEntries = input.localEntries
    .slice(-maxEntries)
    .map((entry, index, recentEntries) => {
      const sourceIndex = input.localEntries.length - recentEntries.length + index
      return createRecoveryReplayEntry(entry, input.localCommandMeta[sourceIndex])
    })

  const mergedReplayEntries = [
    ...input.localEntries.map((entry, index) => createRecoveryReplayEntry(entry, input.localCommandMeta[index])),
    ...input.remoteEntries.map((entry) => createRecoveryReplayEntry(entry)),
  ].slice(-maxEntries)

  return {
    maxEntries,
    localOnly: {
      mode: 'local-only',
      entries: localReplayEntries,
    },
    merged: {
      mode: 'merged',
      entries: mergedReplayEntries,
    },
  }
}

/**
 * Creates one crash-recovery replay entry from history entry + optional local command metadata.
 * @param entry Source history entry.
 * @param commandMeta Optional local command metadata for transaction diagnostics.
 */
function createRecoveryReplayEntry(
  entry: HistoryEntry,
  commandMeta?: HistoryLocalCommandMeta | null,
): HistoryRecoveryReplayEntry {
  return {
    id: entry.id,
    label: entry.label,
    source: entry.source,
    forward: entry.forward.slice(),
    backward: entry.backward.slice(),
    transactionId: commandMeta?.transactionId,
    issuedAt: commandMeta?.issuedAt,
  }
}

/**
 * Resolves whether current local entry should merge into previous entry by transaction policy.
 * @param input Local history state and incoming entry metadata.
 */
function resolveShouldMergeLocalEntry(input: {
  localEntries: HistoryEntry[]
  localCommandMeta: Array<HistoryLocalCommandMeta | null>
  nextEntry: HistoryEntry
  nextMeta?: HistoryLocalCommandMeta
  mergeOptions?: HistoryLocalMergeOptions
}): boolean {
  if (!input.mergeOptions?.enabled) {
    return false
  }

  if (input.localEntries.length === 0 || !input.nextMeta) {
    return false
  }

  const previousEntry = input.localEntries[input.localEntries.length - 1]
  const previousMeta = input.localCommandMeta[input.localCommandMeta.length - 1]

  if (!previousMeta || previousEntry.source !== 'local') {
    return false
  }

  if (input.nextMeta.commandSource === 'system' || previousMeta.commandSource === 'system') {
    return false
  }

  if (!input.nextMeta.transactionId || !previousMeta.transactionId) {
    return false
  }

  if (input.nextMeta.transactionId !== previousMeta.transactionId) {
    return false
  }

  if (Array.isArray(input.mergeOptions.allowedCommandTypes) && input.mergeOptions.allowedCommandTypes.length > 0) {
    const previousAllowed = input.mergeOptions.allowedCommandTypes.includes(previousMeta.commandType)
    const nextAllowed = input.mergeOptions.allowedCommandTypes.includes(input.nextMeta.commandType)
    if (!previousAllowed || !nextAllowed) {
      return false
    }
  }

  if (typeof input.mergeOptions.maxIssuedAtGapMs === 'number' && input.mergeOptions.maxIssuedAtGapMs >= 0) {
    const issuedAtGapMs = Math.abs(input.nextMeta.issuedAt - previousMeta.issuedAt)
    if (issuedAtGapMs > input.mergeOptions.maxIssuedAtGapMs) {
      return false
    }
  }

  // Skip merge for log-only entries to preserve command visibility in timeline.
  const previousHasPatch = previousEntry.forward.length > 0 || previousEntry.backward.length > 0
  const nextHasPatch = input.nextEntry.forward.length > 0 || input.nextEntry.backward.length > 0
  if (!previousHasPatch || !nextHasPatch) {
    return false
  }

  return true
}

/**
 * Builds transaction-level summary groups from local and remote history slices.
 * @param input Local/remote history slices and local command metadata.
 */
function createHistorySummaryTransactionGroups(input: {
  localEntries: HistoryEntry[]
  localCommandMeta: Array<HistoryLocalCommandMeta | null>
  remoteEntries: HistoryEntry[]
}): HistorySummaryTransactionGroup[] {
  const groups: HistorySummaryTransactionGroup[] = []

  input.localEntries.forEach((entry, index) => {
    const meta = input.localCommandMeta[index]
    const transactionId = meta?.transactionId ?? `local:${entry.id}:${index}`
    const issuedAt = meta?.issuedAt ?? index
    const latestGroup = groups[groups.length - 1]

    // Keep grouping contiguous by transaction id so timeline sections remain deterministic.
    if (latestGroup && latestGroup.source === 'local' && latestGroup.transactionId === transactionId) {
      latestGroup.entryIds.push(entry.id)
      latestGroup.entryCount += 1
      latestGroup.endIssuedAt = issuedAt
      return
    }

    groups.push({
      transactionId,
      source: 'local',
      entryIds: [entry.id],
      label: entry.label,
      entryCount: 1,
      startIssuedAt: issuedAt,
      endIssuedAt: issuedAt,
    })
  })

  input.remoteEntries.forEach((entry, index) => {
    const issuedAt = input.localEntries.length + index
    groups.push({
      transactionId: `remote:${entry.id}`,
      source: 'remote',
      entryIds: [entry.id],
      label: entry.label,
      entryCount: 1,
      startIssuedAt: issuedAt,
      endIssuedAt: issuedAt,
    })
  })

  return groups
}
