export interface VenusHistoryController<TSnapshot> {
  record(snapshot: TSnapshot): void
  undo(currentSnapshot: TSnapshot): TSnapshot | null
  redo(currentSnapshot: TSnapshot): TSnapshot | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}

export interface VenusHistoryControllerOptions<TSnapshot> {
  limit: number
  clone?: (snapshot: TSnapshot) => TSnapshot
}

const cloneHistorySnapshot = <TSnapshot>(snapshot: TSnapshot): TSnapshot => {
  if (typeof structuredClone === 'function') {
    return structuredClone(snapshot) as TSnapshot
  }

  return JSON.parse(JSON.stringify(snapshot)) as TSnapshot
}

export function createVenusHistoryController<TSnapshot>(
  options: VenusHistoryControllerOptions<TSnapshot>,
): VenusHistoryController<TSnapshot> {
  const clone = options.clone ?? cloneHistorySnapshot
  const limit = Math.max(1, Math.trunc(options.limit))
  const past: TSnapshot[] = []
  const future: TSnapshot[] = []

  return {
    record(snapshot) {
      past.push(clone(snapshot))
      if (past.length > limit) {
        past.shift()
      }
      future.length = 0
    },
    undo(currentSnapshot) {
      const previous = past.pop()
      if (!previous) {
        return null
      }

      future.push(clone(currentSnapshot))
      return clone(previous)
    },
    redo(currentSnapshot) {
      const next = future.pop()
      if (!next) {
        return null
      }

      past.push(clone(currentSnapshot))
      return clone(next)
    },
    canUndo() {
      return past.length > 0
    },
    canRedo() {
      return future.length > 0
    },
    clear() {
      past.length = 0
      future.length = 0
    },
  }
}
