import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {MOCK_FILE} from './presets/mockFile/mockFile.ts'
import {exportDocumentArchive} from './adapters/exportDocumentArchive.ts'
import {createEditorDocumentFromFile, createFileElementsFromDocument} from './adapters/fileDocument/fileDocument.ts'
import type {EditorFileAsset, EditorFileDocument} from './types/index.ts'
import {
  createAutosaveController,
  type AutosaveSnapshot,
  type EditorServices,
} from './persistence/index.ts'
import {releaseEditorFileObjectUrls} from './persistence/storage/editorFileStorage.ts'

const INITIAL_LOCAL_SAVE_SNAPSHOT: AutosaveSnapshot = {
  status: 'restoring',
  lastSavedAt: null,
  errorMessage: null,
}

export function useEditorDocument(services: EditorServices) {
  const [file, setFile] = useState<EditorFileDocument | null>(MOCK_FILE)
  const [sessionAssets, setSessionAssets] = useState<EditorFileAsset[]>(MOCK_FILE.assets ?? [])
  const [persistenceReady, setPersistenceReady] = useState(false)
  const [localSaveSnapshot, setLocalSaveSnapshot] = useState<AutosaveSnapshot>(INITIAL_LOCAL_SAVE_SNAPSHOT)
  const fileRef = useRef<EditorFileDocument | null>(MOCK_FILE)
  const activeFile = file ?? MOCK_FILE
  const document = useMemo(() => createEditorDocumentFromFile(activeFile), [activeFile])
  const hasFile = !!file
  const autosave = useMemo(() => createAutosaveController<EditorFileDocument>({
    async save(nextFile) {
      await services.documents.save(nextFile)
      services.sync.requestSync()
    },
  }), [services])

  const replaceFile = useCallback((nextFile: EditorFileDocument | null) => {
    setFile((currentFile) => {
      if (currentFile !== nextFile) {
        releaseEditorFileObjectUrls(currentFile)
      }
      fileRef.current = nextFile
      return nextFile
    })
    setSessionAssets(nextFile?.assets ?? [])
  }, [])

  useEffect(() => {
    return autosave.subscribe(setLocalSaveSnapshot)
  }, [autosave])

  useEffect(() => {
    let cancelled = false

    void services.sync.start()
    void services.documents.loadLastOpened()
      .then((restoredFile) => {
        if (!cancelled && restoredFile) {
          replaceFile(restoredFile)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLocalSaveSnapshot({
            status: 'error',
            lastSavedAt: null,
            errorMessage: error instanceof Error
              ? error.message
              : 'Unable to restore the local document',
          })
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPersistenceReady(true)
          setLocalSaveSnapshot((current) => current.status === 'restoring'
            ? {...current, status: 'idle'}
            : current)
        }
      })

    return () => {
      cancelled = true
      services.sync.stop()
    }
  }, [replaceFile, services])

  useEffect(() => {
    const flushWhenHidden = () => {
      if (window.document.visibilityState === 'hidden') {
        void autosave.flush()
      }
    }
    const flushOnPageHide = () => {
      void autosave.flush()
    }

    window.document.addEventListener('visibilitychange', flushWhenHidden)
    window.addEventListener('pagehide', flushOnPageHide)
    return () => {
      window.document.removeEventListener('visibilitychange', flushWhenHidden)
      window.removeEventListener('pagehide', flushOnPageHide)
      void autosave.flush().finally(() => autosave.dispose())
    }
  }, [autosave])

  useEffect(() => {
    return () => {
      releaseEditorFileObjectUrls(fileRef.current)
    }
  }, [])

  useEffect(() => {
    fileRef.current = file ? {...file, assets: sessionAssets} : null
  }, [file, sessionAssets])

  const openFile = useCallback((nextFile: EditorFileDocument) => {
    replaceFile(nextFile)
  }, [replaceFile])

  const closeFile = useCallback(() => {
    replaceFile(null)
    void services.documents.clearLastOpened()
  }, [replaceFile, services.documents])

  const createFile = useCallback((nextFile: EditorFileDocument) => {
    replaceFile(nextFile)
  }, [replaceFile])

  const addAsset = useCallback((asset: EditorFileAsset) => {
    setSessionAssets((currentAssets) => {
      if (currentAssets.some((item) => item.id === asset.id)) {
        return currentAssets
      }

      return [...currentAssets, asset]
    })
  }, [])

  const createFileSnapshot = useCallback((nextDocument = document) => {
    if (!file || !persistenceReady) {
      return null
    }

    return {
      ...file,
      updatedAt: Date.now(),
      elements: createFileElementsFromDocument(nextDocument),
      assets: sessionAssets,
    }
  }, [document, file, persistenceReady, sessionAssets])

  const scheduleLocalSave = useCallback((nextDocument = document) => {
    const snapshot = createFileSnapshot(nextDocument)
    if (snapshot) {
      autosave.schedule(snapshot)
    }
  }, [autosave, createFileSnapshot, document])

  const saveFile = useCallback(async (nextDocument = document) => {
    const snapshot = createFileSnapshot(nextDocument)
    if (!snapshot) {
      return
    }

    autosave.schedule(snapshot)
    await autosave.flush()
  }, [autosave, createFileSnapshot, document])

  const exportFileArchive = useCallback((nextDocument = document) => {
    if (!file) {
      return Promise.resolve()
    }

    return exportDocumentArchive(file, {
      elements: createFileElementsFromDocument(nextDocument),
      assets: sessionAssets,
    })
  }, [document, file, sessionAssets])

  return {
    file: file ? {...file, assets: sessionAssets} : file,
    document,
    hasFile,
    openFile,
    closeFile,
    createFile,
    addAsset,
    saveFile,
    exportFileArchive,
    scheduleLocalSave,
    flushLocalSave: autosave.flush,
    localSaveSnapshot,
    persistenceReady,
  }
}
