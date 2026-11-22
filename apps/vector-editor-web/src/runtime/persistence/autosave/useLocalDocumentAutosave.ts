import {useEffect} from 'react'

import type {EditorDocument} from '../../model/index.ts'

/** Bridges committed runtime snapshots into the local autosave queue. */
export function useLocalDocumentAutosave(input: {
  document: EditorDocument
  ready: boolean
  persistenceReady: boolean
  schedule(document: EditorDocument): void
}): void {
  useEffect(() => {
    if (input.ready && input.persistenceReady) {
      input.schedule(input.document)
    }
  }, [input.document, input.persistenceReady, input.ready, input.schedule])
}
