import { useEffect, useRef, useState } from 'react'
import { MenuItem } from './MenuItem.tsx'
import type { EditorMenuActionHandler, EditorMenuItem, EditorMenuTranslate } from './model/types.ts'

interface MenuBarProps {
  items: EditorMenuItem[]
  translate: EditorMenuTranslate
  onAction?: EditorMenuActionHandler
}

export function MenuBar({ items, translate, onAction }: MenuBarProps) {
  const [open, setOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const detectClose = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setOpenId(null)
      }
    }

    window.addEventListener('click', detectClose)
    return () => window.removeEventListener('click', detectClose)
  }, [])

  return (
    <div className="h-8 text-sm select-none border-gray-200 box-border">
      <div ref={rootRef} className="pl-2 h-full inline-flex">
        {items.map((menu) => (
          <div key={menu.id} className="relative h-full">
            <div
              className={`h-full inline-flex items-center px-4 ${menu.id === openId ? 'bg-gray-200' : ''}`}
              onMouseEnter={() => open && setOpenId(menu.id)}
              onClick={() => {
                if (openId !== menu.id) {
                  setOpen(true)
                  setOpenId(menu.id)
                } else {
                  setOpen(false)
                  setOpenId(null)
                }
              }}
              title={translate(menu.id, 'tooltip')}
            >
              <span>{translate(menu.id, 'label')}</span>
            </div>

            {open && openId === menu.id && (menu.children?.length ?? 0) > 0 ? (
              <div className="absolute z-20 bg-white border border-gray-200">
                {menu.children?.map((child) => (
                  <MenuItem
                    key={child.id}
                    item={child}
                    translate={translate}
                    onAction={onAction}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
