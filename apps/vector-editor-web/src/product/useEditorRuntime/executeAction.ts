import {useMemo} from 'react'
import type {ElementProps} from '../../runtime/types/index.ts'
import type {ToolName} from '../../runtime/model/index.ts'
import type {EditorFileAsset} from '../../runtime/types/index.ts'
import {
  createEditorRuntimeActionExecutor,
  type EditorRuntimeActionExecutorOptions,
} from '../runtime/createEditorRuntimeActionExecutor.ts'

interface UseEditorRuntimeExecuteActionOptions {
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  addAsset: (asset: EditorFileAsset) => void
  canvasRuntime: ReturnType<typeof import('../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']
  clipboard: ElementProps[]
  clearMask: VoidFunction
  closeFile: VoidFunction
  handleCommand: (command: import('../../runtime/worker/index.ts').EditorRuntimeCommand) => void
  insertElement: (element: ElementProps) => void
  insertElementsBatch: (elements: ElementProps[]) => void
  pasteSerial: number
  reorderSelectedShape: (direction: 'up' | 'down' | 'top' | 'bottom') => void
  saveFile: (document: ReturnType<typeof import('../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['document']) => void
  selectedNode: import('../../runtime/model/index.ts').DocumentNode | null
  selectedShapeIds: string[]
  setClipboard: React.Dispatch<React.SetStateAction<ElementProps[]>>
  setCurrentTool: (toolName: ToolName) => void
  setPasteSerial: React.Dispatch<React.SetStateAction<number>>
  setShowPrint: React.Dispatch<React.SetStateAction<boolean>>
  applyAutoMask: VoidFunction
}

/**
 * Creates a React-stable action executor by composing pure runtime action controller.
 */
export function useEditorRuntimeExecuteAction(options: UseEditorRuntimeExecuteActionOptions) {
  return useMemo(() => {
    const executorOptions: EditorRuntimeActionExecutorOptions = options
    return createEditorRuntimeActionExecutor(executorOptions)
  }, [options])
}