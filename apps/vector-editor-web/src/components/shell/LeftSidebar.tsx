import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  useTheme,
} from '@vector/ui'
import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import type {LayerItem} from '../../editor/hooks/useEditorRuntime.types.ts'
import {useTranslation} from 'react-i18next'
import {
  LuBug,
  LuChevronDown,
  LuChevronRight,
  LuCircle,
  LuComponent,
  LuFile,
  LuFrame,
  LuGroup,
  LuImage,
  LuPentagon,
  LuRectangleHorizontal,
  LuSearch,
  LuShapes,
  LuSpline,
  LuStar,
  LuHistory,
  LuType,
  LuBox,
  LuMenu,
} from 'react-icons/lu'
import {lineSeg} from '../../assets/svg/icons.tsx'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../header/shortcutBar/Icons/LayerIcons.tsx'
import {createHeaderMenuData} from '../header/menu/menuData.ts'
import type {MenuItemType} from '../header/menu/type'
import type {EditorExecutor} from '../../editor/hooks/useEditorRuntime.types.ts'
import {HistoryPanel} from '../historyPanel/HistoryPanel.tsx'
import {TEST_IDS} from '../../testing/testIds.ts'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
import {EDITOR_TEXT_LABEL_CLASS} from '../editorChrome/editorTypography.ts'

type LeftSidebarTab = 'file' | 'assets' | 'search' | 'history' | 'debug'

interface AssetLibraryCard {
  id: string
  title: string
  subtitle: string
  description: string
}

interface DebugStats {
  editorRenderCount: number
  sceneUpdateCount: number
  fps: number
  sceneVersion: number
  shapeCount: number
  selectedCount: number
  viewportScale: number
  cacheHitEstimate: number
  cacheMissEstimate: number
  cacheHitRate: number
}

interface LeftSidebarProps {
  fileName?: string
  layerItems: LayerItem[]
  selectedIds: string[]
  assetCount: number
  activeTab: LeftSidebarTab
  layersCollapsed: boolean
  showGrid: boolean
  snappingEnabled: boolean
  debugStats: DebugStats
  onMinimize: VoidFunction
  onSetActiveTab: (tab: LeftSidebarTab) => void
  onToggleLayers: VoidFunction
  onToggleGrid: VoidFunction
  onToggleSnapping: VoidFunction
  onOpenTemplatePicker: VoidFunction
  executeMenuAction: EditorExecutor
  copiedCount: number
  hasUnsavedChanges: boolean
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
  historyItems: Array<{id: number; label?: string; data: {type: string}}>
  onPickHistory: (historyId: number, meta: ShellCommandMeta) => void
  onSelectLayers: (mode: 'replace' | 'toggle' | 'add', ids: string[], sourceControl: string) => void
}

const SIDEBAR_ICON_SIZE = 16
const SIDEBAR_GLYPH_SIZE = 14

const ASSET_LIBRARY_CARDS: AssetLibraryCard[] = [
  {
    id: 'action-sheet',
    title: 'Action Sheet',
    subtitle: 'iOS and iPadOS 26 / Examples',
    description: 'Use the action sheet pattern for contextual actions and one-step task handoff.',
  },
  {
    id: 'activity-view',
    title: 'Activity View',
    subtitle: 'iOS and iPadOS 26 / Examples',
    description: 'Switch variable modes and insertion presets before committing a reusable instance to canvas.',
  },
  {
    id: 'alert',
    title: 'Alert',
    subtitle: 'iOS and iPadOS 26 / Examples',
    description: 'Use alerts for concise, high-priority feedback with one primary and one dismissive action.',
  },
  {
    id: 'color-picker',
    title: 'Color Picker',
    subtitle: 'iOS and iPadOS 26 / Examples',
    description: 'Use palette and spectrum controls to expose variables while preserving contrast constraints.',
  },
]

