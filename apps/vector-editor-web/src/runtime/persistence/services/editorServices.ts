import {createDisabledSyncProvider, type SyncProvider} from '@venus/sync-core'

import {createIndexedDbEditorDocumentRepository} from '../indexeddb/indexedDbEditorDocumentRepository.ts'
import type {EditorDocumentRepository} from '../ports/index.ts'

export interface EditorCapabilities {
  localPersistence: true
  cloudSync: boolean
  accounts: boolean
  sharing: boolean
  realtimeCollaboration: boolean
}

export interface EditorServices {
  documents: EditorDocumentRepository
  sync: SyncProvider
  capabilities: EditorCapabilities
}

/** Composes the publishable offline edition without exposing unfinished online behavior. */
export function createOfflineEditorServices(): EditorServices {
  return {
    documents: createIndexedDbEditorDocumentRepository(),
    sync: createDisabledSyncProvider(),
    capabilities: {
      localPersistence: true,
      cloudSync: false,
      accounts: false,
      sharing: false,
      realtimeCollaboration: false,
    },
  }
}
