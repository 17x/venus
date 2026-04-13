import {FC, useEffect, useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {I18nHistoryDataItem} from '../../i18n/type'
import {Button, Con, MenuItem, Panel} from '@venus/ui'
import {LuMinus} from 'react-icons/lu'
import {EDITOR_TEXT_PANEL_BODY_CLASS} from '../editorChrome/editorTypography.ts'

interface HistoryItem {
  id: number
  data?: {
    type: string
  }
  label?: string
}

interface HistoryStatus {
  id: number
  hasPrev: boolean
  hasNext: boolean
}

export const HistoryPanel: FC<{
  historyItems: HistoryItem[]
  historyStatus: HistoryStatus
  pickHistory: (historyNode: HistoryItem) => void
  onMinimize?: VoidFunction
}> = ({historyItems, historyStatus, pickHistory, onMinimize}) => {
  const {t} = useTranslation()
  const targetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    targetRef.current?.scrollIntoView({block: 'nearest'})
  }, [historyItems, historyStatus])

  return <Con fh ovh flex={1} minH={0}>
    <Panel xs head={<PanelHead title="History" onMinimize={onMinimize}/>}>
      <div className={`flex min-h-full flex-col gap-1 rounded bg-gray-50 p-1 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
        {
          historyItems.map((historyNode) => {
              const isCurr = historyNode.id === historyStatus.id
              const historyType = historyNode.data?.type ?? 'unknown'
              const prefixI18NKey = 'history.' + historyType
              const translated = t(prefixI18NKey, {returnObjects: true}) as I18nHistoryDataItem | string
              const fallbackLabel = historyNode.label ?? historyType
              const label = typeof translated === 'string' ? fallbackLabel : (translated.label || fallbackLabel)
              const tooltip = typeof translated === 'string' ? fallbackLabel : (translated.tooltip || fallbackLabel)

              return <MenuItem xs
                               ref={isCurr ? targetRef : null}
                               title={tooltip}
                               key={historyNode.id}
                               aria-current={isCurr ? 'step' : undefined}
                               className={isCurr
                                 ? 'justify-start rounded bg-gray-900 px-2 text-white hover:bg-gray-900'
                                 : 'justify-start rounded bg-white px-2 text-gray-700 hover:bg-gray-100'}
                               onClick={() => {
                                 if (isCurr) return
                                 pickHistory(historyNode)
                               }}>{label}</MenuItem>
            },
          )
        }
      </div>
    </Panel>
  </Con>
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
          className={'inline-flex size-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900'}
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
