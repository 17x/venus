export type RuntimeReactiveListener<TSnapshot> = (snapshot: TSnapshot) => void

export type RuntimeReactiveSliceListener<TSlice> = (
  nextSlice: TSlice,
  previousSlice: TSlice,
) => void

export type RuntimeReactiveSelector<TSnapshot, TSlice> = (snapshot: TSnapshot) => TSlice

export type RuntimeReactiveEqualityFn<TValue> = (next: TValue, previous: TValue) => boolean

export type RuntimeReactiveUpdater<TValue> = TValue | ((current: TValue) => TValue)

/**
 * Describes one event emitted by the reactive bridge.
 */
export interface RuntimeReactiveEventEnvelope<TEvent> {
  /** Stores event payload emitted by runtime producers. */
  event: TEvent
  /** Stores latest snapshot associated with this event dispatch. */
  snapshot: unknown
}

/**
 * Defines one event subscription callback.
 */
export type RuntimeReactiveEventListener<TEvent, TSnapshot> = (
  event: TEvent,
  snapshot: TSnapshot,
) => void

/**
 * Defines the event-driven snapshot bridge contract used by runtime and UI adapters.
 */
export interface RuntimeReactiveBridge<TSnapshot, TEvent> {
  /** Returns latest snapshot for direct reads. */
  getSnapshot(): TSnapshot
  /** Runs one read-only query against the latest snapshot. */
  query<TResult>(selector: RuntimeReactiveSelector<TSnapshot, TResult>): TResult
  /** Replaces snapshot with one updater and notifies subscribers. */
  patch(updater: RuntimeReactiveUpdater<TSnapshot>): TSnapshot
  /** Subscribes to whole-snapshot updates. */
  subscribe(listener: RuntimeReactiveListener<TSnapshot>): () => void
  /** Subscribes to one derived slice and only notifies on slice change. */
  subscribeSlice<TSlice>(
    selector: RuntimeReactiveSelector<TSnapshot, TSlice>,
    listener: RuntimeReactiveSliceListener<TSlice>,
    isEqual?: RuntimeReactiveEqualityFn<TSlice>,
  ): () => void
  /** Emits one runtime event to event subscribers. */
  dispatch(event: TEvent): void
  /** Subscribes to runtime events emitted through this bridge. */
  subscribeEvent(listener: RuntimeReactiveEventListener<TEvent, TSnapshot>): () => void
}

const defaultEquality = <TValue>(next: TValue, previous: TValue) => Object.is(next, previous)

/**
 * Resolves one concrete value from either direct value or updater callback.
 */
function resolveUpdatedValue<TValue>(
  current: TValue,
  next: RuntimeReactiveUpdater<TValue>,
): TValue {
  if (typeof next === 'function') {
    const updater = next as (snapshot: TValue) => TValue
    return updater(current)
  }
  return next
}

/**
 * Creates an event-driven runtime bridge with fine-grained slice subscriptions.
 */
export function createRuntimeReactiveBridge<TSnapshot, TEvent>(
  initialSnapshot: TSnapshot,
): RuntimeReactiveBridge<TSnapshot, TEvent> {
  let snapshot = initialSnapshot
  const snapshotListeners = new Set<RuntimeReactiveListener<TSnapshot>>()
  const eventListeners = new Set<RuntimeReactiveEventListener<TEvent, TSnapshot>>()

  return {
    getSnapshot() {
      return snapshot
    },
    query(selector) {
      return selector(snapshot)
    },
    patch(updater) {
      const nextSnapshot = resolveUpdatedValue(snapshot, updater)
      if (Object.is(nextSnapshot, snapshot)) {
        return snapshot
      }
      snapshot = nextSnapshot
      snapshotListeners.forEach((listener) => {
        listener(snapshot)
      })
      return snapshot
    },
    subscribe(listener) {
      snapshotListeners.add(listener)
      return () => {
        snapshotListeners.delete(listener)
      }
    },
    subscribeSlice(selector, listener, isEqual = defaultEquality) {
      let previousSlice = selector(snapshot)

      // Reuse whole-snapshot subscription so derived-slice logic stays centralized.
      return this.subscribe((nextSnapshot) => {
        const nextSlice = selector(nextSnapshot)
        if (isEqual(nextSlice, previousSlice)) {
          return
        }
        const currentPreviousSlice = previousSlice
        previousSlice = nextSlice
        listener(nextSlice, currentPreviousSlice)
      })
    },
    dispatch(event) {
      eventListeners.forEach((listener) => {
        listener(event, snapshot)
      })
    },
    subscribeEvent(listener) {
      eventListeners.add(listener)
      return () => {
        eventListeners.delete(listener)
      }
    },
  }
}