import {type ReactNode, useEffect, useRef, useState} from 'react'
import {Con, Panel} from '@lite-u/ui'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'
import type {LayerItem} from '../../hooks/useEditorRuntime.types.ts'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../header/shortcutBar/Icons/LayerIcons.tsx'
import {useTranslation} from 'react-i18next'
import type {I18nHistoryDataItem} from '../../i18n/type'

interface LayerPanelProps {
  executeAction: EditorExecutor
  layerItems: LayerItem[]
  selectedIds: string[]
}

const ITEM_HEIGHT = 28
export const LayerPanel = ({executeAction, layerItems, selectedIds}: LayerPanelProps) => {
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
             className={selectedIds?.includes(item.id) ? 'bg-gray-400 text-white' : ''}
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
            <span style={{fontSize: 11, opacity: 0.7, minWidth: 16}}>
              {item.isGroup ? '▾' : '•'}
            </span>
            <span style={{fontSize: 11, opacity: 0.65, textTransform: 'uppercase'}}>
              {item.type}
            </span>
            <span>{item.name}</span>
          </div>
        </div>,
      )
    }
  }

  return <Con p={10} h={'33.33%'}>
    <Panel head={'Layer'}
          xs
           contentStyle={{
             overflow: 'hidden',
           }}>
      <Con rela ovh>
        <div className={'flex items-center gap-1 p-1 border border-gray-200 border-b-0'}>
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
             className={'relative scrollbar-custom overflow-x-hidden overflow-y-auto p-2 border h-30 border-gray-200 select-none'}>
          <div className={'absolute z-10 w-full top-0 left-0'} style={{
            height: layerItems.length * ITEM_HEIGHT,
          }}></div>
          <div className={'z-20 w-full sticky top-0 left-0'}>{arr}</div>
        </div>
      </Con>
    </Panel>
  </Con>
}

function LayerActionButton(props: {
  title?: string
  disabled?: boolean
  onClick: VoidFunction
  icon: ReactNode
}) {
  const {title, disabled, onClick, icon} = props
  return (
    <button
      type={'button'}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={'w-6 h-6 inline-flex items-center justify-center rounded-sm hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent'}
    >
      {icon}
    </button>
  )
}
