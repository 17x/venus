import {useEffect, useMemo, useRef} from 'react'
import {ToolName} from './model/index.ts'
import createShortcut from './shortcut.ts'
import {EditorExecutor} from './useEditorRuntime/useEditorRuntime.ts'
import {
  buildShortcutActions,
  resolveSwitchToolName,
} from './product/shortcutHelpers.ts'

/**
 * Adapts keyboard shortcut events into runtime executeAction/tool-switch commands.
 */
const useShortcut = (executeAction: EditorExecutor, handleZoom: (b: boolean, e?: MouseEvent) => void, options: {
  currentTool: ToolName
  focused: boolean
  setCurrentTool: (toolName: ToolName) => void
}) => {
  const {currentTool, focused, setCurrentTool} = options
  const lastToolRef = useRef<string>(null)
  const data = useMemo(() => {
    return buildShortcutActions()
  }, [])

  useEffect(() => {
    const shortcut1 = createShortcut({
      shortcuts: data,
      shouldHandleEvent: () => focused,
      callback: (id: string) => {
        if (!focused) return

        if (id === 'toggleTool' && lastToolRef.current !== currentTool) {
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
          if (c.editorAction === 'switch-tool') {
            setCurrentTool(resolveSwitchToolName(c.editorActionData))
          }
        }

      },
    })

    const shortcut2 = createShortcut({
      shortcuts: [{id: 'toggleTool', shortcut: 'space'}],
      upMode: true,
      shouldHandleEvent: () => focused,
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
  }, [currentTool, data, executeAction, focused, handleZoom, setCurrentTool])

  useEffect(() => {
    if (focused) {
      return
    }

    // Prevent temporary space-to-pan state from getting stuck when focus moves
    // out of the editor before keyup is captured.
    if (lastToolRef.current) {
      executeAction('switch-tool', lastToolRef.current)
      lastToolRef.current = null
    }
  }, [executeAction, focused])
}

export default useShortcut
