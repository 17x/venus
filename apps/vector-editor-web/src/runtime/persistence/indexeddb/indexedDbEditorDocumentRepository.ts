import {
  advanceStoredDocument,
  createStoredDocument,
  toStoredDocumentSummary,
  type StoredDocument,
} from '@venus/document-core'

import type {EditorDocumentRepository} from '../ports/index.ts'
import {
  createStoredAssetBlobs,
  hydrateEditorFileFromStorage,
  serializeEditorFileForStorage,
  type StoredEditorAssetBlob,
  type StoredEditorFileDocument,
} from '../storage/editorFileStorage.ts'
import {
  ASSET_STORE,
  DOCUMENT_STORE,
  METADATA_STORE,
  RECOVERY_STORE,
  createIndexedDbConnection,
  requestToPromise,
  transactionToPromise,
  type IndexedDbConnection,
} from './database.ts'

const LAST_OPENED_DOCUMENT_KEY = 'lastOpenedDocumentId'
const MAX_RECOVERY_REVISIONS = 5

interface MetadataRecord {
  key: string
  value: string
}

interface RecoveryRecord {
  key: string
  documentId: string
  revision: number
  stored: StoredDocument<StoredEditorFileDocument>
}

/** Creates the durable local document repository used by every app edition. */
export function createIndexedDbEditorDocumentRepository(
  connection: IndexedDbConnection = createIndexedDbConnection(),
): EditorDocumentRepository {
  return {
    async list() {
      const database = await connection.open()
      const transaction = database.transaction(DOCUMENT_STORE, 'readonly')
      const records = await requestToPromise(
        transaction.objectStore(DOCUMENT_STORE).getAll() as IDBRequest<Array<StoredDocument<StoredEditorFileDocument>>>,
      )
      await transactionToPromise(transaction)
      return records
        .map(toStoredDocumentSummary)
        .sort((left, right) => right.updatedAt - left.updatedAt)
    },

    async load(documentId) {
      const database = await connection.open()
      const transaction = database.transaction([DOCUMENT_STORE, ASSET_STORE], 'readonly')
      const documentRequest = transaction.objectStore(DOCUMENT_STORE).get(documentId) as IDBRequest<
        StoredDocument<StoredEditorFileDocument> | undefined
      >
      const assetRequest = transaction.objectStore(ASSET_STORE)
        .index('documentId')
        .getAll(documentId) as IDBRequest<StoredEditorAssetBlob[]>
      const [stored, assets] = await Promise.all([
        requestToPromise(documentRequest),
        requestToPromise(assetRequest),
      ])
      await transactionToPromise(transaction)
      return stored
        ? hydrateEditorFileFromStorage(stored.document, assets)
        : null
    },

    async loadLastOpened() {
      const database = await connection.open()
      const transaction = database.transaction(METADATA_STORE, 'readonly')
      const metadata = await requestToPromise(
        transaction.objectStore(METADATA_STORE).get(LAST_OPENED_DOCUMENT_KEY) as IDBRequest<MetadataRecord | undefined>,
      )
      await transactionToPromise(transaction)
      return metadata?.value
        ? this.load(metadata.value)
        : null
    },

    async save(file) {
      const database = await connection.open()
      const transaction = database.transaction(
        [DOCUMENT_STORE, ASSET_STORE, RECOVERY_STORE, METADATA_STORE],
        'readwrite',
      )
      const documents = transaction.objectStore(DOCUMENT_STORE)
      const assets = transaction.objectStore(ASSET_STORE)
      const recovery = transaction.objectStore(RECOVERY_STORE)
      const existing = await requestToPromise(
        documents.get(file.id) as IDBRequest<StoredDocument<StoredEditorFileDocument> | undefined>,
      )
      const serialized = serializeEditorFileForStorage({
        ...file,
        updatedAt: Date.now(),
      })
      const stored = existing
        ? advanceStoredDocument(existing, serialized, {
          name: file.name,
          updatedAt: serialized.updatedAt,
        })
        : createStoredDocument({
          id: file.id,
          name: file.name,
          createdAt: file.createdAt,
          updatedAt: serialized.updatedAt,
          document: serialized,
        })

      documents.put(stored)
      transaction.objectStore(METADATA_STORE).put({
        key: LAST_OPENED_DOCUMENT_KEY,
        value: file.id,
      } satisfies MetadataRecord)

      const activeAssetKeys = new Set<string>()
      createStoredAssetBlobs(file.id, file.assets ?? []).forEach((record) => {
        activeAssetKeys.add(record.key)
        assets.put(record)
      })
      const existingAssetKeys = await requestToPromise(
        assets.index('documentId').getAllKeys(file.id),
      )
      existingAssetKeys.forEach((key) => {
        if (typeof key === 'string' && !activeAssetKeys.has(key)) {
          assets.delete(key)
        }
      })

      const recoveryRecord: RecoveryRecord = {
        key: `${file.id}:${stored.revision}`,
        documentId: file.id,
        revision: stored.revision,
        stored,
      }
      recovery.put(recoveryRecord)
      const recoveryRecords = await requestToPromise(
        recovery.index('documentId').getAll(file.id) as IDBRequest<RecoveryRecord[]>,
      )
      recoveryRecords
        .sort((left, right) => right.revision - left.revision)
        .slice(MAX_RECOVERY_REVISIONS)
        .forEach((record) => {
          if (record.key !== recoveryRecord.key) {
            recovery.delete(record.key)
          }
        })

      await transactionToPromise(transaction)
      return stored
    },

    async delete(documentId) {
      const database = await connection.open()
      const transaction = database.transaction(
        [DOCUMENT_STORE, ASSET_STORE, RECOVERY_STORE],
        'readwrite',
      )
      transaction.objectStore(DOCUMENT_STORE).delete(documentId)
      await deleteIndexRecords(transaction.objectStore(ASSET_STORE), 'documentId', documentId)
      await deleteIndexRecords(transaction.objectStore(RECOVERY_STORE), 'documentId', documentId)
      await transactionToPromise(transaction)
    },

    async clearLastOpened() {
      const database = await connection.open()
      const transaction = database.transaction(METADATA_STORE, 'readwrite')
      transaction.objectStore(METADATA_STORE).delete(LAST_OPENED_DOCUMENT_KEY)
      await transactionToPromise(transaction)
    },
  }
}

async function deleteIndexRecords(
  store: IDBObjectStore,
  indexName: string,
  value: string,
): Promise<void> {
  const keys = await requestToPromise(store.index(indexName).getAllKeys(value))
  keys.forEach((key) => store.delete(key))
}
