import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from './Icons/LayerIcons.tsx'
import {Fragment, ReactNode} from 'react'
import {NamedIcon} from '../../lib/icon/icon.tsx'
import {I18nHistoryDataItem} from '../../../i18n/type'
import {EditorExecutor} from '../../../hooks/useEditorRuntime.ts'
import {Button, cn} from '@venus/ui'
import {useTranslation} from 'react-i18next'
import {
  CHROME_ICON_BUTTON_DISABLED_CLASS,
  CHROME_ICON_ITEM_CLASS,
  CHROME_ICON_SIZE,
} from '../../editorChrome/chromeIconStyles.ts'

const ShortcutBar: React.FC<{
  executeAction: EditorExecutor
  saveFile: VoidFunction
  needSave: boolean
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
  selectedIds: string[]
}> = ({executeAction, saveFile, needSave, historyStatus, selectedIds}) => {
  const {t} = useTranslation()
  const hasSelection = selectedIds.length > 0

  const actions = [
    {id: 'save', i18nKey: 'saveFile', action: 'saveFile', icon: 'save', disabled: !needSave, divide: true},
    {id: 'undo', i18nKey: 'undo', editorActionCode: 'history-undo', icon: 'undo', disabled: !historyStatus.hasPrev},
    {id: 'redo', i18nKey: 'redo', editorActionCode: 'history-redo', icon: 'redo', disabled: !historyStatus.hasNext, divide: true},
    {
      id: 'delete',
      i18nKey: 'delete',
      editorActionCode: 'element-delete',
      icon: 'trash',
      disabled: !hasSelection,
      divide: true,
    },
    // {id: 'add', icon: 'cross', disabled: false, divide: true},
    {
      id: 'layerUp',
      i18nKey: 'bringForward',
      editorActionCode: 'element-layer',
      editorActionData: 'up',
      icon: 'layers',
      disabled: !hasSelection,
    },
    {
      id: 'layerDown',
      i18nKey: 'sendBackward',
      editorActionCode: 'element-layer',
      editorActionData: 'down',
      icon: 'layers',
      disabled: !hasSelection,
    },
    {
      id: 'layerTop',
      i18nKey: 'bringToFront',
      editorActionCode: 'element-layer',
      editorActionData: 'top',
      icon: 'layers',
      disabled: !hasSelection,
    },
    {
      id: 'layerBottom',
      i18nKey: 'sendToBack',
      editorActionCode: 'element-layer',
      editorActionData: 'bottom',
      icon: 'layers',
      disabled: !hasSelection,
      divide: true,
    },
    /*{id: 'group', icon: 'group', disabled: true},
    {id: 'ungroup', icon: 'ungroup', disabled: true, divide: true},
    {id: 'lock', icon: 'lock', disabled: false},
    {id: 'unlock', icon: 'unlock', disabled: true},*/
  ]

  return <div className={'border-b border-gray-200 bg-white'}>
    <div className={'flex h-10 items-center gap-1 px-3'}>
      {
        Object.values(actions).map((item) => {
          const {id, i18nKey, icon, disabled, divide} = item
          let Icon: ReactNode

          switch (id) {
            case 'layerUp':
              Icon = <LayerUp size={CHROME_ICON_SIZE}/>
              break
            case 'layerDown':
              Icon = <LayerDown size={CHROME_ICON_SIZE}/>
              break
            case 'layerTop':
              Icon = <LayerToTop size={CHROME_ICON_SIZE}/>
              break
            case 'layerBottom':
              Icon = <LayerToBottom size={CHROME_ICON_SIZE}/>
              break
            default:
              Icon = <NamedIcon size={CHROME_ICON_SIZE} iconName={icon!}/>
              break
          }

          const menuText = t(i18nKey, {returnObjects: true}) as I18nHistoryDataItem | string
          const tooltip = typeof menuText === 'string' ? id : menuText.tooltip

          return <Fragment key={id}>
            <Button type={'button'}
                    aria-label={tooltip}
                    disabled={disabled}
                    title={tooltip}
                    onClick={() => {
                      if (item.action === 'saveFile') {
                        saveFile()
                        return
                      }
                      const action = item.editorActionCode || item.action
                      if (action) {
                        if (item.editorActionData) {
                          executeAction(action, item.editorActionData)
                        } else {
                          executeAction(action)
                        }
                      }
                    }}
                    className={cn(
                      CHROME_ICON_ITEM_CLASS,
                      CHROME_ICON_BUTTON_DISABLED_CLASS,
                    )}>
              {Icon}
            </Button>
            {divide && <div className={'mx-1 h-5 w-px bg-gray-200'}></div>}
          </Fragment>
        })
      }
    </div>
  </div>
}
export default ShortcutBar
