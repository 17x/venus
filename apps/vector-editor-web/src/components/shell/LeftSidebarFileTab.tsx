import {Button, Input, Tooltip, cn} from '@vector/ui'
import {type ReactNode} from 'react'
import {useTranslation} from 'react-i18next'
import {LuBox, LuChevronDown, LuChevronRight, LuCircle, LuComponent, LuEye, LuEyeOff, LuFrame, LuGroup, LuImage, LuLock, LuLockOpen, LuPentagon, LuRectangleHorizontal, LuSearch, LuSpline, LuStar, LuType} from 'react-icons/lu'
import {lineSeg} from '../../assets/svg/icons.tsx'
import type {TreeLayerItem} from './LeftSidebarShared.tsx'
import {SIDEBAR_GLYPH_SIZE} from './LeftSidebarShared.tsx'
import {EDITOR_TEXT_LABEL_CLASS} from '../editorChrome/editorTypography.ts'

interface LeftSidebarFileTabProps {
  layerFilter: string
  layersCollapsed: boolean
  selectedIds: string[]
  selectedHasHidden: boolean
  selectedHasLocked: boolean
  selectedLayerItems: Array<{id: string}>
  treeLayerItems: TreeLayerItem[]
  visibleLayerItems: Array<{id: string}>
  collapsedGroupIds: Set<string>
  onLayerFilterChange: (value: string) => void
  onToggleLayers: VoidFunction
  onToggleGroup: (layerId: string) => void
  onLockSelectionToggle: VoidFunction
  onVisibilitySelectionToggle: VoidFunction
  onToggleLayerLocked: (layerId: string, nextLocked: boolean) => void
  onToggleLayerVisible: (layerId: string, nextVisible: boolean) => void
  onSelectLayer: (layerId: string, isToggle: boolean) => void
}