function LayerTypeGlyph(props: {type: string, isGroup?: boolean}) {
  if (props.isGroup || props.type === 'group') {
    return <LuGroup size={SIDEBAR_GLYPH_SIZE}/>
  }

  switch (props.type) {
    case 'frame':
      return <LuFrame size={SIDEBAR_GLYPH_SIZE}/>
    case 'rectangle':
      return <LuRectangleHorizontal size={SIDEBAR_GLYPH_SIZE}/>
    case 'ellipse':
      return <LuCircle size={SIDEBAR_GLYPH_SIZE}/>
    case 'polygon':
      return <LuPentagon size={SIDEBAR_GLYPH_SIZE}/>
    case 'star':
      return <LuStar size={SIDEBAR_GLYPH_SIZE}/>
    case 'lineSegment':
      return lineSeg(SIDEBAR_GLYPH_SIZE)
    case 'path':
      return <LuSpline size={SIDEBAR_GLYPH_SIZE}/>
    case 'text':
      return <LuType size={SIDEBAR_GLYPH_SIZE}/>
    case 'image':
      return <LuImage size={SIDEBAR_GLYPH_SIZE}/>
    case 'box':
      return <LuBox size={SIDEBAR_GLYPH_SIZE}/>
    default:
      return <LuComponent size={SIDEBAR_GLYPH_SIZE}/>
  }
}

function SemanticTreeRow(props: {
  label: string
  active?: boolean
  depth?: number
  hasChildren?: boolean
  expanded?: boolean
  icon?: ReactNode
  expandTooltip: string
  collapseTooltip: string
  onToggleChildren?: VoidFunction
  onActivate: (isToggle: boolean) => void
}) {
  return (
    <li role={'none'}>
      <div
        role={'treeitem'}
        aria-selected={props.active}
        aria-expanded={props.hasChildren ? props.expanded : undefined}
        tabIndex={0}
        className={cn(
          `flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none ${EDITOR_TEXT_LABEL_CLASS}`,
          props.active ? 'venus-shell-icon-active' : 'venus-shell-toolbar-button venus-shell-text-muted',
        )}
        style={{paddingLeft: 8 + (props.depth ?? 0) * 14}}
        onClick={(event) => {
          const isToggle = event.metaKey || event.ctrlKey
          props.onActivate(isToggle)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            props.onActivate(false)
          }
        }}
      >
        {props.hasChildren
          ? <Tooltip placement='r' title={props.expanded ? props.collapseTooltip : props.expandTooltip} asChild>
              <Button
                type={'button'}
                variant={'ghost'}
                className={'inline-flex size-4 items-center justify-center rounded venus-shell-plain-trigger hover:text-[var(--venus-shell-active-text)]'}
                aria-label={props.expanded ? props.collapseTooltip : props.expandTooltip}
                title={props.expanded ? props.collapseTooltip : props.expandTooltip}
                onClick={(event) => {
                  event.stopPropagation()
                  props.onToggleChildren?.()
                }}
              >
                {props.expanded ? <LuChevronDown size={12}/> : <LuChevronRight size={12}/>} 
              </Button>
            </Tooltip>
          : <span className={'inline-flex size-4'} aria-hidden={true}/>} 
        {props.icon &&
          <span className={'inline-flex size-4 items-center justify-start venus-shell-text-muted'}>
            {props.icon}
          </span>}
        <span className={'truncate'}>{props.label}</span>
      </div>
    </li>
  )
}

