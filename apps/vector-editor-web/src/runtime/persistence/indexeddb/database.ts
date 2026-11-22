const DATABASE_NAME = 'venus-local'
const DATABASE_VERSION = 1

export const DOCUMENT_STORE = 'documents'
export const ASSET_STORE = 'assets'
export const RECOVERY_STORE = 'recovery'
export const METADATA_STORE = 'metadata'

export interface IndexedDbConnection {
  open(): Promise<IDBDatabase>
  close(): void
}

/** Creates a lazy IndexedDB connection shared by the local repositories. */
export function createIndexedDbConnection(): IndexedDbConnection {
  let databasePromise: Promise<IDBDatabase> | null = null

  return {
    open() {
      if (!databasePromise) {
        databasePromise = openDatabase()
      }
      return databasePromise
    },
    close() {
      void databasePromise?.then((database) => database.close())
      databasePromise = null
    },
  }
}

export function requestToPromise<TResult>(request: IDBRequest<TResult>): Promise<TResult> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(DOCUMENT_STORE)) {
        database.createObjectStore(DOCUMENT_STORE, {keyPath: 'id'})
      }

      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        const assets = database.createObjectStore(ASSET_STORE, {keyPath: 'key'})
        assets.createIndex('documentId', 'documentId', {unique: false})
      }

      if (!database.objectStoreNames.contains(RECOVERY_STORE)) {
        const recovery = database.createObjectStore(RECOVERY_STORE, {keyPath: 'key'})
        recovery.createIndex('documentId', 'documentId', {unique: false})
      }

      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        database.createObjectStore(METADATA_STORE, {keyPath: 'key'})
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open local document database'))
    request.onblocked = () => reject(new Error('Local document database upgrade is blocked by another tab'))
  })
}
