import {useEffect, useRef, useState} from 'react'
import CreateFile from '../createFile/CreateFile.tsx'
import TemplatePresetPicker from '../createFile/TemplatePresetPicker.tsx'
import Toolbelt from '../toolbelt/Toolbelt.tsx'
import {ContextMenu} from '../contextMenu/ContextMenu.tsx'
import LeftSidebar from '../shell/LeftSidebar.tsx'
import RightSidebar from '../shell/RightSidebar.tsx'
import {Print} from '../print/print.tsx'
import FileReceiver from '../fileReceiver.tsx'
import {
  Button,
  Col,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  useTheme,
} from '@vector/ui'
import useEditorRuntime from '../../editor/hooks/useEditorRuntime.ts'
import {applyMatrixToPoint} from '@vector/runtime'
import {CanvasViewport} from '../../editor/runtime/canvasAdapter.tsx'
import {EDITOR_ROOT_CLASS} from '../editorChrome/editorTypography.ts'
import {generateTemplateFile} from '../../features/templatePresets/generators.ts'
import {createShellCommandDispatch} from '../../editor/shell/commands/shellCommandDispatch.ts'
import type {InspectorContext, InspectorPanelId} from '../../editor/shell/state/inspectorState.ts'
import {createHeaderMenuData} from '../header/menu/menuData.ts'
import type {MenuItemType} from '../header/menu/type'
import {
  deserializeShellLayoutState,
  serializeShellLayoutState,
  SHELL_LAYOUT_STATE_STORAGE_KEY,
} from '../../editor/shell/state/shellState.ts'
import {
  resolveToolbeltModeFromStorage,
  TOOLBELT_MODE_STORAGE_KEY,
  type ToolbeltMode,
} from '../../editor/shell/state/toolbeltState.ts'
import {LuMenu, LuPanelLeftOpen, LuPanelRightClose} from 'react-icons/lu'
import {useTranslation} from 'react-i18next'

const FIXED_LEFT_PANEL_WIDTH = 296
const FIXED_RIGHT_PANEL_WIDTH = 240

