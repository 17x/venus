import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import TemplatePresetPicker from '../createFile/TemplatePresetPicker.tsx'
import Toolbelt from '../toolbelt/Toolbelt.tsx'
import {ContextMenu} from '../contextMenu/ContextMenu.tsx'
import {Print} from '../print/print.tsx'
import FileReceiver from '../fileReceiver.tsx'
import {Button, Col, useTheme} from '@vector/ui'
import useEditorRuntime from '../../editor/hooks/useEditorRuntime.ts'
import {applyMatrixToPoint} from '@vector/runtime'
import {EngineViewport} from '../../editor/runtime/engineAdapter.tsx'
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
import {ASSET_LIBRARY_CARDS} from '../shell/LeftSidebarShared.tsx'
import {EditorFrameSidePanels} from './EditorFrameSidePanels.tsx'
import {useEditorFrameShell} from './useEditorFrameShell.ts'

const FIXED_LEFT_PANEL_WIDTH = 296
const FIXED_RIGHT_PANEL_WIDTH = 240
const MemoToolbelt = memo(Toolbelt)

const MemoEngineViewport = memo(EngineViewport)

interface StageCanvasLayerProps {
  canvas: ReturnType<typeof useEditorRuntime>['runtimeState']['canvas']
  contextRootRef: ReturnType<typeof useEditorRuntime>['refs']['contextRootRef']
  focused: boolean
  executeAction: ReturnType<typeof useEditorRuntime>['commands']['executeAction']
  stageHostRef: React.RefObject<HTMLDivElement | null>
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void
  currentTool: ReturnType<typeof useEditorRuntime>['runtimeState']['currentTool']
  onSelectTool: ReturnType<typeof useEditorFrameShell>['onSelectTool']
  isolationTrail?: string[]
}

const StageCanvasLayer = memo(function StageCanvasLayer(props: StageCanvasLayerProps) {
  return (
    <Col fw fh stretch ref={props.contextRootRef} data-focused={props.focused} autoFocus={true}
      tabIndex={0}
      className={'outline-0 bg-white dark:bg-slate-900'}>
      <FileReceiver executeAction={props.executeAction} resolveDropPosition={(clientX, clientY) => {
        const rect = props.stageHostRef.current?.getBoundingClientRect()
        if (!rect) {
          return {x: clientX, y: clientY}
        }
        return {
          x: clientX - rect.left,
          y: clientY - rect.top,
        }
      }}>
        <Col
          fw
          fh
          ovh
          rela
          flex={1}
        >
          <div
            ref={props.stageHostRef}
            className={'relative flex h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-950'}
            onContextMenu={props.onContextMenu}
          >
            {props.canvas.isolationGroupId && (
              <div className={'pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90'}>
                <div className={'flex min-w-0 flex-col'}>
                  <span className={'text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400'}>
                    Isolation
                  </span>
                  <span className={'max-w-[300px] truncate text-sm font-medium text-slate-900 dark:text-slate-100'}>
                    {(props.isolationTrail && props.isolationTrail.length > 0 ? props.isolationTrail : ['Unnamed group']).join(' / ')}
                  </span>
                </div>
                <Button
                  size={'sm'}
                  variant={'outline'}
                  noTooltip={true}
                  className={'pointer-events-auto shrink-0'}
                  onClick={() => {
                    props.executeAction('group-exit-isolation')
                  }}
                >
                  Exit isolation
                </Button>
              </div>
            )}

            <MemoEngineViewport
              document={props.canvas.document}
              renderer={props.canvas.Renderer}
              overlayRenderer={props.canvas.OverlayRenderer}
              cursor={props.canvas.cursor}
              shapes={props.canvas.shapes}
              stats={props.canvas.stats}
              viewport={props.canvas.viewport}
              editingMode={props.canvas.editingMode}
              protectedNodeIds={props.canvas.protectedNodeIds}
              overlayDiagnostics={props.canvas.overlayDiagnostics}
              onPointerMove={props.canvas.onPointerMove}
              onPointerDown={props.canvas.onPointerDown}
              onPointerUp={props.canvas.onPointerUp}
              onPointerLeave={props.canvas.onPointerLeave}
              onViewportChange={props.canvas.onViewportChange}
              onViewportPan={props.canvas.onViewportPan}
              onViewportResize={props.canvas.onViewportResize}
              onViewportZoom={props.canvas.onViewportZoom}
            />

            <MemoToolbelt
              currentTool={props.currentTool}
              onSelectTool={props.onSelectTool}
            />
          </div>
        </Col>
      </FileReceiver>
    </Col>
  )
})

