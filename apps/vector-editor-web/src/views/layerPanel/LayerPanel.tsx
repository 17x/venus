import {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Button, Con, Tooltip} from '../../ui/index.ts'
import type {EditorExecutor, LayerItem} from '../../runtime/useEditorRuntime/types.ts'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../header/shortcutBar/Icons/LayerIcons.tsx'
import {useTranslation} from 'react-i18next'
import type {I18nHistoryDataItem} from '../../i18n/type'
import {
  LuBox, LuChevronRight, LuCircle, LuComponent, LuEye, LuEyeOff,
  LuFrame, LuGroup, LuImage, LuLock, LuLockOpen, LuPentagon,
  LuRectangleHorizontal, LuSpline, LuStar, LuType,
} from 'react-icons/lu'
import {EDITOR_TEXT_LABEL_CLASS, EDITOR_TEXT_PANEL_BODY_CLASS} from '../editorChrome/editorTypography.ts'
import {CHROME_ICON_SIZE} from '../editorChrome/chromeIconStyles.ts'
import {lineSeg} from '../../assets/svg/icons.tsx'
import type {ShellCommandMeta} from '../../runtime/shell/commands/shellCommandRegistry.ts'
import {TEST_IDS} from '../../testing/testIds.ts'

interface LayerPanelProps {
  executeAction: EditorExecutor
  layerItems: LayerItem[]
  selectedIds: string[]
  onMinimize?: VoidFunction
  onReorderLayers?: (direction: 'up' | 'down' | 'top' | 'bottom', meta: ShellCommandMeta) => void
  onModifySelection?: (mode: 'replace' | 'toggle' | 'add', ids: string[], meta: ShellCommandMeta) => void
}

const ITEM_HEIGHT = 28
/** Pixels per nesting level — aligns child toggle with parent icon left edge. */
const INDENT_PER_LEVEL = 20
const ACTIONS_WIDTH = 44

