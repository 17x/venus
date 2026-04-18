import {type ReactNode, useEffect, useRef, useState} from 'react'
import {Button, Con} from '@vector/ui'
import {EditorExecutor} from '../../editor/hooks/useEditorRuntime.ts'
import type {LayerItem} from '../../editor/hooks/useEditorRuntime.types.ts'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../header/shortcutBar/Icons/LayerIcons.tsx'
import {useTranslation} from 'react-i18next'
import type {I18nHistoryDataItem} from '../../i18n/type'
import {
  LuBox,
  LuCircle,
  LuComponent,
  LuFrame,
  LuGroup,
  LuImage,
  LuPentagon,
  LuRectangleHorizontal,
  LuSpline,
  LuStar,
  LuType,
} from 'react-icons/lu'
import {
  EDITOR_TEXT_LABEL_CLASS,
  EDITOR_TEXT_PANEL_BODY_CLASS,
} from '../editorChrome/editorTypography.ts'
import {CHROME_ICON_SIZE} from '../editorChrome/chromeIconStyles.ts'
import {lineSeg} from '../../assets/svg/icons.tsx'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
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
export const LayerPanel = ({
  executeAction,
  layerItems,
  selectedIds,
  onMinimize,
  onReorderLayers,
  onModifySelection,
}: LayerPanelProps) => {
  const {t} = useTranslation()
  const panelTitle = t('inspector.layer.title', 'Layer')
  const scrollRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [indexRange, setIndexRange] = useState([0, 10])
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)
  const reorderLayers = (direction: 'up' | 'down' | 'top' | 'bottom', sourceControl: string) => {
    if (onReorderLayers) {
      onReorderLayers(direction, {
        sourcePanel: 'layer-panel',
        sourceControl,
        commitType: 'final',
      })
      return
    }

    executeAction('element-layer', direction)
  }

  const modifySelection = (
    mode: 'replace' | 'toggle' | 'add',
    ids: string[],
    sourceControl: string,
  ) => {
    if (onModifySelection) {
      onModifySelection(mode, ids, {
        sourcePanel: 'layer-panel',
        sourceControl,
        commitType: 'final',
      })
      return
    }

    executeAction('selection-modify', {
      mode,
      idSet: new Set(ids),
    })
  }
  useEffect(() => {
    /*  const closestOne = selected[selected.length - 1]

      if (closestOne) {
        const idx = elements.findIndex(x => x.id === closestOne)

        scrollRef.current?.scrollTo(0, idx * ITEM_HEIGHT)
        console.log(idx * ITEM_HEIGHT)
      }*/
  }, [layerItems, selectedIds])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const newScrollTop = scrollRef.current.scrollTop
    const scrollUp = newScrollTop < scrollTop
    const startIndex = Math.round(newScrollTop / ITEM_HEIGHT)
    const endIndex = startIndex + 10

    // console.log(newScrollTop)
    if (scrollUp) {
      if (indexRange[0] >= layerItems.length - 1) return
    } else {
      if (indexRange[1] >= layerItems.length - 1) return

    }

    setScrollTop(newScrollTop)
    setIndexRange([startIndex, endIndex])
  }

  const arr = []

  for (let i = indexRange[0]; i < indexRange[1]; i++) {
    const item = layerItems[i]

    if (item) {
      arr.push(
        <div ref={selectedIds?.includes(item.id) ? targetRef : null}
             style={{height: ITEM_HEIGHT}}
             className={selectedIds?.includes(item.id)
               ? `cursor-pointer rounded venus-shell-icon-active text-gray-900 ${EDITOR_TEXT_LABEL_CLASS}`
               : `cursor-pointer rounded bg-white text-gray-700 hover:bg-gray-100 ${EDITOR_TEXT_LABEL_CLASS}`}
             onClick={(event) => {
               const isToggle = event.metaKey || event.ctrlKey
               if (event.shiftKey && lastClickedId) {
                 const currentIndex = layerItems.findIndex((candidate) => candidate.id === item.id)
                 const anchorIndex = layerItems.findIndex((candidate) => candidate.id === lastClickedId)
                 const from = Math.min(currentIndex, anchorIndex)
                 const to = Math.max(currentIndex, anchorIndex)
                 const rangeIds = layerItems
                   .slice(from, to + 1)
                   .map((candidate) => candidate.id)
                 modifySelection(isToggle ? 'add' : 'replace', rangeIds, 'layer-row-range-select')
                 setLastClickedId(item.id)
                 return
               }

               modifySelection(isToggle ? 'toggle' : 'replace', [item.id], 'layer-row-select')
               setLastClickedId(item.id)
             }}
             id={`layer-element-${item.id}`}
             key={item.id}>
          <div
            style={{
              paddingLeft: 8 + item.depth * 14,
              height: ITEM_HEIGHT,
              display: 'grid',
              gridTemplateColumns: '16px 16px minmax(0,1fr)',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span className={EDITOR_TEXT_LABEL_CLASS} style={{opacity: 0.7}}>
              {item.isGroup ? '▾' : '•'}
            </span>
            <span
              aria-label={item.type}
              title={item.type}
              className={'inline-flex size-4 shrink-0 items-center justify-start opacity-75'}
            >
              <LayerTypeIcon type={item.type} isGroup={item.isGroup}/>
            </span>
            <span className={'truncate'}>{item.name}</span>
          </div>
        </div>,
      )
    }
  }

  return <Con flex={1} minH={0}>
    <section className={'venus-ui-font flex h-full w-full min-h-0 flex-col overflow-hidden text-slate-950'} role={'region'}>
      <div className={'mb-2 flex items-center justify-between gap-2 p-1 text-xs text-slate-900'}>
        <h2 data-testid={TEST_IDS.layerPanel.heading} className={'font-semibold'}>{panelTitle}</h2>
        {onMinimize &&
          <Button
            type="button"
            aria-label={t('inspector.minimizePanel', {title: panelTitle, defaultValue: `Minimize ${panelTitle}`})}
            title={t('inspector.minimizePanel', {title: panelTitle, defaultValue: `Minimize ${panelTitle}`})}
            className={'inline-flex size-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900'}
            onClick={(event) => {
              event.stopPropagation()
              onMinimize?.()
            }}
          >
            <span>&minus;</span>
          </Button>}
      </div>
      <div className={'scrollbar-custom min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1 pb-1'}>
        <div className={`flex min-h-full flex-col gap-2 rounded bg-gray-50 p-1 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
        <div className={'grid grid-cols-4 gap-1 rounded border border-gray-200 bg-white p-1 shadow-sm'}>
          <LayerActionButton
            title={(t('bringForward', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
            disabled={selectedIds.length === 0}
            onClick={() => reorderLayers('up', 'bring-forward')}
            icon={<LayerUp size={16}/>}
          />
          <LayerActionButton
            title={(t('sendBackward', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
            disabled={selectedIds.length === 0}
            onClick={() => reorderLayers('down', 'send-backward')}
            icon={<LayerDown size={16}/>}
          />
          <LayerActionButton
            title={(t('bringToFront', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
            disabled={selectedIds.length === 0}
            onClick={() => reorderLayers('top', 'bring-to-front')}
            icon={<LayerToTop size={16}/>}
          />
          <LayerActionButton
            title={(t('sendToBack', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
            disabled={selectedIds.length === 0}
            onClick={() => reorderLayers('bottom', 'send-to-back')}
            icon={<LayerToBottom size={16}/>}
          />
        </div>
        <div ref={scrollRef}
             onScroll={handleScroll}
             className={'relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded border border-gray-200 bg-white p-1 select-none'}>
          <div className={'absolute z-10 w-full top-0 left-0'} style={{
            height: layerItems.length * ITEM_HEIGHT,
          }}></div>
          <div className={'z-20 flex w-full flex-col gap-1 sticky top-0 left-0'}>{arr}</div>
        </div>
      </div>
      </div>
    </section>
  </Con>
}

function LayerTypeIcon(props: {type: string, isGroup?: boolean}) {
  if (props.isGroup || props.type === 'group') {
    return <LuGroup size={CHROME_ICON_SIZE}/>
  }

  switch (props.type) {
    case 'frame':
      return <LuFrame size={CHROME_ICON_SIZE}/>
    case 'rectangle':
      return <LuRectangleHorizontal size={CHROME_ICON_SIZE}/>
    case 'ellipse':
      return <LuCircle size={CHROME_ICON_SIZE}/>
    case 'polygon':
      return <LuPentagon size={CHROME_ICON_SIZE}/>
    case 'star':
      return <LuStar size={CHROME_ICON_SIZE}/>
    case 'lineSegment':
      return lineSeg(CHROME_ICON_SIZE)
    case 'path':
      return <LuSpline size={CHROME_ICON_SIZE}/>
    case 'text':
      return <LuType size={CHROME_ICON_SIZE}/>
    case 'image':
      return <LuImage size={CHROME_ICON_SIZE}/>
    case 'box':
      return <LuBox size={CHROME_ICON_SIZE}/>
    default:
      return <LuComponent size={CHROME_ICON_SIZE}/>
  }
}

function LayerActionButton(props: {
  title?: string
  disabled?: boolean
  onClick: VoidFunction
  icon: ReactNode
}) {
  const {title, disabled, onClick, icon} = props
  return (
    <Button
      type={'button'}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={'inline-flex h-7 w-full items-center justify-center rounded border border-transparent bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-gray-50'}
    >
      {icon}
    </Button>
  )
}
