import {useEffect, useRef, useState} from 'react'
import TemplatePresetPicker from '../createFile/TemplatePresetPicker.tsx'
import Toolbelt from '../toolbelt/Toolbelt.tsx'
import {ContextMenu} from '../contextMenu/ContextMenu.tsx'
import {Print} from '../print/print.tsx'
import FileReceiver from '../fileReceiver.tsx'
import {Col, useTheme} from '@vector/ui'
import useEditorRuntime from '../../editor/hooks/useEditorRuntime.ts'
import {applyMatrixToPoint} from '@vector/runtime'
import {CanvasViewport} from '../../editor/runtime/canvasAdapter.tsx'
import {generateTemplateFile} from '../../features/templatePresets/generators.ts'
import type {InspectorContext, InspectorPanelId} from '../../editor/shell/state/inspectorState.ts'
import {
  deserializeShellLayoutState,
  LEGACY_SHELL_LAYOUT_STATE_STORAGE_KEY,
  readStoredShellLayoutState,
  serializeShellLayoutState,
  SHELL_LAYOUT_STATE_STORAGE_KEY,
} from '../../editor/shell/state/shellState.ts'
import {
  LEGACY_TOOLBELT_MODE_STORAGE_KEY,
  readStoredToolbeltMode,
  TOOLBELT_MODE_STORAGE_KEY,
  type ToolbeltMode,
} from '../../editor/shell/state/toolbeltState.ts'
import {EditorFrameSidePanels} from './EditorFrameSidePanels.tsx'
import {useEditorFrameShell} from './useEditorFrameShell.ts'

const FIXED_LEFT_PANEL_WIDTH = 296
const FIXED_RIGHT_PANEL_WIDTH = 240

