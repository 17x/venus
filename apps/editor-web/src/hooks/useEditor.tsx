// useEditorInstance.ts
import {RefObject, useContext, useEffect, useRef, useState} from 'react'
import {useUI} from '../contexts/UIContext/UIContext.tsx'
import WorkspaceContext from '../contexts/workspaceContext/WorkspaceContext.tsx'
import {Editor} from '@lite-u/editor'
import {ElementInstance, ElementProps} from '@lite-u/editor/types'
import {PointRef} from '../components/statusBar/StatusBar.tsx'

// import FileContext from '../contexts/fileContext/FileContext.tsx'

function useEditor(ref: RefObject<HTMLDivElement | null>, worldPointRef: RefObject<PointRef | null>, workspace, page, showContextMenu: (p: {
  x: number,
  y: number
}) => void) {
  const {dpr} = useUI()
  const [sortedElements, setSortedElements] = useState<ElementInstance[]>([])
  const {state, dispatch} = useContext(WorkspaceContext)
  const lastSavedHistoryId = useRef(0)
  const currentHistoryId = useRef(0)
  const needSaveLocal = useRef(false)
  const editorRef = useRef<Editor | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    const editor = new Editor({
      container,
      elements: workspace.elements,
      assets: workspace.assets,
      config: {
        dpr,
        page,
      },
      events: {
        onInitialized: () => {
          editor.execute('switch-tool', state.currentTool)
        },
        onZoomed: (scale) => {
          dispatch({type: 'SET_WORLD_SCALE', payload: scale})
        },
        onHistoryUpdated: (historyTree) => {
          dispatch({type: 'SET_HISTORY_ARRAY', payload: historyTree!.toArray()})

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
          // setSortedElements(arr)

          // console.log(arr)
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
          dispatch({type: 'SET_CURRENT_TOOL', payload: toolName})
        },
      },
    })

    editorRef.current = editor
    console.log(editorRef.current)
    return () => editor.destroy()
  }, [ref, workspace])

  return editorRef
}

export default useEditor