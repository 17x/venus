import React, {useContext, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {LuChevronRight} from 'react-icons/lu'
// import {useFile} from '../../../contexts/fileContext/FileContext.tsx'
/*
interface MenuItemProps {
  menu: NestedActions
}*/

const MenuItem: React.FC<{menu:any}> = ({
                                             menu,
                                           }) => {
  const {t} = useTranslation()
  const [subOpen, setSubOpen] = useState<boolean>(false)
  // const {executeAction} = useFile()

  const handleClick = () => {
    // console.log(menu)
    // if (menu.children || subOpen) return

    // executeAction(menu.id)
    setSubOpen(false)
  }

  const hasChildren = menu.children && menu.children!.length > 0

  return <div className={'relative h-8 hover:bg-gray-200 min-w-50'}
              onClick={() => handleClick()}
              onMouseOver={(e) => {
                setSubOpen(true)
                e.preventDefault()
                // e.stopPropagation()
              }}
              onMouseLeave={() => {
                // console.log(menu)
                setSubOpen(false)
              }}
  >
    <div className="px-4 w-full h-full flex justify-between items-center whitespace-nowrap">
      <span>{t(menu.id + '.label')}</span>
      {hasChildren && <LuChevronRight size={18}/>}

    </div>
    {
      hasChildren && subOpen &&
        <div className={'absolute bg-white z-30 left-full top-0 w-auto border border-gray-200 box-border'}>
          {
            menu.children!.map((subItem) => <MenuItem menu={subItem} key={subItem.id}/>)
          }
        </div>
    }
  </div>
}

export default MenuItem