export const LayerPanel = ({
  executeAction, layerItems, selectedIds, onMinimize, onReorderLayers, onModifySelection,
}: LayerPanelProps) => {
  const {t} = useTranslation()
  const panelTitle = t('inspector.layer.title', 'Layer')
  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingScrollTopRef = useRef(0)
  const scrollFrameRef = useRef<number | null>(null)
  const [indexRange, setIndexRange] = useState([0, 20])
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  // ---- Tree: ancestor lookup ----
  const ancestorMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const stack: {id: string; depth: number}[] = []
    for (const item of layerItems) {
      while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) stack.pop()
      map.set(item.id, new Set(stack.map((s) => s.id)))
      if (item.isGroup) stack.push({id: item.id, depth: item.depth})
    }
    return map
  }, [layerItems])

  // ---- Collapse filter ----
  const visibleItems = useMemo(() => {
    const result: LayerItem[] = []
    for (const item of layerItems) {
      const ancestors = ancestorMap.get(item.id)
      if (ancestors) {
        let hidden = false
        for (const aid of ancestors) { if (collapsedIds.has(aid)) { hidden = true; break } }
        if (hidden) continue
      }
      result.push(item)
    }
    return result
  }, [layerItems, collapsedIds, ancestorMap])

  const toggleCollapse = useCallback((groupId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      next.has(groupId) ? next.delete(groupId) : next.add(groupId)
      return next
    })
  }, [])

  const maxDepth = useMemo(() => {
    let m = 0
    for (const item of visibleItems) { if (item.depth > m) m = item.depth }
    return m
  }, [visibleItems])

  // ---- Actions ----
  const reorderLayers = (direction: 'up' | 'down' | 'top' | 'bottom', sourceControl: string) => {
    if (onReorderLayers) {
      onReorderLayers(direction, {sourcePanel: 'layer-panel', sourceControl, commitType: 'final'})
      return
    }
    executeAction('element-layer', direction)
  }

  const modifySelection = (mode: 'replace' | 'toggle' | 'add', ids: string[], sourceControl: string) => {
    if (onModifySelection) {
      onModifySelection(mode, ids, {sourcePanel: 'layer-panel', sourceControl, commitType: 'final'})
      return
    }
    executeAction('selection-modify', {mode, idSet: new Set(ids)})
  }

  // ---- Virtual scroll ----
  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current)
        scrollFrameRef.current = null
      }
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    pendingScrollTopRef.current = scrollRef.current.scrollTop
    if (scrollFrameRef.current !== null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      const st = pendingScrollTopRef.current
      const start = Math.max(0, Math.min(Math.floor(st / ITEM_HEIGHT), visibleItems.length - 1))
      const end = Math.min(visibleItems.length, start + 30)
      setIndexRange((prev) => (prev[0] === start && prev[1] === end ? prev : [start, end]))
    })
  }, [visibleItems.length])

  // ---- Row rendering ----
  const rows: ReactNode[] = []
  const rowMinWidth = 160 + maxDepth * INDENT_PER_LEVEL + ACTIONS_WIDTH

  for (let i = indexRange[0]; i < indexRange[1]; i++) {
    const item = visibleItems[i]
    if (!item) continue

    const isSelected = selectedIdSet.has(item.id)
    const isCollapsed = item.isGroup && collapsedIds.has(item.id)
    const rowBg = isSelected
      ? 'bg-slate-100 dark:bg-slate-800'
      : 'bg-white dark:bg-slate-900'
    const rowText = isSelected
      ? 'text-slate-900 dark:text-slate-50'
      : 'text-slate-700 dark:text-slate-200'

    rows.push(
      <div
        key={item.id}
        id={`layer-element-${item.id}`}
        style={{height: ITEM_HEIGHT, minWidth: `max(100%, ${rowMinWidth}px)`}}
        className={`relative flex cursor-pointer rounded ${rowBg} ${rowText} ${EDITOR_TEXT_LABEL_CLASS}`}
        onClick={(event) => {
          const isToggle = event.metaKey || event.ctrlKey
          if (event.shiftKey && lastClickedId) {
            const ci = visibleItems.findIndex((c) => c.id === item.id)
            const ai = visibleItems.findIndex((c) => c.id === lastClickedId)
            const from = Math.min(ci, ai)
            const to = Math.max(ci, ai)
            const rangeIds = visibleItems.slice(from, to + 1).map((c) => c.id)
            modifySelection(isToggle ? 'add' : 'replace', rangeIds, 'layer-row-range-select')
            setLastClickedId(item.id)
            return
          }
          modifySelection(isToggle ? 'toggle' : 'replace', [item.id], 'layer-row-select')
          setLastClickedId(item.id)
        }}
      >
        {/* Tree content: toggle → icon → name */}
        <div
          className="flex min-w-0 flex-1 items-center h-full"
          style={{paddingLeft: 8 + item.depth * INDENT_PER_LEVEL}}
        >
          {/* Toggle / dot */}
          {item.isGroup ? (
            <button type="button"
              className="inline-flex size-4 shrink-0 items-center justify-center opacity-60 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); toggleCollapse(item.id) }}
              title={isCollapsed ? 'Expand' : 'Collapse'}>
              <LuChevronRight size={12} style={{
                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                transition: 'transform 0.15s',
              }} />
            </button>
          ) : (
            <span className="inline-flex size-4 shrink-0 items-center justify-center opacity-30" style={{fontSize: 8}}>•</span>
          )}
          {/* Type icon */}
          <span className="inline-flex size-4 shrink-0 items-center justify-start opacity-75 ml-0.5" title={item.type}>
            <LayerTypeIcon type={item.type} isGroup={item.isGroup} />
          </span>
          {/* Name */}
          <span className="truncate ml-0.5">{item.name}</span>
        </div>

        {/* Sticky action buttons stay inside the visible row viewport during horizontal scroll. */}
        <div
          className="sticky right-0 z-10 ml-auto flex h-full shrink-0 items-center justify-end gap-0.5 bg-inherit pr-1 pl-1"
          style={{width: ACTIONS_WIDTH}}
        >
          <Tooltip title={item.isVisible !== false ? 'Visible' : 'Hidden'}>
            <button type="button"
              className="inline-flex size-4 items-center justify-center opacity-60 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); executeAction('element-modify', [{id: item.id, props: {show: item.isVisible === false}}]) }}>
              {item.isVisible !== false ? <LuEye size={12} /> : <LuEyeOff size={12} />}
            </button>
          </Tooltip>
          <Tooltip title={item.isLocked ? 'Locked' : 'Unlocked'}>
            <button type="button"
              className="inline-flex size-4 items-center justify-center opacity-60 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); executeAction('element-modify', [{id: item.id, props: {locked: !item.isLocked}}]) }}>
              {item.isLocked ? <LuLock size={12} /> : <LuLockOpen size={12} />}
            </button>
          </Tooltip>
        </div>
      </div>,
    )
  }

  // ---- Total height for virtual scroll spacer ----
  const totalHeight = visibleItems.length * ITEM_HEIGHT

  return (
    <Con flex={1} minH={0}>
      <section className="flex h-full w-full min-h-0 flex-col overflow-hidden text-[12px] leading-[18px] text-slate-950 dark:text-slate-100" role="region">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between gap-2 p-1 text-xs text-slate-900">
          <h2 data-testid={TEST_IDS.layerPanel.heading} className="font-semibold">{panelTitle}</h2>
          {onMinimize && (
            <Button type="button"
              aria-label={t('inspector.minimizePanel', {title: panelTitle, defaultValue: `Minimize ${panelTitle}`})}
              title={t('inspector.minimizePanel', {title: panelTitle, defaultValue: `Minimize ${panelTitle}`})}
              className="inline-flex size-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              onClick={(e) => { e.stopPropagation(); onMinimize?.() }}>
              <span>&minus;</span>
            </Button>
          )}
        </div>

        {/* Layer list area */}
        <div className={`scrollbar-custom min-h-0 flex-1 overflow-y-auto overflow-x-auto px-1 pb-1 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
          <div className="flex min-h-full flex-col gap-2 rounded bg-slate-50 p-1 dark:bg-slate-950">
            {/* Arrange buttons */}
            <div className="grid grid-cols-4 gap-1 rounded bg-white p-1 dark:bg-slate-900">
              <LayerActionButton title={(t('bringForward', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
                disabled={selectedIds.length === 0} onClick={() => reorderLayers('up', 'bring-forward')}
                icon={<LayerUp size={16} />} />
              <LayerActionButton title={(t('sendBackward', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
                disabled={selectedIds.length === 0} onClick={() => reorderLayers('down', 'send-backward')}
                icon={<LayerDown size={16} />} />
              <LayerActionButton title={(t('bringToFront', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
                disabled={selectedIds.length === 0} onClick={() => reorderLayers('top', 'bring-to-front')}
                icon={<LayerToTop size={16} />} />
              <LayerActionButton title={(t('sendToBack', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
                disabled={selectedIds.length === 0} onClick={() => reorderLayers('bottom', 'send-to-back')}
                icon={<LayerToBottom size={16} />} />
            </div>

            {/* Virtualized tree list */}
            <div ref={scrollRef} onScroll={handleScroll}
              className="relative min-h-0 flex-1 select-none overflow-y-auto overflow-x-auto rounded bg-white p-1 dark:bg-slate-900">
              {/* Virtual height spacer */}
              <div className="absolute z-10 top-0 left-0" style={{width: 1, height: totalHeight}} />
              {/* Visible rows */}
              <div className="sticky top-0 z-20 flex min-w-full flex-col gap-1">
                {rows}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Con>
  )
}

// ---- Layer type icon ----
function LayerTypeIcon(props: {type: string; isGroup?: boolean}) {
  if (props.isGroup || props.type === 'group') return <LuGroup size={CHROME_ICON_SIZE} />
  switch (props.type) {
    case 'frame': return <LuFrame size={CHROME_ICON_SIZE} />
    case 'rectangle': return <LuRectangleHorizontal size={CHROME_ICON_SIZE} />
    case 'ellipse': return <LuCircle size={CHROME_ICON_SIZE} />
    case 'polygon': return <LuPentagon size={CHROME_ICON_SIZE} />
    case 'star': return <LuStar size={CHROME_ICON_SIZE} />
    case 'lineSegment': return lineSeg(CHROME_ICON_SIZE)
    case 'path': return <LuSpline size={CHROME_ICON_SIZE} />
    case 'text': return <LuType size={CHROME_ICON_SIZE} />
    case 'image': return <LuImage size={CHROME_ICON_SIZE} />
    case 'box': return <LuBox size={CHROME_ICON_SIZE} />
    default: return <LuComponent size={CHROME_ICON_SIZE} />
  }
}

// ---- Arrange action button ----
function LayerActionButton(props: {title?: string; disabled?: boolean; onClick: () => void; icon: ReactNode}) {
  return (
    <Button type="button" variant="ghost" size="sm"
      title={props.title} disabled={props.disabled}
      className="size-7 text-slate-600 disabled:opacity-30 dark:text-slate-300"
      onClick={(e) => { e.stopPropagation(); props.onClick() }}>
      {props.icon}
    </Button>
  )
}
