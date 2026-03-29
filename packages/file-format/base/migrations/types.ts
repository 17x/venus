export interface RuntimeDocumentV1 {
  version: 1
  rootNodes: unknown[]
}

export type RuntimeDocumentLatest = RuntimeDocumentV1
export type RuntimeDocumentAny = RuntimeDocumentV1
