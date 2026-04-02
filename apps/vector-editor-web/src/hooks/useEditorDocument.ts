import {useCallback, useMemo, useState} from 'react'
import {MOCK_FILE} from '../contexts/appContext/mockFile.ts'
import saveFileHelper from '../contexts/fileContext/saveFileHelper.ts'
import {createEditorDocumentFromFile, createFileElementsFromDocument} from '../adapters/fileDocument.ts'
import type {VisionFileType} from './useEditorRuntime.types.ts'

export function useEditorDocument() {
  const [file, setFile] = useState<VisionFileType | null>(MOCK_FILE)
  const [creating, setCreating] = useState(false)
  const activeFile = file ?? MOCK_FILE
  const document = useMemo(() => createEditorDocumentFromFile(activeFile), [activeFile])
  const hasFile = !!file
  const showCreateFile = !hasFile || creating

  const openFile = useCallback((nextFile: VisionFileType) => {
    setFile(nextFile)
    setCreating(false)
  }, [])

  const closeFile = useCallback(() => {
    setFile(null)
    setCreating(false)
  }, [])

  const createFile = useCallback((nextFile: VisionFileType) => {
    setFile(nextFile)
    setCreating(false)
  }, [])

  const startCreateFile = useCallback(() => {
    setCreating(true)
  }, [])

  const handleCreating = useCallback((value: boolean) => {
    setCreating(value)
  }, [])

  const saveFile = useCallback((nextDocument = document) => {
    if (!file) {
      return
    }

    saveFileHelper(file, {
      elements: createFileElementsFromDocument(nextDocument),
    })
  }, [document, file])

  return {
    file,
    document,
    hasFile,
    creating,
    showCreateFile,
    openFile,
    closeFile,
    createFile,
    startCreateFile,
    handleCreating,
    saveFile,
  }
}
