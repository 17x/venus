// useEditorInstance.ts
import {Dispatch, RefObject, useEffect, useRef} from 'react'
import {Editor} from '@lite-u/editor'
import {PointRef} from '../components/statusBar/StatusBar.tsx'
import {VisionFileType} from './useEditorRuntime.ts'
import {WorkSpaceStateType, WorkspaceAction} from '../contexts/workspaceContext/reducer/reducer.ts'

function useEditor(ref: RefObject<HTMLDivElement | null>, worldPointRef: RefObject<PointRef | null>, file: VisionFileType | null, state: WorkSpaceStateType, dispatch: Dispatch<WorkspaceAction>, showContextMenu: (p: {
  x: number,
  y: number
}) => void, onEditorReady?: (editor: Editor | null) => void) {
  const dpr = window.devicePixelRatio || 2
  const lastSavedHistoryId = useRef(0)
  const currentHistoryId = useRef(0)
  const needSaveLocal = useRef(false)
  const editorRef = useRef<Editor | null>(null)

  useEffect(() => {
    if (!ref.current || !file) return
    const container = ref.current
    const editor = new Editor({
      container,
      elements: file.elements,
      assets: file.assets || [],
      config: {
        dpr,
        page: file.config.page,
      },
      events: {
        onInitialized: () => {
          editor.execute('switch-tool', state.currentTool)
        },
        onZoomed: (scale) => {
          dispatch({type: 'SET_WORLD_SCALE', payload: scale})
        },
        onHistoryUpdated: (historyTree) => {
          if (!historyTree) {
            dispatch({type: 'SET_HISTORY_ARRAY', payload: []})
            return
          }

          dispatch({
            type: 'SET_HISTORY_ARRAY',
            payload: historyTree.toArray().map((node) => ({
              id: node.id,
              prev: node.prev ? {id: node.prev.id, prev: null, next: null, data: {type: node.prev.data?.type || ''}} : null,
              next: node.next ? {id: node.next.id, prev: null, next: null, data: {type: node.next.data?.type || ''}} : null,
              data: {type: node.data?.type || ''},
            })),
          })

          if (historyTree.current) {
            const newHistoryStatus = {
              id: historyTree.current.id,
              hasPrev: !!historyTree.current.prev,
              hasNext: !!historyTree.current.next,
            }
            const newNeedSaveValue = newHistoryStatus.id !== lastSavedHistoryId.current

            currentHistoryId.current = newHistoryStatus.id
            dispatch({type: 'SET_HISTORY_STATUS', payload: newHistoryStatus})
            dispatch({type: 'SET_NEED_SAVE', payload: newNeedSaveValue})
            needSaveLocal.current = newNeedSaveValue
          }
        },
        onElementsUpdated: (elementMap) => {
          const arr = Array.from(elementMap.values()).sort((a, b) => a.layer - b.layer).map((item) => ({
            id: item.id,
            name: item.type,
            show: item.show,
          }))
          dispatch({
            type: 'SET_ELEMENTS',
            payload: arr,
          })
        },
        onSelectionUpdated: (selected, props) => {
          dispatch({type: 'SET_SELECTED_ELEMENTS', payload: Array.from(selected)})
          dispatch({type: 'SET_SELECTED_PROPS', payload: props})
        },
        /*        onViewportUpdated: (viewportInfo) => {
                  dispatch({type: 'SET_VIEWPORT', payload: viewportInfo})
                },*/
        onWorldMouseMove: (point) => {
          // dispatch({type: 'SET_WORLD_POINT', payload: point})
          // worldPoint.current = point
          if (worldPointRef.current) {
            worldPointRef.current.set(point)
          }
        },
        onContextMenu: (position) => {
          showContextMenu(position)
          // dispatch({type: 'SET_SHOW_CONTEXT_MENU', payload: viewportInfo})

        },
        onElementCopied: (items) => {
          dispatch({type: 'SET_COPIED_ITEMS', payload: items})
        },
        onSwitchTool: (toolName) => {
          dispatch({type: 'SET_CURRENT_TOOL', payload: toolName as WorkSpaceStateType['currentTool']})
        },
      },
    })

    editorRef.current = editor
    onEditorReady?.(editor)
    return () => {
      onEditorReady?.(null)
      editor.destroy()
    }
  }, [ref, file, onEditorReady])

  return editorRef
}

export default useEditor
