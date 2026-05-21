import {useMemo} from 'react'
import type {ElementProps} from '../../runtime/types/index.ts'
import type {ToolName} from '../../runtime/model/index.ts'
import type {EditorFileAsset} from '../../runtime/types/index.ts'
import {
  createEditorRuntimeActionExecutor,
  type EditorRuntimeActionExecutorOptions,
} from '../runtime/createEditorRuntimeActionExecutor.ts'

/**
 * Defines dependencies consumed by useEditorRuntime action-executor adapter.
 */
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
  /** Stores active path sub-selection consumed by path-anchor actions. */
  pathSubSelection: import('../../runtime/interaction/index.ts').PathSubSelection | null
  /** Stores preview document snapshot used for path-anchor mutation commits. */
  previewDocument: import('../../runtime/model/index.ts').EditorDocument
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