export function LeftSidebarFileTab(props: LeftSidebarFileTabProps) {
  const {t} = useTranslation()

  return <div id={'variant-b-tabpanel-file'} role={'tabpanel'} className={'flex min-h-0 flex-1 flex-col'}>
    <section className={'flex min-h-0 flex-1 flex-col p-2.5'}>
      <div className={'mb-2 flex items-center justify-between'}>
        <Tooltip placement={'r'} title={t('ui.shell.variantB.layers.toggle', {defaultValue: 'Toggle layers section'})} asChild>
          <Button
            type={'button'}
            variant={'ghost'}
            noTooltip
            className={'inline-flex w-full items-center justify-start gap-1 rounded px-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50'}
            title={t('ui.shell.variantB.layers.toggle', {defaultValue: 'Toggle layers section'})}
            onClick={props.onToggleLayers}
          >
            {props.layersCollapsed ? <LuChevronRight size={SIDEBAR_GLYPH_SIZE}/> : <LuChevronDown size={SIDEBAR_GLYPH_SIZE}/>} 
            {t('shell.variantB.layers.title', 'Layers')}
          </Button>
        </Tooltip>
      </div>

      {!props.layersCollapsed &&
        <div className={'mb-2'}>
          <label className={'sr-only'} htmlFor={'variant-b-layer-filter'}>
            {t('shell.variantB.layers.search', 'Search layers')}
          </label>
          <div className={'flex items-center gap-2 rounded bg-white px-2 py-1 dark:bg-slate-900'}>
            <LuSearch className={'text-slate-500 dark:text-slate-400'} size={12}/>
            <Input
              id={'variant-b-layer-filter'}
              type={'text'}
              s
              className={'h-6 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0'}
              placeholder={t('shell.variantB.layers.searchPlaceholder', 'Filter layers')}
              value={props.layerFilter}
              onChange={(event) => {
                props.onLayerFilterChange(event.target.value)
              }}
              onKeyDown={(event) => {
                event.stopPropagation()
              }}
            />
          </div>
        </div>}

      {!props.layersCollapsed &&
        <div className={'mb-2 grid grid-cols-2 gap-1'}>
          <Button
            type={'button'}
            variant={'ghost'}
            noTooltip
            disabled={props.selectedLayerItems.length === 0}
            className={'h-7 justify-center text-[11px]'}
            title={props.selectedHasLocked ? t('ui.shell.variantB.layers.unlockSelected', {defaultValue: 'Unlock selected'}) : t('ui.shell.variantB.layers.lockSelected', {defaultValue: 'Lock selected'})}
            onClick={props.onLockSelectionToggle}
          >
            {props.selectedHasLocked ? t('ui.shell.variantB.layers.unlock', {defaultValue: 'Unlock'}) : t('ui.shell.variantB.layers.lock', {defaultValue: 'Lock'})}
          </Button>
          <Button
            type={'button'}
            variant={'ghost'}
            noTooltip
            disabled={props.selectedLayerItems.length === 0}
            className={'h-7 justify-center text-[11px]'}
            title={props.selectedHasHidden ? t('ui.shell.variantB.layers.showSelected', {defaultValue: 'Show selected'}) : t('ui.shell.variantB.layers.hideSelected', {defaultValue: 'Hide selected'})}
            onClick={props.onVisibilitySelectionToggle}
          >
            {props.selectedHasHidden ? t('ui.shell.variantB.layers.show', {defaultValue: 'Show'}) : t('ui.shell.variantB.layers.hide', {defaultValue: 'Hide'})}
          </Button>
        </div>}

      {!props.layersCollapsed &&
        <div className={'scrollbar-custom min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded p-1'}>
          {props.visibleLayerItems.length === 0 &&
            <div className={'px-2 py-3 text-xs text-slate-500 dark:text-slate-400'}>
              {t('shell.variantB.layers.empty', 'No matching layers')}
            </div>}

          <ul role={'tree'} aria-label={t('shell.variantB.layers.title', 'Layers')} className={'flex min-w-0 flex-col gap-1'}>
            {props.treeLayerItems.map((item) => {
              const selected = props.selectedIds.includes(item.id)
              const expanded = !props.collapsedGroupIds.has(item.id)
              const isLocked = item.isLocked === true
              const isVisible = item.isVisible !== false

              return (
                <SemanticTreeRow
                  key={item.id}
                  label={item.name}
                  depth={item.depth}
                  active={selected}
                  hasChildren={item.hasChildren}
                  expanded={expanded}
                  isLocked={isLocked}
                  isVisible={isVisible}
                  expandTooltip={t('ui.shell.variantB.layers.expandGroup', {defaultValue: 'Expand group'})}
                  collapseTooltip={t('ui.shell.variantB.layers.collapseGroup', {defaultValue: 'Collapse group'})}
                  onToggleChildren={item.hasChildren ? () => props.onToggleGroup(item.id) : undefined}
                  onToggleLocked={() => {
                    props.onToggleLayerLocked(item.id, !isLocked)
                  }}
                  onToggleVisible={() => {
                    props.onToggleLayerVisible(item.id, !isVisible)
                  }}
                  icon={<LayerTypeGlyph type={item.type} isGroup={item.isGroup}/>}
                  onActivate={(isToggle) => {
                    props.onSelectLayer(item.id, isToggle)
                  }}
                />
              )
            })}
          </ul>
        </div>}
    </section>
  </div>
}

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
  isLocked?: boolean
  isVisible?: boolean
  onToggleChildren?: VoidFunction
  onToggleLocked?: VoidFunction
  onToggleVisible?: VoidFunction
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
          `group/tree-row relative flex h-8 w-full min-w-0 items-center justify-start rounded px-1 text-left outline-none ${EDITOR_TEXT_LABEL_CLASS}`,
          props.active
            ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50',
        )}
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
        <span
          className={'grid min-w-0 w-full grid-cols-[16px_16px_minmax(0,1fr)] items-center gap-2'}
          // Keep first-level subitems text-aligned with parent label instead of parent icon.
          style={{paddingLeft: 8 + Math.max(0, (props.depth ?? 0) - 1) * 14}}
        >
          {props.hasChildren
            ? <Tooltip placement='r' title={props.expanded ? props.collapseTooltip : props.expandTooltip} asChild>
                <Button
                  type={'button'}
                  variant={'ghost'}
                  noTooltip
                  className={'inline-flex size-4 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}
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
          <span className={'inline-flex size-4 items-center justify-start text-slate-500 dark:text-slate-400'}>
            {props.icon}
          </span>
          <span className={cn('truncate pr-2', props.isVisible === false && 'text-slate-500 opacity-70 dark:text-slate-400')}>
            {props.label}
          </span>
        </span>
        <span className={'sticky right-0 ml-auto inline-flex items-center gap-1 bg-inherit pr-1 pl-2'}>
          <Tooltip
            placement={'r'}
            title={props.isLocked ? 'Unlock layer' : 'Lock layer'}
            asChild
          >
            <Button
              type={'button'}
              variant={'ghost'}
              noTooltip
              className={cn(
                'inline-flex size-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50',
                props.isLocked
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'opacity-0 transition-opacity group-hover/tree-row:opacity-100 group-focus-within/tree-row:opacity-100',
              )}
              aria-label={props.isLocked ? 'Unlock layer' : 'Lock layer'}
              onClick={(event) => {
                event.stopPropagation()
                props.onToggleLocked?.()
              }}
            >
              {props.isLocked ? <LuLock size={12}/> : <LuLockOpen size={12}/>}
            </Button>
          </Tooltip>
          <Tooltip
            placement={'r'}
            title={props.isVisible === false ? 'Show layer' : 'Hide layer'}
            asChild
          >
            <Button
              type={'button'}
              variant={'ghost'}
              noTooltip
              className={cn(
                'inline-flex size-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50',
                props.isLocked || props.isVisible === false
                  ? 'text-slate-500 opacity-100 dark:text-slate-400'
                  : 'opacity-0 transition-opacity group-hover/tree-row:opacity-100 group-focus-within/tree-row:opacity-100',
              )}
              aria-label={props.isVisible === false ? 'Show layer' : 'Hide layer'}
              onClick={(event) => {
                event.stopPropagation()
                props.onToggleVisible?.()
              }}
            >
              {props.isVisible === false ? <LuEyeOff size={12}/> : <LuEye size={12}/>}
            </Button>
          </Tooltip>
        </span>
      </div>
    </li>
  )
}