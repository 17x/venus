export type LocalSaveStatus = 'restoring' | 'idle' | 'saving' | 'saved' | 'error'

export interface AutosaveSnapshot {
  status: LocalSaveStatus
  lastSavedAt: number | null
  errorMessage: string | null
}

export interface AutosaveController<TValue> {
  schedule(value: TValue): void
  flush(): Promise<void>
  dispose(): void
  getSnapshot(): AutosaveSnapshot
  subscribe(listener: (snapshot: AutosaveSnapshot) => void): () => void
}

/** Creates a serialized, coalescing autosave queue for committed editor documents. */
export function createAutosaveController<TValue>(options: {
  delayMs?: number
  save(value: TValue): Promise<unknown>
  now?: () => number
}): AutosaveController<TValue> {
  const listeners = new Set<(snapshot: AutosaveSnapshot) => void>()
  const delayMs = options.delayMs ?? 750
  const now = options.now ?? Date.now
  let snapshot: AutosaveSnapshot = {
    status: 'idle',
    lastSavedAt: null,
    errorMessage: null,
  }
  let pendingValue: TValue | undefined
  let timer: ReturnType<typeof setTimeout> | null = null
  let running: Promise<void> | null = null
  let disposed = false

  const publish = (next: AutosaveSnapshot) => {
    snapshot = next
    listeners.forEach((listener) => listener(snapshot))
  }

  const drain = async (): Promise<void> => {
    if (running) {
      await running
    }
    if (pendingValue === undefined || disposed) {
      return
    }

    const value = pendingValue
    pendingValue = undefined
    publish({...snapshot, status: 'saving', errorMessage: null})
    running = options.save(value)
      .then(() => {
        publish({status: 'saved', lastSavedAt: now(), errorMessage: null})
      })
      .catch((error: unknown) => {
        publish({
          ...snapshot,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Local save failed',
        })
      })
      .finally(() => {
        running = null
      })

    await running
    if (pendingValue !== undefined) {
      await drain()
    }
  }

  return {
    schedule(value) {
      if (disposed) {
        return
      }
      pendingValue = value
      if (timer !== null) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        timer = null
        void drain()
      }, delayMs)
    },
    async flush() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      await drain()
    },
    dispose() {
      disposed = true
      pendingValue = undefined
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      listeners.clear()
    },
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
