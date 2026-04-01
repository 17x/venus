import React, {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import MenuItem from './MenuItem.tsx'
import MenuData from './menuData.ts'
import {EditorExecutor} from '../../../hooks/useEditorRuntime.ts'

const MenuBar: React.FC<{ executeAction: EditorExecutor }> = ({executeAction}) => {
  const [open, setOpen] = useState<boolean>(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const {t} = useTranslation()
  const componentRef = useRef<HTMLDivElement>(null)
  const actions = MenuData

  useEffect(() => {
    const detectClose = (e: MouseEvent) => {
      if (!componentRef.current!.contains(e.target as Node)) {
        setOpen(false)
        setOpenId(null)
      }
    }

    // console.log(MenuData)

    window.addEventListener('click', detectClose)

    return () => {
      window.removeEventListener('click', detectClose)
    }
  })

  // console.log('menu')
  return <div className="h-8 text-sm select-none border-gray-200 box-border">
    <div ref={componentRef} className={'pl-2 h-full inline-flex'}>
      {
        actions.map((menu) => {
          // console.log(menu.id)
          // console.log(t(menu.id + '.label'))
          return <div key={menu.id} className={'relative h-full'}>
            <div className={`h-full inline-flex items-center px-4 ${menu.id === openId ? 'bg-gray-200' : ''}`}
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
            </div>
            {
              open && menu.id === openId && menu.children!.length > 0 &&
                <div className={'absolute z-20 bg-white border border-gray-200'}>
                  {
                    menu.children?.map((child) => {
                      return <MenuItem key={child.id} menu={child} executeAction={executeAction}/>
                    })
                  }</div>
            }
          </div>
        })
      }</div>
  </div>
}

export default MenuBar
