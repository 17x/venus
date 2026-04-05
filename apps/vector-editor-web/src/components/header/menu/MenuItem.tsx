import React, {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {LuChevronRight} from 'react-icons/lu'
import {EditorExecutor} from '../../../hooks/useEditorRuntime.ts'
import {MenuItemType} from './type'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../shortcutBar/Icons/LayerIcons.tsx'

interface MenuItemProps {
  menu: MenuItemType
  executeAction: EditorExecutor
}

const MenuItem: React.FC<MenuItemProps> = ({
                                             menu,
                                             executeAction,
                                           }) => {
  const {t} = useTranslation()
  const [subOpen, setSubOpen] = useState<boolean>(false)

  const handleClick = () => {
    if (menu.disabled || hasChildren) {
      return
    }
    // Menu rows can map to explicit runtime actions; fall back to legacy id dispatch.
    const action = menu.editorActionCode ?? menu.action ?? menu.id
    if (menu.editorActionData) {
      executeAction(action, menu.editorActionData)
    } else {
      executeAction(action)
    }
    setSubOpen(false)
  }

  const hasChildren = menu.children && menu.children!.length > 0
  const icon = menu.icon ?? menu.id

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
      <span className={'inline-flex items-center gap-2'}>
        <span className={'inline-flex opacity-80'}>{resolveMenuIcon(icon)}</span>
        <span>{t(menu.id + '.label')}</span>
      </span>
      {hasChildren && <LuChevronRight size={18}/>}

    </div>
    {
      hasChildren && subOpen &&
        <div className={'absolute bg-white z-30 left-full top-0 w-auto border border-gray-200 box-border'}>
          {
            menu.children!.map((subItem) => <MenuItem menu={subItem} executeAction={executeAction} key={subItem.id}/>)
          }
        </div>
    }
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
