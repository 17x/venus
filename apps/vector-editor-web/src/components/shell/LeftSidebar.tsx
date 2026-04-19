import {Button, Tabs, TabsList, TabsTrigger, Tooltip, useTheme, cn} from '@vector/ui'
import {useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {LuBug, LuPanelLeftClose} from 'react-icons/lu'
import type {LayerItem} from '../../editor/hooks/useEditorRuntime.types.ts'
import {createHeaderMenuData} from '../header/menu/menuData.ts'
import type {MenuItemType} from '../header/menu/type'
import {HistoryPanel} from '../historyPanel/HistoryPanel.tsx'
import {TEST_IDS} from '../../testing/testIds.ts'
import {LeftSidebarMenu} from './LeftSidebarMenu.tsx'
import {LeftSidebarAssetsTab} from './LeftSidebarAssetsTab.tsx'
import {LeftSidebarFileTab} from './LeftSidebarFileTab.tsx'
import {createLeftSidebarTabItems, type LeftSidebarProps, type LeftSidebarTab, type TreeLayerItem, SIDEBAR_GLYPH_SIZE} from './LeftSidebarShared.tsx'

export default function LeftSidebar(props: LeftSidebarProps) {
  const {t, i18n} = useTranslation()
  const {mode, setMode, colors} = useTheme()
  const [layerFilter, setLayerFilter] = useState('')
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set())
  const [activeAssetId, setActiveAssetId] = useState('action-sheet')
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null)

  const topMenuActions = useMemo(() => {
    return createHeaderMenuData({
      selectedIds: props.selectedIds,
      copiedCount: props.copiedCount,
      needSave: props.hasUnsavedChanges,
      historyStatus: props.historyStatus,
      language: i18n.language === 'zh-CN' ? 'cn' : (i18n.language as 'en' | 'cn' | 'jp'),
      gridEnabled: props.showGrid,
      snappingEnabled: props.snappingEnabled,
      canToggleGrid: true,
      canToggleSnapping: true,
      themeMode: mode,
    })
  }, [props.selectedIds, props.copiedCount, props.hasUnsavedChanges, props.historyStatus, i18n.language, props.showGrid, props.snappingEnabled, mode])

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
        props.onToggleGrid()
        return true
      case 'toggleSnappingOn':
      case 'toggleSnappingOff':
        props.onToggleSnapping()
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
      props.executeMenuAction(action, menuItem.editorActionData)
      return
    }
    props.executeMenuAction(action)
  }

  const normalizedFilter = layerFilter.trim().toLowerCase()
  const visibleLayerItems = useMemo(() => {
    if (!normalizedFilter) {
      return props.layerItems
    }

    return props.layerItems.filter((item) => {
      return item.name.toLowerCase().includes(normalizedFilter) || item.type.toLowerCase().includes(normalizedFilter)
    })
  }, [props.layerItems, normalizedFilter])

  const treeLayerItems = useMemo(() => {
    const rows: Array<LayerItem & {hasChildren: boolean}> = []
    const collapsedAncestorDepths: number[] = []

    visibleLayerItems.forEach((item, index) => {
      while (collapsedAncestorDepths.length > 0 && item.depth <= collapsedAncestorDepths[collapsedAncestorDepths.length - 1]) {
        collapsedAncestorDepths.pop()
      }

      const hasCollapsedAncestor = collapsedAncestorDepths.length > 0
      const nextItem = visibleLayerItems[index + 1]
      const hasChildren = !!nextItem && nextItem.depth > item.depth

      if (!hasCollapsedAncestor) {
        rows.push({...item, hasChildren})
      }

      if (hasChildren && item.isGroup && collapsedGroupIds.has(item.id)) {
        collapsedAncestorDepths.push(item.depth)
      }
    })

    return rows
  }, [collapsedGroupIds, visibleLayerItems])

  const selectedLayerItems = useMemo(() => {
    if (props.selectedIds.length === 0) {
      return [] as LayerItem[]
    }

    const selectedIdSet = new Set(props.selectedIds)
    return props.layerItems.filter((item) => selectedIdSet.has(item.id))
  }, [props.layerItems, props.selectedIds])

  const selectedHasHidden = selectedLayerItems.some((item) => item.isVisible === false)
  const selectedHasLocked = selectedLayerItems.some((item) => item.isLocked === true)

  const tabItems = createLeftSidebarTabItems(t)
  const treeRows = treeLayerItems as TreeLayerItem[]

  return (
    <aside className={'flex h-full w-[296px] shrink-0 dark:bg-slate-950'} aria-label={t('shell.variantB.leftSidebar', 'Left sidebar')} data-testid={TEST_IDS.sidebarLeft.workspace}>
      <nav className={'flex w-14 shrink-0 flex-col items-center gap-1.5py-2.5 dark:bg-slate-950'} aria-label={t('shell.variantB.nav.title', 'Sidebar tabs')} data-testid={TEST_IDS.sidebarLeft.tabRail}>
        <LeftSidebarMenu topMenuActions={topMenuActions} onExecuteMenuAction={executeTopMenuAction}/>
        <Tabs
          orientation={'vertical'}
          value={props.activeTab}
          onValueChange={(nextValue) => {
            props.onSetActiveTab(nextValue as LeftSidebarTab)
          }}
          className={'w-full'}
        >
          <TabsList variant={'line'} className={'h-auto w-full flex-col items-center gap-1.5 rounded-none bg-transparent p-0'}>
            {tabItems.map((tabItem) => {
              const active = tabItem.id === props.activeTab

              return <Tooltip key={tabItem.id} placement={'r'} title={tabItem.label} asChild>
                <TabsTrigger
                  value={tabItem.id}
                  aria-controls={`variant-b-tabpanel-${tabItem.id}`}
                  aria-label={tabItem.label}
                  title={tabItem.label}
                  data-testid={TEST_IDS.sidebarLeft.tabTrigger(tabItem.id)}
                  className={cn(
                    'inline-flex flex-col w-10 h-10 text-[10px] px-1.5',
                    // 'items-center justify-center rounded bg-transparent text-slate-600 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-600',
                    // 'data-active:bg-transparent',
                    // active && 'font-semibold',
                  )}
                  style={active
                    ? {
                        backgroundColor: colors.primary,
                        color: colors.primaryForeground,
                      }
                    : undefined}
                >
                  {tabItem.icon}
                </TabsTrigger>
              </Tooltip>
            })}
          </TabsList>
        </Tabs>
      </nav>

      <section className={'flex min-w-0 w-[240px] flex-1 flex-col bg-white dark:bg-slate-900'}>
        <header className={'px-3 py-2'}>
          <div className={'flex items-center justify-between gap-2'}>
            <h2 className={'truncate text-sm font-medium'}>{props.fileName ?? t('shell.variantB.fileFallback', 'Venus Editor Shell')}</h2>
            <Button
              type={'button'}
              variant={'ghost'}
              className={'inline-flex size-8 items-center justify-center rounded text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}
              aria-label={t('shell.variantB.leftSidebar.minimize', 'Minimize left panel')}
              title={t('shell.variantB.leftSidebar.minimize', 'Minimize left panel')}
              onClick={props.onMinimize}
            >
              <LuPanelLeftClose size={14}/>
            </Button>
          </div>
          <p className={'mt-1 text-[11px] text-slate-500 dark:text-slate-400'}>{t('shell.variantB.fileSpace', 'Drafts')}</p>
        </header>

        {props.activeTab === 'file' &&
          <LeftSidebarFileTab
            layerFilter={layerFilter}
            layersCollapsed={props.layersCollapsed}
            selectedIds={props.selectedIds}
            selectedHasHidden={selectedHasHidden}
            selectedHasLocked={selectedHasLocked}
            selectedLayerItems={selectedLayerItems}
            treeLayerItems={treeRows}
            visibleLayerItems={visibleLayerItems}
            collapsedGroupIds={collapsedGroupIds}
            onLayerFilterChange={setLayerFilter}
            onToggleLayers={props.onToggleLayers}
            onToggleGroup={(layerId) => {
              setCollapsedGroupIds((current) => {
                const next = new Set(current)
                if (next.has(layerId)) {
                  next.delete(layerId)
                } else {
                  next.add(layerId)
                }
                return next
              })
            }}
            onLockSelectionToggle={() => {
              props.onPatchLayers(
                selectedLayerItems.map((item) => item.id),
                {isLocked: !selectedHasLocked},
                'variant-b-layer-batch-lock',
              )
            }}
            onVisibilitySelectionToggle={() => {
              props.onPatchLayers(
                selectedLayerItems.map((item) => item.id),
                {isVisible: selectedHasHidden},
                'variant-b-layer-batch-visible',
              )
            }}
            onToggleLayerLocked={(layerId, nextLocked) => {
              props.onPatchLayers([layerId], {isLocked: nextLocked}, 'variant-b-layer-row-lock')
            }}
            onToggleLayerVisible={(layerId, nextVisible) => {
              props.onPatchLayers([layerId], {isVisible: nextVisible}, 'variant-b-layer-row-visible')
            }}
            onSelectLayer={(layerId, isToggle) => {
              props.onSelectLayers(isToggle ? 'toggle' : 'replace', [layerId], 'variant-b-layer-row-select')
            }}
          />}

        {props.activeTab === 'assets' &&
          <LeftSidebarAssetsTab
            activeAssetId={activeAssetId}
            assetCount={props.assetCount}
            hoveredAssetId={hoveredAssetId}
            onHoverAsset={setHoveredAssetId}
            onSelectAsset={setActiveAssetId}
            onOpenCreateFile={props.onOpenCreateFile}
            onOpenTemplatePicker={props.onOpenTemplatePicker}
          />}

        {props.activeTab === 'history' &&
          <section id={'variant-b-tabpanel-history'} role={'tabpanel'} className={'flex min-h-0 flex-1 flex-col p-2.5'}>
            <div className={'min-h-0 flex-1'} data-testid={TEST_IDS.sidebarLeft.historyTimeline}>
              <HistoryPanel
                historyItems={props.historyItems}
                historyStatus={props.historyStatus}
                pickHistory={(historyNode) => {
                  props.onPickHistory(historyNode.id, {
                    sourcePanel: 'left-sidebar',
                    sourceControl: 'history-tab-select',
                    commitType: 'final',
                  })
                }}
                onPickHistory={props.onPickHistory}
              />
            </div>
          </section>}

        {props.activeTab === 'debug' &&
          <section id={'variant-b-tabpanel-debug'} role={'tabpanel'} className={'scrollbar-custom flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3'}>
            <h3 className={'inline-flex items-center gap-2 font-semibold'}>
              <LuBug size={SIDEBAR_GLYPH_SIZE}/>
              {t('shell.variantB.debug.title', 'Debug')}
            </h3>
            <DebugRow label={t('shell.variantB.debug.editorRenders', 'EditorFrame Renders')} value={String(props.debugStats.editorRenderCount)}/>
            <DebugRow label={t('shell.variantB.debug.sceneUpdates', 'Scene Updates')} value={String(props.debugStats.sceneUpdateCount)}/>
            <DebugRow label={t('shell.variantB.debug.fps', 'FPS')} value={props.debugStats.fps.toFixed(1)}/>
            <DebugRow label={t('shell.variantB.debug.sceneVersion', 'Scene Version')} value={String(props.debugStats.sceneVersion)}/>
            <DebugRow label={t('shell.variantB.debug.shapeCount', 'Shape Count')} value={String(props.debugStats.shapeCount)}/>
            <DebugRow label={t('shell.variantB.debug.selectedCount', 'Selected Count')} value={String(props.debugStats.selectedCount)}/>
            <DebugRow label={t('shell.variantB.debug.viewportScale', 'Viewport Scale')} value={props.debugStats.viewportScale.toFixed(3)}/>
            <DebugRow label={t('shell.variantB.debug.cacheHitEstimate', 'Cache Hit (est.)')} value={String(props.debugStats.cacheHitEstimate)}/>
            <DebugRow label={t('shell.variantB.debug.cacheMissEstimate', 'Cache Miss (est.)')} value={String(props.debugStats.cacheMissEstimate)}/>
            <DebugRow label={t('shell.variantB.debug.cacheHitRate', 'Cache Hit Rate (est.)')} value={`${props.debugStats.cacheHitRate.toFixed(1)}%`}/>
          </section>}
      </section>
    </aside>
  )
}

function DebugRow(props: {label: string, value: string}) {
  return (
    <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
      <span className={'text-slate-500 dark:text-slate-400'}>{props.label}</span>
      <span className={'font-mono'}>{props.value}</span>
    </div>
  )
}
