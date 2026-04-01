import {Con, Drop, useNotification} from '@lite-u/ui'
import readImageHelper from '../utilities/readImageHelper.ts'
import {FC, ReactNode, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {EditorExecutor} from '../hooks/useEditorRuntime.ts'

const FileReceiver: FC<{ children: ReactNode, executeAction: EditorExecutor }> = ({children, executeAction}) => {
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
                   executeAction('drop-image', {position: {x: e.clientX, y: e.clientY}, assets: [newAsset]})
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