function EditorFrameRuntime() {
  const initialLayoutState = useMemo(() => deserializeShellLayoutState(
    typeof window === 'undefined' ? null : serializeShellLayoutState(readStoredShellLayoutState(window.localStorage)),
  ), [])
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
  const isolationTrail = useMemo(() => {
    if (!canvas.isolationGroupId) {
      return [] as string[]
    }

    const shapeById = new Map(documentState.document.shapes.map((shape) => [shape.id, shape]))
    const trail: string[] = []
    let current = shapeById.get(canvas.isolationGroupId) ?? null

    while (current) {
      trail.unshift(current.name || current.text || 'Unnamed group')
      if (!current.parentId) {
        break
      }
      current = shapeById.get(current.parentId) ?? null
    }

    return trail
  }, [canvas.isolationGroupId, documentState.document.shapes])
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

  const resolveWorldPoint = useCallback((viewportPoint: {x: number; y: number}) => {
    return applyMatrixToPoint(canvas.viewport.inverseMatrix, viewportPoint)
  }, [canvas.viewport.inverseMatrix])

  const onRestoreLeftPanel = useCallback(() => {
    setLeftPanelMinimized((current: boolean) => !current)
  }, [])

  const onRestoreRightPanel = useCallback(() => {
    setRightPanelMinimized((current: boolean) => !current)
  }, [])

  const handleStageContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setShowContextMenu(true)
    const viewportRect = stageHostRef.current?.getBoundingClientRect()
    const viewportPoint = viewportRect
      ? {x: event.clientX - viewportRect.left, y: event.clientY - viewportRect.top}
      : {x: event.clientX, y: event.clientY}
    const worldPoint = resolveWorldPoint(viewportPoint)
    setContextMenuPosition(viewportPoint)
    setContextMenuPastePosition(worldPoint)
    canvas.onContextMenu({
      x: viewportPoint.x,
      y: viewportPoint.y,
    })
  }, [canvas, resolveWorldPoint])

  const shell = useEditorFrameShell({
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
    layerItems,
    selectedProps,
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
    onApplyAssetTemplate: (assetId) => {
      const presetId = ASSET_LIBRARY_CARDS.find((asset) => asset.id === assetId)?.presetId ?? 'demo-basic-shapes'
      const generatedFile = generateTemplateFile(presetId, {
        seed: Date.now(),
      })
      createFile(generatedFile)
    },
  })

  return <>
    <div className={'flex-1 overflow-hidden min-h-[600px] relative'}>
      {file && <>
        <div className={'relative flex h-full w-full'}>
          <StageCanvasLayer
            canvas={canvas}
            contextRootRef={contextRootRef}
            focused={focused}
            executeAction={executeAction}
            stageHostRef={stageHostRef}
            onContextMenu={handleStageContextMenu}
            currentTool={currentTool}
            onSelectTool={shell.onSelectTool}
            isolationTrail={isolationTrail}
          />

          <EditorFrameSidePanels
            fileName={file?.name}
            leftPanelMinimized={leftPanelMinimized}
            rightPanelMinimized={rightPanelMinimized}
            showGrid={variantBSections.showGrid}
            onRestoreLeftPanel={onRestoreLeftPanel}
            onRestoreRightPanel={onRestoreRightPanel}
            leftSidebarProps={shell.leftSidebarProps}
            rightSidebarProps={shell.rightSidebarProps}
          />

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
        </div>
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

  </>
}

const EditorFrame = () => {
  const {resolvedMode} = useTheme()

  return <div data-vector-ui-root={'true'} data-theme={resolvedMode} className={'flex h-full w-full flex-col select-none bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100'}>
    <EditorFrameRuntime/>
  </div>
}

export default EditorFrame
