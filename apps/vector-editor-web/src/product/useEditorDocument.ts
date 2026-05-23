import {useCallback, useMemo, useState} from 'react'
import {MOCK_FILE} from '../runtime/presets/mockFile/mockFile.ts'
import saveFileHelper from '../runtime/adapters/saveFileHelper.ts'
import {createEditorDocumentFromFile, createFileElementsFromDocument} from '../runtime/adapters/fileDocument/fileDocument.ts'
import type {
  EditorFileAsset,
  EditorFileDocument,
  EditorFileHistoryRecoveryReplayMode,
  EditorFileHistoryRecoveryReplaySnapshot,
  EditorFileLifecycleDirtySource,
  EditorFileLifecycleTransitionSource,
} from '../runtime/types/index.ts'
import {
  resolveLifecycleOnFileCreate,
  resolveLifecycleOnFileOpen,
  resolveLifecycleOnFileSave,
} from './editorRuntimeHelpers/fileLifecycle.ts'

/**
 * Declares optional lifecycle context payload forwarded by product save/open orchestration.
 */
export interface EditorDocumentLifecycleContext {
  /** Stores explicit transition source metadata for lifecycle observability. */
  transitionSource?: EditorFileLifecycleTransitionSource
  /** Stores latest dirty source chain derived from runtime command history. */
  dirtySource?: EditorFileLifecycleDirtySource
  /** Stores optional recovery reason used by recovery-only transitions. */
  recoveryReason?: string
  /** Stores crash-recovery recent-N replay payload persisted at save time. */
  crashRecoveryReplay?: EditorFileHistoryRecoveryReplaySnapshot
  /** Stores startup replay mode persisted together with crash-recovery snapshot. */
  crashRecoveryReplayMode?: EditorFileHistoryRecoveryReplayMode
}

/**
 * Creates one saved-file snapshot with synchronized lifecycle and timestamps.
 * @param file Source file payload.
 * @param document Source runtime document snapshot.
 * @param sessionAssets Current in-memory asset list.
 * @param lifecycleContext Optional lifecycle transition context from runtime/product orchestration.
 */
function createSavedFileSnapshot(
  file: EditorFileDocument,
  document: ReturnType<typeof createEditorDocumentFromFile>,
  sessionAssets: EditorFileAsset[],
  lifecycleContext?: EditorDocumentLifecycleContext,
): EditorFileDocument {
  const now = Date.now()

  return {
    ...file,
    updatedAt: now,
    lifecycle: resolveLifecycleOnFileSave(file.lifecycle, lifecycleContext),
    config: {
      ...file.config,
      editor: {
        ...file.config.editor,
        crashRecoveryReplay: lifecycleContext?.crashRecoveryReplay ?? file.config.editor?.crashRecoveryReplay,
        crashRecoveryReplayMode: lifecycleContext?.crashRecoveryReplayMode ?? file.config.editor?.crashRecoveryReplayMode ?? 'merged',
      },
    },
    elements: createFileElementsFromDocument(document),
    assets: sessionAssets,
  }
}

export function useEditorDocument() {
  const [file, setFile] = useState<EditorFileDocument | null>(MOCK_FILE)
  const [sessionAssets, setSessionAssets] = useState<EditorFileAsset[]>(MOCK_FILE.assets ?? [])
  const activeFile = file ?? MOCK_FILE
  const document = useMemo(() => createEditorDocumentFromFile(activeFile), [activeFile])
  const hasFile = !!file

  const openFile = useCallback((nextFile: EditorFileDocument) => {
    setFile({
      ...nextFile,
      lifecycle: resolveLifecycleOnFileOpen(nextFile),
    })
    setSessionAssets(nextFile.assets ?? [])
  }, [])

  const closeFile = useCallback(() => {
    setFile(null)
    setSessionAssets(MOCK_FILE.assets ?? [])
  }, [])

  const createFile = useCallback((nextFile: EditorFileDocument) => {
    setFile({
      ...nextFile,
      lifecycle: resolveLifecycleOnFileCreate(nextFile),
    })
    setSessionAssets(nextFile.assets ?? [])
  }, [])

  const addAsset = useCallback((asset: EditorFileAsset) => {
    setSessionAssets((currentAssets) => {
      if (currentAssets.some((item) => item.id === asset.id)) {
        return currentAssets
      }

      return [...currentAssets, asset]
    })
  }, [])

  const saveFile = useCallback((nextDocument = document, lifecycleContext?: EditorDocumentLifecycleContext) => {
    if (!file) {
      return
    }
    if (file.config.editor?.readOnly === true) {
      return
    }

    const nextFile = createSavedFileSnapshot(file, nextDocument, sessionAssets, lifecycleContext)
    saveFileHelper(nextFile)
    setFile(nextFile)
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
  }
}
