import {useCallback, useMemo, useState} from 'react'
import {MOCK_FILE} from '../../contexts/appContext/mockFile.ts'
import saveFileHelper from '../../contexts/fileContext/saveFileHelper.ts'
import {createEditorDocumentFromFile, createFileElementsFromDocument} from '../adapters/fileDocument.ts'
import type {VisionFileAsset, VisionFileType} from './useEditorRuntime.types.ts'

export function useEditorDocument() {
  const [file, setFile] = useState<VisionFileType | null>(MOCK_FILE)
  const [sessionAssets, setSessionAssets] = useState<VisionFileAsset[]>(MOCK_FILE.assets ?? [])
  const activeFile = file ?? MOCK_FILE
  const document = useMemo(() => createEditorDocumentFromFile(activeFile), [activeFile])
  const hasFile = !!file

  const openFile = useCallback((nextFile: VisionFileType) => {
    setFile(nextFile)
    setSessionAssets(nextFile.assets ?? [])
  }, [])

  const closeFile = useCallback(() => {
    setFile(null)
    setSessionAssets(MOCK_FILE.assets ?? [])
  }, [])

  const createFile = useCallback((nextFile: VisionFileType) => {
    setFile(nextFile)
    setSessionAssets(nextFile.assets ?? [])
  }, [])

  const addAsset = useCallback((asset: VisionFileAsset) => {
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
