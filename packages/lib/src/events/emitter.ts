/**
 * Defines an event listener callback for a payload type.
 */
export type EventListener<TPayload> = (payload: TPayload) => void

/**
 * Defines a dispose function that removes a previously registered listener.
 */
export type EventUnsubscribe = () => void

/**
 * Defines a minimal event emitter contract used across packages.
 */
export interface EventEmitter<TPayload> {
  /** Registers a listener and returns an unsubscribe callback. */
  on(listener: EventListener<TPayload>): EventUnsubscribe
  /** Emits an event payload to all active listeners. */
  emit(payload: TPayload): void
  /** Removes all listeners at once. */
  clear(): void
}

/**
 * Creates a tiny event emitter with stable insertion-order dispatch.
 */
export function createEventEmitter<TPayload>(): EventEmitter<TPayload> {
  const listeners = new Set<EventListener<TPayload>>()

  /**
   * Registers a listener and returns a disposer for the same callback reference.
   */
  const on = (listener: EventListener<TPayload>): EventUnsubscribe => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  /**
   * Emits a payload to a snapshot copy so listeners can unsubscribe safely while dispatching.
   */
  const emit = (payload: TPayload): void => {
    for (const listener of [...listeners]) {
      listener(payload)
    }
  }

  /**
   * Clears all listeners to release references in long-lived runtimes.
   */
  const clear = (): void => {
    listeners.clear()
  }

  return {
    on,
    emit,
    clear,
  }
}

