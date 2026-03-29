import {useContext, useEffect, useMemo, useRef} from 'react'
import {EditorExecutor} from '../components/workspace/Workspace.tsx'
import SHORTCUTS_DATA, {ActionItemType} from '../constants/actions.ts'
import Shortcut from '../lib/shortcut/shortcut.ts'
import matchObject from '../utilities/find.ts'
import deepClone from '../utilities/deepClone.ts'
import WorkspaceContext from '../contexts/workspaceContext/WorkspaceContext.tsx'

const useShortcut = (executeAction: EditorExecutor, handleZoom: (b: boolean, e?: MouseEvent) => void) => {
  const {state: {currentTool, focused}, dispatch} = useContext(WorkspaceContext)
  const lastToolRef = useRef<string>(null)
  const data = useMemo(() => {
    let arr = matchObject(deepClone(SHORTCUTS_DATA), (item) => !!item.shortcut) as ActionItemType[]

    arr.push({id: 'toggleTool', shortcut: 'space'})
    return arr
  }, [])

  useEffect(() => {
    const shortcut1 = new Shortcut({
      shortcuts: data,
      callback: (id: string) => {
        if (!focused) return

        if (id === 'toggleTool' && lastToolRef.current !== currentTool) {
          console.log('currentTool',currentTool)
          if (currentTool !== 'panning') {
            lastToolRef.current = currentTool
          }
          executeAction('switch-tool', 'panning')
          return
        }

        const c = data.find(item => item.id === id)!

        if (c.id === 'zoomIn' || c.id === 'zoomOut') {
          handleZoom(c.id === 'zoomIn')
          return
        } else if (c.id === 'zoomFit') {
          executeAction('world-zoom', 'fit')
          return
        }

        if (c.editorAction) {
          executeAction(c.editorAction, c.editorActionData)
          // console.log(c.editorAction)
          if (c.editorAction === 'switch-tool') {
            dispatch({type: 'SET_CURRENT_TOOL', payload: c.editorActionData})
          }
        }

      },
    })

    const shortcut2 = new Shortcut({
      shortcuts: [{id: 'toggleTool', shortcut: 'space'}],
      upMode: true,
      callback: () => {
        if (lastToolRef.current) {
          executeAction('switch-tool', lastToolRef.current)
        }

        lastToolRef.current = null
      },
    })

    return () => {
      shortcut1.destroy()
      shortcut2.destroy()
      // pluginRef.current?.destroy()
      // pluginRef.current = null
    }
  }, [focused])
}

export default useShortcut