export default function LeftSidebar(props: LeftSidebarProps) {
  const {t, i18n} = useTranslation()
  const {mode, setMode} = useTheme()
  const [layerFilter, setLayerFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set())
  const [activeAssetId, setActiveAssetId] = useState(ASSET_LIBRARY_CARDS[0]?.id ?? '')
  const menuRootRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        menuRootRef.current?.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')?.focus()
      }
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const handleTopMenuAction = (menuItem: MenuItemType) => {
    switch (menuItem.id) {
      case 'languageEnglish':
        i18n.changeLanguage('en')
        return true
      case 'languageChinese':
        i18n.changeLanguage('cn')
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

  const renderTopMenuNodes = (menuItems: MenuItemType[]) => {
    return menuItems.map((menuItem) => {
      const hasChildren = !!menuItem.children?.length
      const label = t(menuItem.id + '.label')
      const tooltip = t(menuItem.id + '.tooltip', {defaultValue: label})
      const icon = resolveMenuIcon(menuItem.icon ?? menuItem.id)

      return (
        <>
          {menuItem.divide && <DropdownMenuSeparator/>}
          {hasChildren
            ? <DropdownMenuSub key={`sub-${menuItem.id}`}>
                <DropdownMenuSubTrigger disabled={menuItem.disabled} className={cn(EDITOR_TEXT_LABEL_CLASS)}>
                  <span className={'inline-flex items-center gap-2'}>
                    {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
                    <span>{label}</span>
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {renderTopMenuNodes(menuItem.children ?? [])}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            : <DropdownMenuItem
                key={`item-${menuItem.id}`}
                disabled={menuItem.disabled}
                onClick={() => {
                  executeTopMenuAction(menuItem)
                }}
                title={tooltip}
                className={cn(EDITOR_TEXT_LABEL_CLASS)}
              >
                <span className={'inline-flex items-center gap-2'}>
                  {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
                  <span>{label}</span>
                </span>
              </DropdownMenuItem>}
        </>
      )
    })
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

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return [] as LayerItem[]
    }

    return props.layerItems.filter((item) => {
      return item.name.toLowerCase().includes(normalizedQuery) || item.type.toLowerCase().includes(normalizedQuery)
    })
  }, [props.layerItems, searchQuery])

  const activeAsset = useMemo(() => {
    return ASSET_LIBRARY_CARDS.find((item) => item.id === activeAssetId) ?? ASSET_LIBRARY_CARDS[0]
  }, [activeAssetId])

  const tabItems: Array<{id: LeftSidebarTab, label: string, icon: ReactNode}> = [
    {id: 'file', label: t('shell.variantB.nav.file', 'File'), icon: <LuFile size={SIDEBAR_ICON_SIZE}/>},
    {id: 'assets', label: t('shell.variantB.nav.assets', 'Assets'), icon: <LuShapes size={SIDEBAR_ICON_SIZE}/>},
    {id: 'search', label: t('shell.variantB.nav.find', 'Find'), icon: <LuSearch size={SIDEBAR_ICON_SIZE}/>},
    {id: 'history', label: t('inspector.history.title', 'History'), icon: <LuHistory size={SIDEBAR_ICON_SIZE}/>},
    {id: 'debug', label: t('shell.variantB.nav.debug', 'Debug'), icon: <LuBug size={SIDEBAR_ICON_SIZE}/>},
  ]

  return (
    <aside className={'venus-shell-rail flex h-full w-[296px] shrink-0 border-r'} aria-label={t('shell.variantB.leftSidebar', 'Left sidebar')} data-testid={TEST_IDS.sidebarLeft.workspace}>
      <nav className={'venus-shell-rail-thin flex w-14 shrink-0 flex-col items-center gap-2 border-r py-3'} aria-label={t('shell.variantB.nav.title', 'Sidebar tabs')} data-testid={TEST_IDS.sidebarLeft.tabRail}>
        <div ref={menuRootRef} className={'relative mb-1'}>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('ui.shell.variantB.nav.mainMenu', {defaultValue: 'Main menu'})}
              title={t('ui.shell.variantB.nav.mainMenu', {defaultValue: 'Main menu'})}
              className={'venus-shell-toolbar-button venus-shell-plain-trigger inline-flex size-9 items-center justify-center rounded'}
            >
              <LuMenu size={SIDEBAR_ICON_SIZE}/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={'start'} side={'right'} sideOffset={8} className={'min-w-40'}>
              {topMenuActions.map((menu) => {
                return <DropdownMenuSub key={menu.id}>
                  <DropdownMenuSubTrigger disabled={menu.disabled} className={cn(EDITOR_TEXT_LABEL_CLASS)}>
                    {t(menu.id + '.label')}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {renderTopMenuNodes(menu.children ?? [])}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs
          orientation={'vertical'}
          value={props.activeTab}
          onValueChange={(nextValue) => {
            props.onSetActiveTab(nextValue as LeftSidebarTab)
          }}
          className={'w-full'}
        >
          <TabsList variant={'line'} className={'h-auto w-full flex-col items-center gap-2 rounded-none bg-transparent p-0'}>
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
                    'venus-shell-plain-trigger inline-flex size-9 items-center justify-center rounded text-[var(--venus-shell-text)]',
                    'hover:text-[var(--venus-shell-active-text)]',
                    active && 'venus-shell-tab-active font-semibold text-[var(--venus-shell-active-text)]',
                  )}
                >
                  {tabItem.icon}
                </TabsTrigger>
              </Tooltip>
            })}
          </TabsList>
        </Tabs>
      </nav>

      <section className={'venus-shell-panel flex min-w-0 w-[240px] flex-1 flex-col'}>
        <header className={'border-b px-3 py-2'}>
          <div className={'flex items-center justify-between gap-2'}>
            <h2 className={'truncate text-sm font-medium'}>{props.fileName ?? t('shell.variantB.fileFallback', 'Venus Editor Shell')}</h2>
            <Button
              type={'button'}
              variant={'ghost'}
              className={'venus-shell-toolbar-button venus-shell-plain-trigger inline-flex size-6 items-center justify-center rounded text-[11px]'}
              aria-label={t('shell.variantB.leftSidebar.minimize', 'Minimize left panel')}
              title={t('shell.variantB.leftSidebar.minimize', 'Minimize left panel')}
              onClick={props.onMinimize}
            >
              <span>&minus;</span>
            </Button>
          </div>
          <p className={'venus-shell-text-muted mt-1 text-[11px]'}>{t('shell.variantB.fileSpace', 'Drafts')}</p>
        </header>

        {props.activeTab === 'file' &&
          <div id={'variant-b-tabpanel-file'} role={'tabpanel'} className={'flex min-h-0 flex-1 flex-col'}>
            <section className={'flex min-h-0 flex-1 flex-col p-2.5'}>
              <div className={'mb-2 flex items-center justify-between'}>
                <Tooltip placement={'r'} title={t('ui.shell.variantB.layers.toggle', {defaultValue: 'Toggle layers section'})} asChild>
                  <Button
                    type={'button'}
                    variant={'ghost'}
                    className={'venus-shell-plain-trigger inline-flex items-center gap-1 rounded px-1 text-xs font-semibold text-[var(--venus-shell-text)] hover:text-[var(--venus-shell-active-text)]'}
                    title={t('ui.shell.variantB.layers.toggle', {defaultValue: 'Toggle layers section'})}
                    onClick={props.onToggleLayers}
                  >
                    {props.layersCollapsed ? <LuChevronRight size={SIDEBAR_GLYPH_SIZE}/> : <LuChevronDown size={SIDEBAR_GLYPH_SIZE}/>} 
                    {t('shell.variantB.layers.title', 'Layers')}
                  </Button>
                </Tooltip>
                <span className={'venus-shell-text-muted text-xs'}>{props.layerItems.length}</span>
              </div>

              {!props.layersCollapsed &&
                <div className={'mb-2'}>
                  <label className={'sr-only'} htmlFor={'variant-b-layer-filter'}>
                    {t('shell.variantB.layers.search', 'Search layers')}
                  </label>
                  <div className={'venus-shell-toolbar-button flex items-center gap-2 rounded border px-2 py-1'}>
                    <LuSearch className={'venus-shell-text-muted'} size={12}/>
                    <Input
                      id={'variant-b-layer-filter'}
                      type={'text'}
                      s
                      className={'h-6 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0'}
                      placeholder={t('shell.variantB.layers.searchPlaceholder', 'Filter layers')}
                      value={layerFilter}
                      onChange={(event) => {
                        setLayerFilter(event.target.value)
                      }}
                    />
                  </div>
                </div>}

              {!props.layersCollapsed &&
                <div className={'scrollbar-custom min-h-0 flex-1 overflow-y-auto rounded border p-1'}>
                  {visibleLayerItems.length === 0 &&
                    <div className={'venus-shell-text-muted px-2 py-3 text-xs'}>
                      {t('shell.variantB.layers.empty', 'No matching layers')}
                    </div>}

                  <ul role={'tree'} aria-label={t('shell.variantB.layers.title', 'Layers')} className={'flex flex-col gap-1'}>
                    {treeLayerItems.map((item) => {
                      const selected = props.selectedIds.includes(item.id)
                      const expanded = !collapsedGroupIds.has(item.id)

                      return (
                        <SemanticTreeRow
                          key={item.id}
                          label={item.name}
                          depth={item.depth}
                          active={selected}
                          hasChildren={item.hasChildren}
                          expanded={expanded}
                          expandTooltip={t('ui.shell.variantB.layers.expandGroup', {defaultValue: 'Expand group'})}
                          collapseTooltip={t('ui.shell.variantB.layers.collapseGroup', {defaultValue: 'Collapse group'})}
                          onToggleChildren={item.hasChildren
                            ? () => {
                                setCollapsedGroupIds((current) => {
                                  const next = new Set(current)
                                  if (next.has(item.id)) {
                                    next.delete(item.id)
                                  } else {
                                    next.add(item.id)
                                  }
                                  return next
                                })
                              }
                            : undefined}
                          icon={<LayerTypeGlyph type={item.type} isGroup={item.isGroup}/>}
                          onActivate={(isToggle) => {
                            props.onSelectLayers(isToggle ? 'toggle' : 'replace', [item.id], 'variant-b-layer-row-select')
                          }}
                        />
                      )
                    })}
                  </ul>
                </div>}
            </section>
          </div>}

        {props.activeTab === 'assets' &&
          <section id={'variant-b-tabpanel-assets'} role={'tabpanel'} className={'flex min-h-0 flex-1 flex-col p-2.5'}>
            <h3 className={'mb-2 inline-flex items-center gap-2 font-semibold text-sm'}>
              <LuShapes size={SIDEBAR_GLYPH_SIZE}/>
              {t('shell.variantB.assets.title', 'Assets')}
            </h3>

            <div className={'grid min-h-0 flex-1 grid-cols-[1.1fr_0.9fr] gap-2'}>
              <div className={'scrollbar-custom min-h-0 overflow-y-auto pr-0.5'}>
                <div className={'grid grid-cols-1 gap-2'}>
                  {ASSET_LIBRARY_CARDS.map((card) => {
                    const active = card.id === activeAsset.id
                    return (
                      <article
                        key={card.id}
                        role={'button'}
                        tabIndex={0}
                        data-state={active ? 'active' : 'inactive'}
                        className={cn(
                          'rounded-md border p-2 transition-colors',
                          active
                            ? 'border-[var(--venus-shell-active-text)] bg-[var(--venus-shell-active-bg)]'
                            : 'bg-white hover:border-[var(--venus-ui-border-color-strong)]',
                        )}
                        onMouseEnter={() => {
                          setActiveAssetId(card.id)
                        }}
                        onFocus={() => {
                          setActiveAssetId(card.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setActiveAssetId(card.id)
                            props.onOpenTemplatePicker()
                          }
                        }}
                      >
                        <div className={'mb-1.5 rounded border bg-slate-50 p-1.5'}>
                          <div className={'h-12 w-full rounded border bg-white'}/>
                        </div>

                        <div className={'text-xs font-medium text-[var(--venus-shell-text)]'}>{card.title}</div>
                        <div className={'text-[10px] text-[var(--venus-shell-text-muted)]'}>{card.subtitle}</div>

                        {active &&
                          <div className={'mt-1.5 flex items-center justify-between gap-1'}>
                            <p className={'line-clamp-2 text-[10px] text-[var(--venus-shell-text-muted)]'}>{card.description}</p>
                            <Button
                              type={'button'}
                              variant={'ghost'}
                              size={'sm'}
                              title={t('ui.template.applyButtonLabel', {defaultValue: 'Add'})}
                              className={'h-6 shrink-0 px-1.5 text-[10px] font-semibold'}
                              onClick={() => {
                                props.onOpenTemplatePicker()
                              }}
                            >
                              +
                            </Button>
                          </div>}
                      </article>
                    )
                  })}
                </div>
              </div>

              <aside className={'flex min-h-0 flex-col rounded border bg-white p-2'}>
                <p className={'text-[11px] font-semibold text-[var(--venus-shell-text)]'}>{t('shell.variantB.assets.details', 'Details')}</p>
                <p className={'text-[10px] text-[var(--venus-shell-text-muted)]'}>{activeAsset.subtitle}</p>

                <div className={'mt-2 rounded border bg-slate-50 p-1.5'}>
                  <div className={'h-20 w-full rounded border bg-white'}/>
                </div>

                <h4 className={'mt-2 text-xs font-semibold text-[var(--venus-shell-text)]'}>{activeAsset.title}</h4>
                <p className={'mt-1 text-[11px] text-[var(--venus-shell-text-muted)]'}>{activeAsset.description}</p>

                <div className={'mt-auto pt-2'}>
                  <div className={'mb-2 flex items-center justify-between text-[10px] text-[var(--venus-shell-text-muted)]'}>
                    <span>{t('shell.variantB.assets.total', 'Total Assets')}</span>
                    <span className={'font-semibold text-[var(--venus-shell-text)]'}>{props.assetCount}</span>
                  </div>
                  <Button
                    type={'button'}
                    variant={'ghost'}
                    title={t('ui.shell.variantB.assets.templateTooltip', {defaultValue: 'Create file from template preset'})}
                    className={'h-7 w-full justify-center border border-[var(--venus-ui-border-color)] text-xs font-semibold'}
                    onClick={props.onOpenTemplatePicker}
                  >
                    {t('ui.template.applyButtonLabel', {defaultValue: 'Add'})}
                  </Button>
                </div>
              </aside>
            </div>
          </section>}

        {props.activeTab === 'search' &&
          <section id={'variant-b-tabpanel-search'} role={'tabpanel'} className={'flex min-h-0 flex-1 flex-col p-3'}>
            <h3 className={'mb-2 inline-flex items-center gap-2 font-semibold'}>
              <LuSearch size={SIDEBAR_GLYPH_SIZE}/>
              {t('shell.variantB.search.title', 'Quick Find')}
            </h3>
            <div className={'venus-shell-toolbar-button mb-2 flex items-center gap-2 rounded border px-2 py-1'}>
              <LuSearch className={'venus-shell-text-muted'} size={12}/>
              <Input
                type={'text'}
                s
                className={'h-6 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0'}
                placeholder={t('shell.variantB.search.placeholder', 'Search by name or type')}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                }}
              />
            </div>

            <div className={'scrollbar-custom min-h-0 flex-1 overflow-y-auto rounded border p-1'}>
              {searchQuery.trim().length === 0 &&
                <div className={'venus-shell-text-muted px-2 py-3 text-xs'}>
                  {t('shell.variantB.search.tip', 'Type to start searching layers')}
                </div>}

              {searchQuery.trim().length > 0 && searchResults.length === 0 &&
                <div className={'venus-shell-text-muted px-2 py-3 text-xs'}>
                  {t('shell.variantB.search.empty', 'No results')}
                </div>}

              {searchResults.length > 0 &&
                <ul role={'list'} className={'flex flex-col gap-1'}>
                  {searchResults.map((item) => {
                    const selected = props.selectedIds.includes(item.id)

                    return (
                      <SemanticTreeRow
                        key={item.id}
                        label={item.name}
                        active={selected}
                        expandTooltip={t('ui.shell.variantB.layers.expandGroup', {defaultValue: 'Expand group'})}
                        collapseTooltip={t('ui.shell.variantB.layers.collapseGroup', {defaultValue: 'Collapse group'})}
                        icon={<LayerTypeGlyph type={item.type} isGroup={item.isGroup}/>}
                        onActivate={() => {
                          props.onSelectLayers('replace', [item.id], 'variant-b-search-result-select')
                        }}
                      />
                    )
                  })}
                </ul>}
            </div>
          </section>}

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

function resolveMenuIcon(icon: string) {
  switch (icon) {
    case 'layerUp':
      return <LayerUp size={14}/>
    case 'layerDown':
      return <LayerDown size={14}/>
    case 'layerTop':
      return <LayerToTop size={14}/>
    case 'layerBottom':
      return <LayerToBottom size={14}/>
    default:
      return null
  }
}

function DebugRow(props: {label: string, value: string}) {
  return (
    <div className={'venus-shell-toolbar-button flex items-center justify-between rounded border px-2 py-1.5 text-xs'}>
      <span className={'venus-shell-text-muted'}>{props.label}</span>
      <span className={'font-mono'}>{props.value}</span>
    </div>
  )
}
