/**
 * Patch vocabulary for local undo/redo.
 *
 * These patches describe concrete state differences, not user intent. That
 * makes them a better fit for reversible local history than command metadata
 * alone. We keep the set intentionally small for now and can extend it as the
 * worker starts mutating more scene fields.
 */
export type HistoryPatch =
  | {
      type: 'set-selected-index'
      prev: number
      next: number
    }
  | {
      type: 'move-shape'
      shapeId: string
      prevX: number
      prevY: number
      nextX: number
      nextY: number
    }
  | {
      type: 'resize-shape'
      shapeId: string
      prevWidth: number
      prevHeight: number
      nextWidth: number
      nextHeight: number
    }
  | {
      type: 'insert-shape'
      index: number
      shape: {
        id: string
        type: string
        name: string
        x: number
        y: number
        width: number
        height: number
      }
    }
  | {
      type: 'remove-shape'
      index: number
      shape: {
        id: string
        type: string
        name: string
        x: number
        y: number
        width: number
        height: number
      }
    }

export type HistoryEntrySource = 'local' | 'remote'

export interface HistoryEntry {
  id: string
  label: string
  source: HistoryEntrySource
  forward: HistoryPatch[]
  backward: HistoryPatch[]
}

export interface HistorySummaryEntry {
  id: string
  label: string
  source: HistoryEntrySource
}

export interface HistorySummary {
  entries: HistorySummaryEntry[]
  cursor: number
  canUndo: boolean
  canRedo: boolean
}

export interface HistoryTransition {
  appliedEntry: HistoryEntry | null
  summary: HistorySummary
}

export interface HistoryManager {
  getSummary: () => HistorySummary
  pushLocalEntry: (entry: Omit<HistoryEntry, 'source'>) => HistorySummary
  pushRemoteEntry: (entry: Omit<HistoryEntry, 'source'>) => HistorySummary
  undo: () => HistoryTransition
  redo: () => HistoryTransition
}

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
 */
export function createHistoryManager(seed: Array<Omit<HistoryEntry, 'source'>> = []): HistoryManager {
  let localEntries: HistoryEntry[] = seed.map((entry) => ({
    ...entry,
    source: 'local',
  }))
  let remoteEntries: HistoryEntry[] = []
  let cursor = localEntries.length - 1

  const getSummary = (): HistorySummary => ({
    entries: [...localEntries, ...remoteEntries].map(({ id, label, source }) => ({
      id,
      label,
      source,
    })),
    cursor,
    canUndo: cursor >= 0,
    canRedo: cursor < localEntries.length - 1,
  })

  return {
    getSummary,
    pushLocalEntry(entry) {
      if (cursor < localEntries.length - 1) {
        localEntries = localEntries.slice(0, cursor + 1)
      }

      localEntries.push({
        ...entry,
        source: 'local',
      })
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
  }
}
