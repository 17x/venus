/** User-visible state of the optional remote synchronization capability. */
export type SyncStatus = 'disabled' | 'offline' | 'idle' | 'syncing' | 'error'

/** Immutable synchronization state exposed to application shells. */
export interface SyncSnapshot {
  status: SyncStatus
  pendingOperationCount: number
  lastSyncedAt: number | null
  errorMessage: string | null
}

/** Adapter boundary implemented by disabled and future remote providers. */
export interface SyncProvider {
  start(): Promise<void>
  requestSync(): void
  stop(): void
  getSnapshot(): SyncSnapshot
  subscribe(listener: (snapshot: SyncSnapshot) => void): () => void
}

const DISABLED_SYNC_SNAPSHOT: SyncSnapshot = {
  status: 'disabled',
  pendingOperationCount: 0,
  lastSyncedAt: null,
  errorMessage: null,
}

/** Creates the production offline-edition provider without a partial network path. */
export function createDisabledSyncProvider(): SyncProvider {
  return {
    async start() {},
    requestSync() {},
    stop() {},
    getSnapshot() {
      return DISABLED_SYNC_SNAPSHOT
    },
    subscribe() {
      return () => {}
    },
  }
}
