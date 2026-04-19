import React from 'react'
import {useTranslation} from 'react-i18next'
import {createHeaderMenuData} from './menuData.ts'
import {EditorExecutor} from '../../../editor/hooks/useEditorRuntime.ts'
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  useTheme,
} from '@vector/ui'
import {EDITOR_TEXT_MENU_CLASS} from '../../editorChrome/editorTypography.ts'
import type {MenuItemType} from './type'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../shortcutBar/Icons/LayerIcons.tsx'

const MenuBar: React.FC<{
  executeAction: EditorExecutor
  selectedIds: string[]
  copiedCount: number
  needSave: boolean
  historyStatus: {
    hasPrev: boolean
    hasNext: boolean
  }
}> = ({executeAction, selectedIds, copiedCount, needSave, historyStatus}) => {
  const {t, i18n} = useTranslation()
  const {mode, setMode} = useTheme()
  const actions = createHeaderMenuData({
    selectedIds,
    copiedCount,
    needSave,
    historyStatus,
    language: i18n.language === 'zh-CN' ? 'cn' : (i18n.language as 'en' | 'cn' | 'jp'),
    canToggleGrid: false,
    canToggleSnapping: false,
    themeMode: mode,
  })

  const handleCustomAction = (menuItem: {id: string}) => {
    switch (menuItem.id) {
      case 'languageEnglish':
        i18n.changeLanguage('en')
        return true
      case 'languageChinese':
        i18n.changeLanguage('zh-CN')
        return true
      case 'languageJapanese':
        i18n.changeLanguage('jp')
        return true
      case 'themeSystem':
        setMode('system')
        return true
      case 'themeLight':
        setMode('light')
        return true
      case 'themeDark':
        setMode('dark')
        return true
      default:
        return false
    }
  }

  const handleMenuAction = (menuItem: MenuItemType) => {
    if (menuItem.disabled) {
      return
    }

    if (handleCustomAction(menuItem)) {
      return
    }

    // Header menu rows can map to explicit runtime actions; fall back to legacy id dispatch.
    const action = menuItem.editorActionCode ?? menuItem.action ?? menuItem.id
    if (menuItem.editorActionData) {
      executeAction(action, menuItem.editorActionData)
      return
    }
    executeAction(action)
  }

  const renderMenuNodes = (items: MenuItemType[]) => {
    return items.map((menuItem) => {
      const hasChildren = !!menuItem.children?.length
      const label = t(menuItem.id + '.label')
      const tooltip = t(menuItem.id + '.tooltip', {defaultValue: label})
      const icon = resolveMenuIcon(menuItem.icon ?? menuItem.id)

      return (
        <React.Fragment key={menuItem.id}>
          {menuItem.divide && <DropdownMenuSeparator/>}
          {hasChildren
            ? <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={menuItem.disabled} className={cn('venus-ui-menu-item', EDITOR_TEXT_MENU_CLASS)}>
                  <span className={'inline-flex items-center gap-2'}>
                    {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
                    <span>{label}</span>
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={'min-w-50'}>
                  {renderMenuNodes(menuItem.children ?? [])}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            : <DropdownMenuItem
                disabled={menuItem.disabled}
                onClick={() => {
                  handleMenuAction(menuItem)
                }}
                title={tooltip}
                className={cn('venus-ui-menu-item', EDITOR_TEXT_MENU_CLASS)}
              >
                <span className={'inline-flex items-center gap-2'}>
                  {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
                  <span>{label}</span>
                </span>
              </DropdownMenuItem>}
        </React.Fragment>
      )
    })
  }

  return <div className={cn('venus-shell-menu h-9 select-none border-b px-2 py-1', EDITOR_TEXT_MENU_CLASS)}>
    <div className={'flex h-full items-center gap-1'}>
      {
        actions.map((menu) => {
          return <DropdownMenu key={menu.id}>
            <DropdownMenuTrigger
              className={cn(
                'venus-shell-menu-button venus-shell-focusable inline-flex h-full items-center rounded px-3 font-medium',
                'data-[state=open]:venus-shell-menu-button-active',
                EDITOR_TEXT_MENU_CLASS,
              )}
              title={t(menu.id + '.tooltip', {defaultValue: t(menu.id + '.label')})}
            >
              <span>{t(menu.id + '.label')}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={'start'} sideOffset={4} className={'min-w-50'}>
              {renderMenuNodes(menu.children ?? [])}
            </DropdownMenuContent>
          </DropdownMenu>
        })
      }
    </div>
  </div>
}

export default MenuBar

function resolveMenuIcon(icon: string) {
  switch (icon) {
    case 'layerUp':
      return <LayerUp size={14}/>
    case 'layerDown':
      return <LayerDown size={14}/>
    case 'layerTop':
      return <LayerToTop size={14}/>
    case 'layerBottom':
      return <LayerToBottom size={14}/>
    default:
      return null
  }
}
