export type RuntimeListener<TState> = (state: TState) => void

export interface RuntimeSubscriptionStore<TState> {
  getSnapshot(): TState
  setSnapshot(next: TState): void
  subscribe(listener: RuntimeListener<TState>): () => void
}

/**
 * Small runtime-local subscription primitive for non-React state consumers.
 */
export function createRuntimeSubscriptionStore<TState>(initialState: TState): RuntimeSubscriptionStore<TState> {
  let snapshot = initialState
  const listeners = new Set<RuntimeListener<TState>>()

  return {
    getSnapshot() {
      return snapshot
    },
    setSnapshot(next) {
      snapshot = next
      listeners.forEach((listener) => listener(snapshot))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
