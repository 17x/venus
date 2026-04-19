import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, cn} from '@vector/ui'
import {useEffect, useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {LuMenu} from 'react-icons/lu'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../header/shortcutBar/Icons/LayerIcons.tsx'
import type {MenuItemType} from '../header/menu/type'
import {EDITOR_TEXT_LABEL_CLASS} from '../editorChrome/editorTypography.ts'
import {SIDEBAR_ICON_SIZE} from './LeftSidebarShared.tsx'

interface LeftSidebarMenuProps {
  topMenuActions: MenuItemType[]
  onExecuteMenuAction: (menuItem: MenuItemType) => void
  compact?: boolean
}

export function LeftSidebarMenu(props: LeftSidebarMenuProps) {
  const {t} = useTranslation()
  const menuRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        menuRootRef.current?.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')?.focus()
      }
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const renderTopMenuNodes = (menuItems: MenuItemType[]) => {
    return menuItems.map((menuItem) => {
      const hasChildren = !!menuItem.children?.length
      const label = t(menuItem.id + '.label')
      const tooltip = t(menuItem.id + '.tooltip', {defaultValue: label})
      const icon = resolveMenuIcon(menuItem.icon ?? menuItem.id)

      return (
        <>
          {menuItem.divide && <DropdownMenuSeparator/>}
          {hasChildren
            ? <DropdownMenuSub key={`sub-${menuItem.id}`}>
                <DropdownMenuSubTrigger disabled={menuItem.disabled} className={EDITOR_TEXT_LABEL_CLASS}>
                  <span className={'inline-flex items-center gap-2'}>
                    {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
                    <span>{label}</span>
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={'min-w-40'}>
                  {renderTopMenuNodes(menuItem.children ?? [])}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            : <DropdownMenuItem
                key={`item-${menuItem.id}`}
                disabled={menuItem.disabled}
                onClick={() => {
                  props.onExecuteMenuAction(menuItem)
                }}
                title={tooltip}
                className={EDITOR_TEXT_LABEL_CLASS}
              >
                <span className={'inline-flex items-center gap-2'}>
                  {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
                  <span>{label}</span>
                </span>
              </DropdownMenuItem>}
        </>
      )
    })
  }

  return (
    <div ref={menuRootRef} className={cn('relative flex w-full justify-center',
    //  props.compact ? 'mb-0 pb-0' : 'mb-1 pb-2'
     )}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('ui.shell.variantB.nav.mainMenu', {defaultValue: 'Main menu'})}
          title={t('ui.shell.variantB.nav.mainMenu', {defaultValue: 'Main menu'})}
          className={cn(
            'inline-flex items-center justify-center rounded text-slate-700 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-600 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800',
            props.compact ? 'size-8' : 'size-8',
          )}
        >
          <LuMenu size={SIDEBAR_ICON_SIZE}/>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={'start'} side={'right'} sideOffset={8} className={'min-w-40'}>
          {props.topMenuActions.map((menu) => {
            return <DropdownMenuSub key={menu.id}>
              <DropdownMenuSubTrigger disabled={menu.disabled} className={EDITOR_TEXT_LABEL_CLASS}>
                {t(menu.id + '.label')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className={'min-w-40'}>
                {renderTopMenuNodes(menu.children ?? [])}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

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