export interface CanvasSnapshotStore<TSnapshot, TController> {
  controller: TController
  getSnapshot: () => TSnapshot
  subscribe: (listener: () => void) => () => void
}

export function createCanvasSnapshotStore<TSnapshot, TController>(
  controller: TController,
  getSnapshot: () => TSnapshot,
  subscribe: (listener: () => void) => () => void,
): CanvasSnapshotStore<TSnapshot, TController> {
  return {
    controller,
    getSnapshot,
    subscribe,
  }
}

/**
 * Stateless snapshot selection helper for store subscribers.
 */
export function selectCanvasSnapshot<TSnapshot, TSelection>(
  snapshot: TSnapshot,
  selector: (snapshot: TSnapshot) => TSelection,
) {
  return selector(snapshot)
}