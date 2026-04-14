import React, {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import MenuItem from './MenuItem.tsx'
import {createHeaderMenuData} from './menuData.ts'
import {EditorExecutor} from '../../../hooks/useEditorRuntime.ts'
import {Button, cn} from '@venus/ui'
import {EDITOR_TEXT_MENU_CLASS} from '../../editorChrome/editorTypography.ts'

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
  const [open, setOpen] = useState<boolean>(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const {t} = useTranslation()
  const componentRef = useRef<HTMLDivElement>(null)
  const actions = createHeaderMenuData({
    selectedIds,
    copiedCount,
    needSave,
    historyStatus,
  })

  useEffect(() => {
    const detectClose = (e: MouseEvent) => {
      if (!componentRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setOpenId(null)
      }
    }

    // console.log(MenuData)

    window.addEventListener('click', detectClose)

    return () => {
      window.removeEventListener('click', detectClose)
    }
  }, [])

  // console.log('menu')
  return <div className={cn('h-9 select-none border-gray-200 bg-white px-2 py-1', EDITOR_TEXT_MENU_CLASS)}>
    <div ref={componentRef} className={'flex h-full items-center gap-1'}>
      {
        actions.map((menu) => {
          // console.log(menu.id)
          // console.log(t(menu.id + '.label'))
          return <div key={menu.id} className={'relative h-full'}>
            <Button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open && menu.id === openId}
              className={cn(
                'inline-flex h-full items-center rounded px-3 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-950',
                EDITOR_TEXT_MENU_CLASS,
                menu.id === openId && 'bg-gray-100 text-gray-950',
              )}
              onMouseEnter={() => open && setOpenId(menu.id)}
              onClick={() => {
                if (openId !== menu.id) {
                  setOpen(true)
                  setOpenId(menu.id)
                } else {
                  setOpenId(null)
                  setOpen(false)
                }

                // setOpen(!open)
                // setOpenId(menu.id)
              }}
              title={t(menu.id + '.tooltip')}
            >
              <span>{t(menu.id + '.label')}</span>
            </Button>
            {
              open && menu.id === openId && menu.children!.length > 0 &&
                <div className={'absolute left-0 top-full z-50 mt-1 min-w-50 overflow-hidden rounded border border-gray-200 bg-white py-1 shadow-lg'}>
                  {
                    menu.children?.map((child) => {
                      return <MenuItem
                        key={child.id}
                        menu={child}
                        executeAction={executeAction}
                        onActionComplete={() => {
                          setOpen(false)
                          setOpenId(null)
                        }}
                      />
                    })
                  }</div>
            }
          </div>
        })
      }</div>
  </div>
}

export default MenuBar