const EditorFrame = () => {
  const {resolvedMode, mode, setMode} = useTheme()
  const initialLayoutState = deserializeShellLayoutState(
    typeof window === 'undefined' ? null : serializeShellLayoutState(readStoredShellLayoutState(window.localStorage)),
  )
  const [showTemplatePresetPicker, setShowTemplatePresetPicker] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0})
  const [contextMenuPastePosition, setContextMenuPastePosition] = useState({x: 0, y: 0})
  const [leftPanelMinimized, setLeftPanelMinimized] = useState(initialLayoutState.leftPanelMinimized)
  const [rightPanelMinimized, setRightPanelMinimized] = useState(initialLayoutState.rightPanelMinimized)
  const [toolbeltMode, setToolbeltMode] = useState<ToolbeltMode>(() => {
    if (typeof window === 'undefined') {
      return initialLayoutState.toolbeltMode
    }

    return readStoredToolbeltMode(window.localStorage)
  })
  // Keep minimized panel order deterministic for restoration and serialization.
  const [minimizedInspectorPanels, setMinimizedInspectorPanels] = useState<Set<InspectorPanelId>>(
    () => new Set(initialLayoutState.minimizedInspectorPanels),
  )
  const [inspectorContext, setInspectorContext] = useState<InspectorContext>(initialLayoutState.activeInspectorContext)
  const [variantBSections, setVariantBSections] = useState(initialLayoutState.variantBSections)
  const isDebugTabActive = variantBSections.activeTab === 'debug'
  const renderCountRef = useRef(0)
  renderCountRef.current += 1
  const [fps, setFps] = useState(0)
  const [debugRuntimeStats, setDebugRuntimeStats] = useState({
    sceneUpdates: 0,
    sceneStableFrames: 0,
    lastSceneVersion: -1,
  })
  const stageHostRef = useRef<HTMLDivElement>(null)
  const runtime = useEditorRuntime()

  const {
    documentState,
    runtimeState,
    uiState,
    commands,
    refs,
  } = runtime
  const {file} = documentState
  const {canvas, currentTool, focused} = runtimeState
  const {
    copiedItems,
    hasUnsavedChanges,
    historyItems,
    historyStatus,
    layerItems,
    selectedIds,
    selectedProps,
    snappingEnabled,
    showPrint,
    viewportScale,
  } = uiState
  const {
    setShowPrint,
    executeAction,
    createFile,
    setCurrentTool,
    setSnappingEnabled,
    pickHistory,
  } = commands
  const {contextRootRef, editorRef} = refs

  useEffect(() => {
    if (selectedProps) {
      setInspectorContext('selection')
    }
  }, [selectedProps])

  useEffect(() => {
    if (!isDebugTabActive) {
      return
    }

    setDebugRuntimeStats((current) => {
      const stable = current.lastSceneVersion === canvas.stats.version
      return {
        sceneUpdates: current.sceneUpdates + 1,
        sceneStableFrames: current.sceneStableFrames + (stable ? 1 : 0),
        lastSceneVersion: canvas.stats.version,
      }
    })
  }, [canvas.stats.version, isDebugTabActive])

  useEffect(() => {
    if (!isDebugTabActive) {
      return
    }

    let frameCount = 0
    let rafId = 0
    let sampleStart = performance.now()

    const tick = (time: number) => {
      frameCount += 1
      const elapsed = time - sampleStart
      if (elapsed >= 500) {
        setFps((frameCount * 1000) / elapsed)
        frameCount = 0
        sampleStart = time
      }
      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [isDebugTabActive])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextShellState = {
      leftPanelWidth: FIXED_LEFT_PANEL_WIDTH,
      rightPanelWidth: FIXED_RIGHT_PANEL_WIDTH,
      leftPanelMinimized,
      rightPanelMinimized,
      minimizedInspectorPanels: Array.from(minimizedInspectorPanels),
      activeInspectorContext: inspectorContext,
      toolbeltMode,
      variantBSections,
    }

    window.localStorage.setItem(SHELL_LAYOUT_STATE_STORAGE_KEY, serializeShellLayoutState(nextShellState))
    window.localStorage.setItem(TOOLBELT_MODE_STORAGE_KEY, toolbeltMode)
    window.localStorage.removeItem(LEGACY_SHELL_LAYOUT_STATE_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_TOOLBELT_MODE_STORAGE_KEY)
  }, [
    leftPanelMinimized,
    rightPanelMinimized,
    inspectorContext,
    minimizedInspectorPanels,
    toolbeltMode,
    variantBSections,
  ])

  const resolveViewportPoint = (clientX: number, clientY: number) => {
    const rect = stageHostRef.current?.getBoundingClientRect()
    if (!rect) {
      return {x: clientX, y: clientY}
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const resolveWorldPoint = (viewportPoint: {x: number; y: number}) => {
    return applyMatrixToPoint(canvas.viewport.inverseMatrix, viewportPoint)
  }

  const shell = useEditorFrameShell({
    mode,
    setMode,
    selectedIds,
    copiedCount: copiedItems.length,
    hasUnsavedChanges,
    historyItems,
    historyStatus,
    showGrid: variantBSections.showGrid,
    snappingEnabled,
    activeTab: variantBSections.activeTab,
    layersCollapsed: variantBSections.layersCollapsed,
    fileAssetCount: file?.assets?.length ?? 0,
    fileName: file?.name,
    layerItems,
    selectedProps,
    viewportScale,
    debugStats: {
      editorRenderCount: renderCountRef.current,
      sceneUpdateCount: debugRuntimeStats.sceneUpdates,
      fps,
      sceneVersion: canvas.stats.version,
      shapeCount: canvas.stats.shapeCount,
      selectedCount: selectedIds.length,
      viewportScale,
      cacheHitEstimate: debugRuntimeStats.sceneStableFrames,
      cacheMissEstimate: Math.max(0, debugRuntimeStats.sceneUpdates - debugRuntimeStats.sceneStableFrames),
      cacheHitRate: debugRuntimeStats.sceneUpdates > 0
        ? (debugRuntimeStats.sceneStableFrames / debugRuntimeStats.sceneUpdates) * 100
        : 0,
    },
    inspectorContext,
    executeAction,
    pickHistory,
    setSnappingEnabled,
    setCurrentTool,
    setToolbeltMode,
    setInspectorContext,
    setMinimizedInspectorPanels,
    setVariantBSections,
    setShowTemplatePresetPicker,
  })
console.log('render EditorFrame');
  return <div data-vector-ui-root={'true'} data-theme={resolvedMode} className={'flex h-full w-full flex-col select-none bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100'}>
    <div className={'flex-1 overflow-hidden min-h-[600px] relative'}>
      {file && <>
           <Col fw fh stretch ref={contextRootRef} data-focused={focused} autoFocus={true}
             tabIndex={0}
             className={'outline-0 bg-white dark:bg-slate-900'}>
          <FileReceiver executeAction={executeAction}
                        resolveDropPosition={resolveViewportPoint}>
            <Col
              fw
              fh
              ovh
              rela
              flex={1}
            >
              <div
                ref={stageHostRef}
                className={'relative flex h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-950'}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setShowContextMenu(true)
                  const viewportPoint = resolveViewportPoint(event.clientX, event.clientY)
                  const worldPoint = resolveWorldPoint(viewportPoint)
                  setContextMenuPosition(viewportPoint)
                  setContextMenuPastePosition(worldPoint)
                  canvas.onContextMenu({
                    x: viewportPoint.x,
                    y: viewportPoint.y,
                  })
                }}
              >
                <CanvasViewport
                  document={canvas.document}
                  renderer={canvas.Renderer}
                  overlayRenderer={canvas.OverlayRenderer}
                  shapes={canvas.shapes}
                  stats={canvas.stats}
                  viewport={canvas.viewport}
                  onPointerMove={canvas.onPointerMove}
                  onPointerDown={canvas.onPointerDown}
                  onPointerUp={canvas.onPointerUp}
                  onPointerLeave={canvas.onPointerLeave}
                  onViewportChange={canvas.onViewportChange}
                  onViewportPan={canvas.onViewportPan}
                  onViewportResize={canvas.onViewportResize}
                  onViewportZoom={canvas.onViewportZoom}
                />

                <Toolbelt
                  currentTool={currentTool}
                  onSelectTool={shell.onSelectTool}
                />

                <EditorFrameSidePanels
                  fileName={file?.name}
                  leftPanelMinimized={leftPanelMinimized}
                  rightPanelMinimized={rightPanelMinimized}
                  showGrid={variantBSections.showGrid}
                  viewportScale={viewportScale}
                  onRestoreLeftPanel={() => {
                    setLeftPanelMinimized((current) => !current)
                  }}
                  onRestoreRightPanel={() => {
                    setRightPanelMinimized((current) => !current)
                  }}
                  leftSidebarProps={shell.leftSidebarProps}
                  rightSidebarProps={shell.rightSidebarProps}
                />
              </div>

              {showContextMenu &&
                <ContextMenu position={contextMenuPosition}
                             pastePosition={contextMenuPastePosition}
                             executeAction={executeAction}
                             selectedIds={selectedIds}
                             copiedItems={copiedItems}
                             historyStatus={historyStatus}
                             onClose={() => {
                               setShowContextMenu(false)
                             }}/>}
            </Col>
          </FileReceiver>
        </Col>
      </>}
    </div>

    {showPrint && <Print editorRef={editorRef} onClose={() => {
      setShowPrint(false)
    }}/>}

    {showTemplatePresetPicker &&
      <TemplatePresetPicker
        bg={'#00000080'}
        onClose={() => {
          setShowTemplatePresetPicker(false)
        }}
        onGenerate={(presetId, seed) => {
          const generatedFile = generateTemplateFile(presetId, {seed})
          createFile(generatedFile)
          setShowTemplatePresetPicker(false)
        }}
      />}

  </div>
}

export default EditorFrame
