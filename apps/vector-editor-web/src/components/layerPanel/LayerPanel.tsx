import {useEffect, useRef, useState} from 'react'
import {Con, Panel} from '@lite-u/ui'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'

interface LayerPanelProps {
  executeAction: EditorExecutor
  layerItems: { id: string, name: string, show: boolean }[]
  selectedIds: string[]
}

const ITEM_HEIGHT = 28
export const LayerPanel = ({executeAction, layerItems, selectedIds}: LayerPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [indexRange, setIndexRange] = useState([0, 10])
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
             onClick={() => {
               executeAction('selection-modify', {mode: 'replace', idSet: new Set([item.id])})
             }}
             id={`layer-element-${item.id}`}
             key={item.id}>
          {/*{item.id.match(/\d+$/)[0]}*/}
          {item.name}
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
