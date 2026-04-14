import {type ReactNode, useEffect, useRef, useState} from 'react'
import {Button, Con, Panel} from '@venus/ui'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'
import type {LayerItem} from '../../hooks/useEditorRuntime.types.ts'
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
  LuMinus,
} from 'react-icons/lu'
import {
  EDITOR_TEXT_LABEL_CLASS,
  EDITOR_TEXT_PANEL_BODY_CLASS,
} from '../editorChrome/editorTypography.ts'
import {CHROME_ICON_SIZE} from '../editorChrome/chromeIconStyles.ts'
import {lineSeg} from '../../assets/svg/icons.tsx'

interface LayerPanelProps {
  executeAction: EditorExecutor
  layerItems: LayerItem[]
  selectedIds: string[]
  onMinimize?: VoidFunction
}

const ITEM_HEIGHT = 28
export const LayerPanel = ({executeAction, layerItems, selectedIds, onMinimize}: LayerPanelProps) => {
  const {t} = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [indexRange, setIndexRange] = useState([0, 10])
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)
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
               ? 'cursor-pointer rounded bg-gray-900 text-white'
               : 'cursor-pointer rounded bg-white text-gray-700 hover:bg-gray-100'}
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
                 executeAction('selection-modify', {
                   mode: isToggle ? 'add' : 'replace',
                   idSet: new Set(rangeIds),
                 })
                 setLastClickedId(item.id)
                 return
               }

               executeAction('selection-modify', {
                 mode: isToggle ? 'toggle' : 'replace',
                 idSet: new Set([item.id]),
               })
               setLastClickedId(item.id)
             }}
             id={`layer-element-${item.id}`}
             key={item.id}>
          <div
            style={{
              paddingLeft: 8 + item.depth * 14,
              height: ITEM_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span className={EDITOR_TEXT_LABEL_CLASS} style={{opacity: 0.7, minWidth: 16}}>
              {item.isGroup ? '▾' : '•'}
            </span>
            <span
              aria-label={item.type}
              title={item.type}
              className={'inline-flex size-4 shrink-0 items-center justify-center opacity-75'}
            >
              <LayerTypeIcon type={item.type} isGroup={item.isGroup}/>
            </span>
            <span>{item.name}</span>
          </div>
        </div>,
      )
    }
  }

  return <Con flex={1} minH={0}>
    <Panel head={<PanelHead title="Layer" onMinimize={onMinimize}/>}
           xs>
      <div className={`flex min-h-full flex-col gap-2 rounded bg-gray-50 p-1 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
        <div className={'grid grid-cols-4 gap-1 rounded border border-gray-200 bg-white p-1 shadow-sm'}>
          <LayerActionButton
            title={(t('bringForward', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
            disabled={selectedIds.length === 0}
            onClick={() => executeAction('element-layer', 'up')}
            icon={<LayerUp size={16}/>}
          />
          <LayerActionButton
            title={(t('sendBackward', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
            disabled={selectedIds.length === 0}
            onClick={() => executeAction('element-layer', 'down')}
            icon={<LayerDown size={16}/>}
          />
          <LayerActionButton
            title={(t('bringToFront', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
            disabled={selectedIds.length === 0}
            onClick={() => executeAction('element-layer', 'top')}
            icon={<LayerToTop size={16}/>}
          />
          <LayerActionButton
            title={(t('sendToBack', {returnObjects: true}) as I18nHistoryDataItem).tooltip}
            disabled={selectedIds.length === 0}
            onClick={() => executeAction('element-layer', 'bottom')}
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
    </Panel>
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

function PanelHead(props: {title: string, onMinimize?: VoidFunction}) {
  return (
    <div className={'flex w-full items-center justify-between gap-2'}>
      <span>{props.title}</span>
      {props.onMinimize &&
        <Button
          type="button"
          aria-label={`Minimize ${props.title}`}
          title={`Minimize ${props.title}`}
          className={'bg-amber-600 inline-flex size-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900'}
          onClick={(event) => {
            event.stopPropagation()
            props.onMinimize?.()
          }}
        >
            <span>&minus;</span>
        </Button>}
    </div>
  )
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