const EditorFrame = () => {
  const {t, i18n} = useTranslation()
  const {resolvedMode, mode, setMode} = useTheme()
  const initialLayoutState = deserializeShellLayoutState(
    typeof window === 'undefined' ? null : window.localStorage.getItem(SHELL_LAYOUT_STATE_STORAGE_KEY),
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

    return resolveToolbeltModeFromStorage(window.localStorage.getItem(TOOLBELT_MODE_STORAGE_KEY))
  })
  // Keep minimized panel order deterministic for restoration and serialization.
  const [minimizedInspectorPanels, setMinimizedInspectorPanels] = useState<Set<InspectorPanelId>>(
    () => new Set(initialLayoutState.minimizedInspectorPanels),
  )
  const [inspectorContext, setInspectorContext] = useState<InspectorContext>(initialLayoutState.activeInspectorContext)
  const [variantBSections, setVariantBSections] = useState(initialLayoutState.variantBSections)
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
  const {file, hasFile} = documentState
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
    showCreateFile,
    showPrint,
    viewportScale,
  } = uiState
  const {
    setShowPrint,
    executeAction,
    createFile,
    handleCreating,
    setCurrentTool,
    setSnappingEnabled,
    pickHistory,
  } = commands
  const {contextRootRef, editorRef} = refs

  const topMenuActions = createHeaderMenuData({
    selectedIds,
    copiedCount: copiedItems.length,
    needSave: hasUnsavedChanges,
    historyStatus,
    language: i18n.language === 'zh-CN' ? 'cn' : (i18n.language as 'en' | 'cn' | 'jp'),
    gridEnabled: variantBSections.showGrid,
    snappingEnabled,
    canToggleGrid: true,
    canToggleSnapping: true,
    themeMode: mode,
  })

  const handleTopMenuAction = (menuItem: MenuItemType) => {
    switch (menuItem.id) {
      case 'languageEnglish':
        i18n.changeLanguage('en')
        return true
      case 'languageChinese':
        i18n.changeLanguage('zh-CN')
        return true
      case 'languageJapanese':
        i18n.changeLanguage('jp')
        return true
      case 'toggleGridOn':
      case 'toggleGridOff':
        dispatchShellCommand('shell.setGrid', {enabled: !variantBSections.showGrid}, {
          sourcePanel: 'left-sidebar',
          sourceControl: 'settings-grid-toggle',
          commitType: 'final',
        })
        return true
      case 'toggleSnappingOn':
      case 'toggleSnappingOff':
        dispatchShellCommand('shell.setSnapping', {enabled: !snappingEnabled}, {
          sourcePanel: 'left-sidebar',
          sourceControl: 'settings-snapping-toggle',
          commitType: 'final',
        })
        return true
      case 'themeSystem':
        setMode('system')
        return true
      case 'themeLight':
        setMode('light')
        return true
      case 'themeDark':
        setMode('dark')
        return true
      default:
        return false
    }
  }

  const executeTopMenuAction = (menuItem: MenuItemType) => {
    if (menuItem.disabled) {
      return
    }

    if (handleTopMenuAction(menuItem)) {
      return
    }

    const action = menuItem.editorActionCode ?? menuItem.action ?? menuItem.id
    if (menuItem.editorActionData) {
      executeAction(action, menuItem.editorActionData)
      return
    }

    executeAction(action)
  }

  const renderTopMenuNodes = (menuItems: MenuItemType[]) => {
    return menuItems.map((menuItem) => {
      const hasChildren = !!menuItem.children?.length
      const label = t(menuItem.id + '.label')

      return (
        <>
          {menuItem.divide && <DropdownMenuSeparator/>}
          {hasChildren
            ? <DropdownMenuSub key={`sub-${menuItem.id}`}>
                <DropdownMenuSubTrigger disabled={menuItem.disabled} className={'venus-ui-menu-item'}>
                  {label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={'min-w-40'}>
                  {renderTopMenuNodes(menuItem.children ?? [])}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            : <DropdownMenuItem
                key={`item-${menuItem.id}`}
                disabled={menuItem.disabled}
                onClick={() => {
                  executeTopMenuAction(menuItem)
                }}
                className={'venus-ui-menu-item'}
              >
                {label}
              </DropdownMenuItem>}
        </>
      )
    })
  }

  useEffect(() => {
    if (selectedProps) {
      setInspectorContext('selection')
    }
  }, [selectedProps])

  useEffect(() => {
    setDebugRuntimeStats((current) => {
      const stable = current.lastSceneVersion === canvas.stats.version
      return {
        sceneUpdates: current.sceneUpdates + 1,
        sceneStableFrames: current.sceneStableFrames + (stable ? 1 : 0),
        lastSceneVersion: canvas.stats.version,
      }
    })
  }, [canvas.stats.version])

  useEffect(() => {
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
  }, [])

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

  const dispatchShellCommand = createShellCommandDispatch({
    onSetZoom(payload) {
      executeAction('world-zoom', {
        zoomTo: true,
        zoomFactor: Math.max(0.1, payload.zoomPercent / 100),
      })
    },
    onSetLeftTab(payload) {
      setVariantBSections((current) => ({
        ...current,
        activeTab: payload.tab,
      }))
    },
    onSetGrid(payload) {
      setVariantBSections((current) => ({
        ...current,
        showGrid: payload.enabled,
      }))
    },
    onSetSnapping(payload) {
      setSnappingEnabled(payload.enabled)
    },
    onSelectTool(payload) {
      setCurrentTool(payload.tool)
    },
    onSetMode(payload) {
      setToolbeltMode(payload.mode)
      if (payload.mode === 'handoff') {
        setInspectorContext('page')
      }
    },
    onToggleInspectorPanel(payload) {
      setMinimizedInspectorPanels((current) => {
        const next = new Set(current)
        if (next.has(payload.panelId)) {
          next.delete(payload.panelId)
        } else {
          next.add(payload.panelId)
        }
        return next
      })
    },
    onSetInspectorContext(payload) {
      setInspectorContext(payload.context)
    },
    onLayerReorder(payload) {
      executeAction('element-layer', payload.direction)
    },
    onHistoryPick(payload) {
      const targetHistory = historyItems.find((item) => item.id === payload.historyId)
      if (!targetHistory) {
        return
      }

      pickHistory(targetHistory)
    },
    onSelectionModify(payload) {
      executeAction('selection-modify', {
        mode: payload.mode,
        idSet: new Set(payload.ids),
      })
    },
    onElementModify(payload) {
      executeAction('element-modify', [{
        id: payload.elementId,
        props: payload.patch,
      }])
    },
  })

  return <div data-theme={resolvedMode} className={`w-full h-full flex flex-col select-none venus-shell-root ${EDITOR_ROOT_CLASS}`}>
    <div className={'flex-1 overflow-hidden min-h-[600px] relative'}>
      {file && <>
        <Col fw fh stretch ref={contextRootRef} data-focused={focused} autoFocus={true}
             tabIndex={0}
             className={'outline-0 venus-shell-canvas-frame'}>
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
                className={'relative overflow-hidden flex w-full h-full venus-shell-canvas-stage'}
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
                  onSelectTool={(tool, meta) => {
                    dispatchShellCommand('tool.select', {tool}, meta)
                  }}
                />

                <div className={'pointer-events-none absolute left-3 top-3 bottom-3 z-20 flex'}>
                  {leftPanelMinimized
                    ? <aside
                        className={'venus-shell-panel pointer-events-auto flex h-12 self-start overflow-hidden rounded-lg border shadow-xl'}
                        style={{width: FIXED_LEFT_PANEL_WIDTH}}
                        aria-label={t('shell.variantB.leftSidebar', 'Left sidebar')}
                      >
                        <div className={'venus-shell-rail-thin flex w-14 shrink-0 items-center justify-center border-r'}>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={t('ui.shell.variantB.nav.mainMenu', {defaultValue: 'Main menu'})}
                              title={t('ui.shell.variantB.nav.mainMenu', {defaultValue: 'Main menu'})}
                              className={'venus-shell-toolbar-button venus-shell-plain-trigger inline-flex size-9 items-center justify-center rounded data-[state=open]:venus-shell-toolbar-button-active'}
                            >
                              <LuMenu size={16}/>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={'start'} side={'right'} sideOffset={8} className={'min-w-40'}>
                              {topMenuActions.map((menu) => {
                                return <DropdownMenuSub key={menu.id}>
                                  <DropdownMenuSubTrigger disabled={menu.disabled} className={'venus-ui-menu-item'}>
                                    {t(menu.id + '.label')}
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className={'min-w-40'}>
                                    {renderTopMenuNodes(menu.children ?? [])}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className={'flex min-w-0 flex-1 items-center gap-2 px-3'}>
                          <span className={'min-w-0 truncate text-sm font-medium'}>
                            {file?.name ?? t('shell.variantB.fileFallback', 'Venus Editor Shell')}
                          </span>
                          <Button
                            type={'button'}
                            variant={'ghost'}
                            title={t('ui.shell.variantB.leftSidebar.restore', {defaultValue: 'Open left panel'})}
                            className={'venus-shell-toolbar-button venus-shell-plain-trigger ml-auto inline-flex size-7 items-center justify-center rounded'}
                            onClick={() => {
                              setLeftPanelMinimized(false)
                            }}
                          >
                            <LuPanelLeftOpen size={14}/>
                          </Button>
                        </div>
                      </aside>
                    : <div className={'pointer-events-auto h-full overflow-hidden rounded-lg border shadow-xl'} style={{width: FIXED_LEFT_PANEL_WIDTH}}>
                        <LeftSidebar
                          onMinimize={() => {
                            setLeftPanelMinimized(true)
                          }}
                          fileName={file?.name}
                          layerItems={layerItems}
                          selectedIds={selectedIds}
                          assetCount={file?.assets?.length ?? 0}
                          activeTab={variantBSections.activeTab}
                          layersCollapsed={variantBSections.layersCollapsed}
                          showGrid={variantBSections.showGrid}
                          snappingEnabled={snappingEnabled}
                          debugStats={{
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
                          }}
                          onSetActiveTab={(tab) => {
                            dispatchShellCommand('shell.setLeftTab', {tab}, {
                              sourcePanel: 'left-sidebar',
                              sourceControl: 'tab-switch',
                              commitType: 'final',
                            })
                          }}
                          onToggleLayers={() => {
                            setVariantBSections((current) => ({
                              ...current,
                              layersCollapsed: !current.layersCollapsed,
                            }))
                          }}
                          onToggleGrid={() => {
                            dispatchShellCommand('shell.setGrid', {enabled: !variantBSections.showGrid}, {
                              sourcePanel: 'left-sidebar',
                              sourceControl: 'settings-grid-toggle',
                              commitType: 'final',
                            })
                          }}
                          onToggleSnapping={() => {
                            dispatchShellCommand('shell.setSnapping', {enabled: !snappingEnabled}, {
                              sourcePanel: 'left-sidebar',
                              sourceControl: 'settings-snapping-toggle',
                              commitType: 'final',
                            })
                          }}
                          onOpenTemplatePicker={() => {
                            setShowTemplatePresetPicker(true)
                          }}
                          onOpenCreateFile={() => {
                            executeAction('newFile')
                          }}
                          executeMenuAction={executeAction}
                          copiedCount={copiedItems.length}
                          hasUnsavedChanges={hasUnsavedChanges}
                          historyItems={historyItems}
                          historyStatus={historyStatus}
                          onPickHistory={(historyId, meta) => {
                            dispatchShellCommand('history.pick', {historyId}, meta)
                          }}
                          onSelectLayers={(mode, ids, sourceControl) => {
                            dispatchShellCommand('selection.modify', {mode, ids}, {
                              sourcePanel: 'left-sidebar',
                              sourceControl,
                              commitType: 'final',
                            })
                          }}
                          onPatchLayers={(ids, patch, sourceControl) => {
                            ids.forEach((elementId) => {
                              dispatchShellCommand('element.modify', {elementId, patch}, {
                                sourcePanel: 'left-sidebar',
                                sourceControl,
                                commitType: 'final',
                              })
                            })
                          }}
                        />
                      </div>}
                </div>

                <div className={'pointer-events-none absolute right-3 top-3 bottom-3 z-20 flex'}>
                  {rightPanelMinimized
                    ? <Button
                        type={'button'}
                        title={t('ui.shell.variantB.rightSidebar.restore', {defaultValue: 'Restore right panel'})}
                        className={'venus-shell-toolbar-button venus-shell-plain-trigger pointer-events-auto inline-flex h-9 items-center gap-1 rounded px-2'}
                        onClick={() => {
                          setRightPanelMinimized(false)
                        }}
                      >
                        <LuPanelRightClose size={14}/>
                        <span className={'text-xs'}>Inspector</span>
                      </Button>
                    : <div className={'pointer-events-auto h-full overflow-hidden rounded-lg border shadow-xl'} style={{width: FIXED_RIGHT_PANEL_WIDTH}}>
                        <RightSidebar
                          onMinimize={() => {
                            setRightPanelMinimized(true)
                          }}
                          context={inspectorContext}
                          selectedProps={selectedProps}
                          zoomPercent={Math.max(1, Math.round(viewportScale * 100))}
                          selectedCount={selectedIds.length}
                          layerCount={layerItems.length}
                          executeAction={executeAction}
                          onSetZoom={(zoomPercent) => {
                            dispatchShellCommand('shell.setZoom', {zoomPercent}, {
                              sourcePanel: 'right-sidebar',
                              sourceControl: 'zoom-chip',
                              commitType: 'final',
                            })
                          }}
                          onSetInspectorContext={(context) => {
                            dispatchShellCommand('inspector.setContext', {context}, {
                              sourcePanel: 'right-sidebar',
                              sourceControl: 'context-switch',
                              commitType: 'final',
                            })
                          }}
                          onPatchElementProps={(elementId, patch, meta) => {
                            dispatchShellCommand('element.modify', {elementId, patch}, meta)
                          }}
                        />
                      </div>}
                </div>

                {variantBSections.showGrid &&
                  <div
                    className={'pointer-events-none absolute inset-0 z-10'}
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.08) 1px, transparent 1px)',
                      backgroundSize: `${Math.max(12, Math.round(24 * viewportScale))}px ${Math.max(12, Math.round(24 * viewportScale))}px`,
                    }}
                  />}
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

    {showCreateFile &&
      <CreateFile bg={hasFile ? '#00000080' : '#fff'}
                  createFile={createFile}
                  onBgClick={() => {
                    if (hasFile) {
                      handleCreating(false)
                    }
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
