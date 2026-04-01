import {FC, useEffect, useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {I18nHistoryDataItem} from '../../i18n/type'
import {Col, Con, MenuItem, Panel} from '@lite-u/ui'
import {WorkSpaceStateType} from '../../contexts/workspaceContext/reducer/reducer.ts'

export const HistoryPanel: FC<{
  historyArray: WorkSpaceStateType['historyArray']
  historyStatus: WorkSpaceStateType['historyStatus']
  pickHistory: (historyNode: WorkSpaceStateType['historyArray'][number]) => void
}> = ({historyArray, historyStatus, pickHistory}) => {
  const {t} = useTranslation()
  const targetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (targetRef.current) {

      return () => {

      }
    }
  }, [historyArray, historyStatus])

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
              historyArray.map((historyNode, index) => {
                  const isCurr = historyNode.id === historyStatus.id
                  const prefixI18NKey = 'history.' + historyNode.data.type
                  const {label, tooltip} = t(prefixI18NKey, {returnObjects: true}) as I18nHistoryDataItem

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
