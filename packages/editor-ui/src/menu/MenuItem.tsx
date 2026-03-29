import { useState } from 'react'
import type { EditorMenuActionHandler, EditorMenuItem, EditorMenuTranslate } from './model/types.ts'

interface MenuItemProps {
  item: EditorMenuItem
  translate: EditorMenuTranslate
  onAction?: EditorMenuActionHandler
}

export function MenuItem({ item, translate, onAction }: MenuItemProps) {
  const [subOpen, setSubOpen] = useState(false)
  const hasChildren = (item.children?.length ?? 0) > 0

  return (
    <div
      className="relative h-8 min-w-48 hover:bg-gray-200"
      onMouseOver={(event) => {
        event.preventDefault()
        setSubOpen(true)
      }}
      onMouseLeave={() => setSubOpen(false)}
      onClick={() => {
        if (!hasChildren && !item.disabled) {
          onAction?.(item)
        }
      }}
    >
      <div className="px-4 w-full h-full flex justify-between items-center whitespace-nowrap">
        <span>{translate(item.id, 'label')}</span>
        {hasChildren ? <span aria-hidden="true">▸</span> : null}
      </div>

      {hasChildren && subOpen ? (
        <div className="absolute bg-white z-30 left-full top-0 w-auto border border-gray-200 box-border">
          {item.children?.map((subItem) => (
            <MenuItem
              key={subItem.id}
              item={subItem}
              translate={translate}
              onAction={onAction}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
