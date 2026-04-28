import React, {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {LuChevronRight} from 'react-icons/lu'
import {createPortal} from 'react-dom'
import {EditorExecutor} from '../../../editor/hooks/useEditorRuntime.ts'
import {MenuItemType} from './type'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../shortcutBar/Icons/LayerIcons.tsx'
import {cn} from '@vector/ui'
import {EDITOR_TEXT_MENU_CLASS} from '../../editorChrome/editorTypography.ts'

interface MenuItemProps {
  menu: MenuItemType
  executeAction: EditorExecutor
  onActionComplete?: VoidFunction
  onCustomAction?: (menu: MenuItemType) => boolean
}

const MenuItem: React.FC<MenuItemProps> = ({
                                             menu,
                                             executeAction,
                                             onActionComplete,
                                             onCustomAction,
                                           }) => {
  const {t} = useTranslation()
  const [subOpen, setSubOpen] = useState<boolean>(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const [submenuPosition, setSubmenuPosition] = useState({left: 0, top: 0})

  const handleClick = () => {
    if (menu.disabled) {
      return
    }
    if (hasChildren) {
      setSubOpen(true)
      return
    }
    if (onCustomAction?.(menu)) {
      onActionComplete?.()
      setSubOpen(false)
      return
    }
    // Menu rows can map to explicit runtime actions; fall back to legacy id dispatch.
    const action = menu.editorActionCode ?? menu.action ?? menu.id
    if (menu.editorActionData) {
      executeAction(action, menu.editorActionData)
    } else {
      executeAction(action)
    }
    onActionComplete?.()
    setSubOpen(false)
  }

  const hasChildren = menu.children && menu.children!.length > 0
  const icon = menu.icon ?? menu.id

  useEffect(() => {
    if (!subOpen || !hasChildren || !rowRef.current) {
      return
    }

    const updateSubmenuPosition = () => {
      const rect = rowRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }
      setSubmenuPosition({
        left: rect.right + 6,
        top: rect.top,
      })
    }

    updateSubmenuPosition()
    window.addEventListener('resize', updateSubmenuPosition)
    window.addEventListener('scroll', updateSubmenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateSubmenuPosition)
      window.removeEventListener('scroll', updateSubmenuPosition, true)
    }
  }, [hasChildren, subOpen])

  const handlePointerLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null
    if (!nextTarget) {
      setSubOpen(false)
      return
    }
    if (rowRef.current?.contains(nextTarget) || submenuRef.current?.contains(nextTarget)) {
      return
    }
    setSubOpen(false)
  }

  return <div ref={rowRef} className={cn(
    'relative min-w-50 cursor-pointer rounded px-1',
    menu.disabled && 'cursor-not-allowed opacity-40',
  )}
              onClick={() => handleClick()}
              onMouseEnter={(e) => {
                if (menu.disabled) {
                  return
                }
                if (hasChildren) {
                  setSubOpen(true)
                }
                e.preventDefault()
              }}
              onMouseLeave={handlePointerLeave}
  >
    <div className={cn(
      'venus-ui-menu-item flex h-8 w-full items-center justify-between whitespace-nowrap rounded px-3',
      EDITOR_TEXT_MENU_CLASS,
      hasChildren && subOpen && 'venus-shell-menu-button-active',
    )}>
      <span className={'inline-flex items-center gap-2'}>
        <span className={'inline-flex opacity-80'}>{resolveMenuIcon(icon)}</span>
        <span title={t(menu.id + '.tooltip', {defaultValue: t(menu.id + '.label')})}>{t(menu.id + '.label')}</span>
      </span>
      {hasChildren && <LuChevronRight size={18}/>}

    </div>
    {hasChildren && subOpen && typeof document !== 'undefined' && createPortal(
      <div
        ref={submenuRef}
        className={'venus-shell-panel fixed z-[1000] w-auto min-w-50 overflow-visible rounded border py-1 shadow-lg'}
        style={{left: submenuPosition.left, top: submenuPosition.top}}
        onMouseLeave={handlePointerLeave}
      >
        {menu.children!.map((subItem) => (
          <MenuItem
            menu={subItem}
            executeAction={executeAction}
            onActionComplete={onActionComplete}
            onCustomAction={onCustomAction}
            key={subItem.id}
          />
        ))}
      </div>,
      document.body,
    )}
  </div>
}

export default MenuItem

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
