import type {StoredDocument, StoredDocumentSummary} from '@venus/document-core'

import type {EditorFileDocument} from '../../types/index.ts'
import type {StoredEditorFileDocument} from '../storage/editorFileStorage.ts'

/** Local document persistence boundary consumed by the editor lifecycle. */
export interface EditorDocumentRepository {
  list(): Promise<StoredDocumentSummary[]>
  load(documentId: string): Promise<EditorFileDocument | null>
  loadLastOpened(): Promise<EditorFileDocument | null>
  save(file: EditorFileDocument): Promise<StoredDocument<StoredEditorFileDocument>>
  delete(documentId: string): Promise<void>
  clearLastOpened(): Promise<void>
}
