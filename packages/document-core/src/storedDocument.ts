/** Identifies the current platform-neutral stored-document envelope. */
export const STORED_DOCUMENT_SCHEMA_VERSION = 1

/** Metadata used to display a locally stored document without loading its payload. */
export interface StoredDocumentSummary {
  id: string
  name: string
  revision: number
  schemaVersion: number
  createdAt: number
  updatedAt: number
}

/** Versioned persistence envelope shared by local and remote repositories. */
export interface StoredDocument<TDocument> extends StoredDocumentSummary {
  document: TDocument
}

/** Input used when creating the first stored revision of a document. */
export interface CreateStoredDocumentInput<TDocument> {
  id: string
  name: string
  document: TDocument
  createdAt?: number
  updatedAt?: number
  schemaVersion?: number
}

/** Creates the first deterministic revision of a stored document. */
export function createStoredDocument<TDocument>(
  input: CreateStoredDocumentInput<TDocument>,
): StoredDocument<TDocument> {
  const updatedAt = input.updatedAt ?? Date.now()

  return {
    id: input.id,
    name: input.name,
    revision: 1,
    schemaVersion: input.schemaVersion ?? STORED_DOCUMENT_SCHEMA_VERSION,
    createdAt: input.createdAt ?? updatedAt,
    updatedAt,
    document: input.document,
  }
}

/** Advances an existing stored document without changing its stable identity. */
export function advanceStoredDocument<TDocument>(
  current: StoredDocument<TDocument>,
  document: TDocument,
  input?: {name?: string; updatedAt?: number},
): StoredDocument<TDocument> {
  return {
    ...current,
    name: input?.name ?? current.name,
    revision: current.revision + 1,
    updatedAt: input?.updatedAt ?? Date.now(),
    document,
  }
}

/** Removes a loaded payload to produce a list-friendly summary. */
export function toStoredDocumentSummary<TDocument>(
  stored: StoredDocument<TDocument>,
): StoredDocumentSummary {
  return {
    id: stored.id,
    name: stored.name,
    revision: stored.revision,
    schemaVersion: stored.schemaVersion,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  }
}
