import {Con, Drop, useNotification} from '@vector/ui'
import readImageHelper from '../shared/utilities/readImageHelper.ts'
import {FC, ReactNode, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {EditorExecutor} from '../editor/hooks/useEditorRuntime.ts'

const FileReceiver: FC<{
  children: ReactNode
  executeAction: EditorExecutor
  resolveDropPosition?: (clientX: number, clientY: number) => {x: number; y: number}
}> = ({children, executeAction, resolveDropPosition}) => {
  const [showDropNotice, setShowDropNotice] = useState(false)
  const [dropNoticeColor, setDropNoticeColor] = useState('green')
  const {add} = useNotification()
  const {t} = useTranslation()

  return <Drop accepts={['image/*']}
               style={{position: 'relative'}}
               onDragIsOver={(v) => {
                 setDropNoticeColor(v ? 'green' : 'red')
                 setShowDropNotice(true)
               }}
               onDragIsLeave={() => {
                 setShowDropNotice(false)
               }}
               onDrop={(e) => {
                 setShowDropNotice(false)

                 readImageHelper(e.dataTransfer.files[0]).then(newAsset => {
                   const position = resolveDropPosition
                     ? resolveDropPosition(e.clientX, e.clientY)
                     : {x: e.clientX, y: e.clientY}
                   executeAction('drop-image', {position, assets: [newAsset]})
                 }).catch(() => {
                   add(t('misc.imageResolveFailed'), 'info')
                 })
               }}>
    {children}
    {
      showDropNotice && <Con fw fh abs t={0} l={0} borderColor={dropNoticeColor} style={{
        border: '5px solid',
        pointerEvents: 'none',
      }}></Con>
    }
  </Drop>
}
export default FileReceiver
