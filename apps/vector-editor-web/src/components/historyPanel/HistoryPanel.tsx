import {FC, useEffect, useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {I18nHistoryDataItem} from '../../i18n/type'
import {Col, Con, MenuItem, Panel} from '@lite-u/ui'

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
}> = ({historyItems, historyStatus, pickHistory}) => {
  const {t} = useTranslation()
  const targetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (targetRef.current) {

      return () => {

      }
    }
  }, [historyItems, historyStatus])

  return <Con fh ovh p={10} h={'33.33%'}>
    <Panel xs head={'History'}
           headStyle={{
             backgroundColor: '#1f4273',
           }}
           contentStyle={{
             overflow: 'hidden',
           }}>
      <Con fh ovh>
        <Con fh className={'border border-gray-400 overflow-x-hidden scrollbar-custom overflow-y-auto'}>
          <Col fh p={10} minH={40} className={'bg-gray-100'} style={{
            // boxShadow: 'inset 0 0 3px 1px #000',
          }}>
            {
              historyItems.map((historyNode, index) => {
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
                                   key={index}
                                   onClick={() => {
                                     if (isCurr) return
                                     // console.log(historyNode.id)
                                     pickHistory(historyNode)
                                     // applyHistoryNode(historyNode)
                                   }}
                                   style={{
                                     width: '100%',
                                     backgroundColor: isCurr ? 'gray' : 'white',
                                   }}>{label}</MenuItem>
                },
              )
            }
          </Col>
        </Con></Con>
    </Panel>
  </Con>
}
