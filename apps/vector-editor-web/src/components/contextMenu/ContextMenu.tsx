import {FC, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {I18nHistoryDataItem} from '../../i18n/type'
import {LuChevronRight} from 'react-icons/lu'
import {MenuItemType} from '../header/menu/type'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'
import {ElementProps} from '@lite-u/editor/types'
import {Point} from '@venus/document-core'

export interface ContextMenuProps {
  position: Point
  onClose: () => void
  executeAction: EditorExecutor
  selectedIds: string[]
  copiedItems: ElementProps[]
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
}

export const ContextMenu: FC<ContextMenuProps> = ({position, executeAction, onClose, selectedIds, copiedItems, historyStatus}) => {
  const {t} = useTranslation()
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([])
  const groupClass = 'absolute bg-white shadow-lg rounded-md border border-gray-200 py-1 z-50'
  useEffect(() => {
    const noSelectedElement = selectedIds.length === 0
    const ITEMS: MenuItemType[] = [
      {id: 'copy', editorActionCode: 'element-copy', disabled: noSelectedElement},
      {id: 'paste', editorActionCode: 'element-paste', disabled: copiedItems.length === 0},
      {id: 'duplicate', editorActionCode: 'element-duplicate', disabled: noSelectedElement},
      {id: 'maskWithShape', editorActionCode: 'image-mask-with-shape', disabled: noSelectedElement},
      {id: 'clearMask', editorActionCode: 'image-clear-mask', disabled: noSelectedElement},
      {id: 'delete', editorActionCode: 'element-delete', disabled: noSelectedElement, divide: true},
      {id: 'undo', editorActionCode: 'history-undo', disabled: !historyStatus.hasPrev},
      {id: 'redo', editorActionCode: 'history-redo', disabled: !historyStatus.hasNext},
      // {id: 'ungroup', disabled: noSelectedElement},
      // {id: 'group', disabled: selectedIds.length < 2},
      /* {
         id: 'layer',
         disabled: noSelectedElement,
         children: [
           {id: 'bringForward', editorActionCode: 'module-layer', editorActionData: 'up', disabled: noSelectedElement},
           {id: 'sendBackward', editorActionCode: 'module-layer', editorActionData: 'down', disabled: noSelectedElement},
           {id: 'bringToFront', editorActionCode: 'module-layer', editorActionData: 'top', disabled: noSelectedElement},
           {id: 'sendToBack', editorActionCode: 'module-layer', editorActionData: 'bottom', disabled: noSelectedElement},
         ],
       },*/
    ]
    // console.log(selectedIds)
    setMenuItems(ITEMS)

    const remove = () => {
      onClose()
    }

    window.addEventListener('click', remove)

    return () => {
      window.removeEventListener('click', remove)
    }
  }, [selectedIds, position, copiedItems])

  // console.log(9)
  const handleContextAction = (item: MenuItemType) => {
    const {editorActionCode} = item

    if (editorActionCode === 'element-paste') {
      executeAction('element-paste', position)
    } else {
      executeAction(editorActionCode!)
    }
  }

  const MenuItem: FC<{ item: MenuItemType, onMouseUp: VoidFunction }> = ({item, onMouseUp}) => {
    const menuText = t(item.id, {returnObjects: true}) as I18nHistoryDataItem
    const hasChildren = item.children && item.children.length > 0

    return <div className={'min-w-40 relative group'}
                title={menuText.tooltip}>
      <button type={'button'}
              disabled={item.disabled}
              onMouseUp={onMouseUp}
              className={'flex justify-between px-4 text-nowrap items-center py-1.5 w-full text-left text-sm  hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed'}
      >{menuText.label}
        {hasChildren && <LuChevronRight/>}
      </button>

      {
        hasChildren &&
          <div className={groupClass + ' z-60 group-hover:block hidden left-full top-0 border-l-0 rounded-none '}>
            {
              item.children!.map((child, childIndex) => {
                return <MenuItem key={childIndex} item={child} onMouseUp={() => handleContextAction(child)}/>
              })
            }
          </div>
      }
    </div>
  }

  return (
    <div className={groupClass}
         onClick={(e) => {
           e.preventDefault()
           e.stopPropagation()
         }}
         style={{
           top: position.y,
           left: position.x,
         }}>

      {
        menuItems.map((item, index) => {
          return <MenuItem key={index} item={item} onMouseUp={() => {
            handleContextAction(item)
            onClose()
          }}/>

          /*const showDivider = index === 2 || index === 4 || index === 7
          const showChild = item.children && item.children.length > 0

          return <div key={item.id} className={'relative group'}>
            {showDivider && <div className="border-t border-gray-200 my-1"></div>}
            <MenuItem item={item} onClick={() => {
              // if (hasChildren) return
              handleContextAction(item.id)
            }}/>
            {
              showChild && <div
                    className={groupClass + ' z-60 group-hover:block hidden left-full top-0 border-l-0 rounded-none '}>
                {
                  item.children.map((child, childIndex) => {
                    return <MenuItem key={childIndex} item={child} onClick={() => handleContextAction(item.id)}/>
                  })
                }
                </div>
            }
          </div>*/
        })
      }
    </div>
  )
}
