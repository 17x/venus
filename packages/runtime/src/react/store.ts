import * as React from 'react'

export interface CanvasSnapshotStore<TSnapshot, TController> {
  controller: TController
  getSnapshot: () => TSnapshot
  subscribe: (listener: () => void) => () => void
}

export function useCanvasStoreSelector<TSnapshot, TController, TSelection>(
  store: CanvasSnapshotStore<TSnapshot, TController>,
  selector: (snapshot: TSnapshot) => TSelection,
  isEqual: (previous: TSelection, next: TSelection) => boolean = Object.is,
) {
  const latestRef = React.useRef<TSelection | null>(null)

  const getSelection = React.useCallback(() => {
    const snapshot = store.getSnapshot()
    const nextSelection = selector(snapshot)
    const cached = latestRef.current
    if (cached !== null && isEqual(cached, nextSelection)) {
      return cached
    }

    latestRef.current = nextSelection
    return nextSelection
  }, [isEqual, selector, store])

  return React.useSyncExternalStore(
    store.subscribe,
    getSelection,
    getSelection,
  )
}
