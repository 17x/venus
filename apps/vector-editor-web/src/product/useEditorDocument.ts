import {useCallback, useMemo, useState} from 'react'
import {MOCK_FILE} from '../runtime/presets/mockFile/mockFile.ts'
import saveFileHelper from '../runtime/adapters/saveFileHelper.ts'
import {createEditorDocumentFromFile, createFileElementsFromDocument} from '../runtime/adapters/fileDocument/fileDocument.ts'
import type {EditorFileAsset, EditorFileDocument} from '../runtime/types/index.ts'

export function useEditorDocument() {
  const [file, setFile] = useState<EditorFileDocument | null>(MOCK_FILE)
  const [sessionAssets, setSessionAssets] = useState<EditorFileAsset[]>(MOCK_FILE.assets ?? [])
  const activeFile = file ?? MOCK_FILE
  const document = useMemo(() => createEditorDocumentFromFile(activeFile), [activeFile])
  const hasFile = !!file

  const openFile = useCallback((nextFile: EditorFileDocument) => {
    setFile(nextFile)
    setSessionAssets(nextFile.assets ?? [])
  }, [])

  const closeFile = useCallback(() => {
    setFile(null)
    setSessionAssets(MOCK_FILE.assets ?? [])
  }, [])

  const createFile = useCallback((nextFile: EditorFileDocument) => {
    setFile(nextFile)
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

  const saveFile = useCallback((nextDocument = document) => {
    if (!file) {
      return
    }

    saveFileHelper(file, {
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
  }
}
