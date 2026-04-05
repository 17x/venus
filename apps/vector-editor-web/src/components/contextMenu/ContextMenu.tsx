import {FC, useEffect, useLayoutEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {I18nHistoryDataItem} from '../../i18n/type'
import {LuChevronRight} from 'react-icons/lu'
import {MenuItemType} from '../header/menu/type'
import {EditorExecutor} from '../../hooks/useEditorRuntime.ts'
import {ElementProps} from '@lite-u/editor/types'
import {Point} from '@venus/document-core'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../header/shortcutBar/Icons/LayerIcons.tsx'

export interface ContextMenuProps {
  position: Point
  pastePosition?: Point
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

export const ContextMenu: FC<ContextMenuProps> = ({
  position,
  pastePosition,
  executeAction,
  onClose,
  selectedIds,
  copiedItems,
  historyStatus,
}) => {
  const {t} = useTranslation()
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([])
  const [resolvedPosition, setResolvedPosition] = useState(position)
  const rootRef = useRef<HTMLDivElement>(null)
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
      {
        id: 'layer',
        disabled: noSelectedElement,
        children: [
          {id: 'bringForward', icon: 'layerUp', editorActionCode: 'element-layer', editorActionData: 'up', disabled: noSelectedElement},
          {id: 'sendBackward', icon: 'layerDown', editorActionCode: 'element-layer', editorActionData: 'down', disabled: noSelectedElement},
          {id: 'bringToFront', icon: 'layerTop', editorActionCode: 'element-layer', editorActionData: 'top', disabled: noSelectedElement},
          {id: 'sendToBack', icon: 'layerBottom', editorActionCode: 'element-layer', editorActionData: 'bottom', disabled: noSelectedElement},
        ],
      },
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

  useLayoutEffect(() => {
    const root = rootRef.current
    const parent = root?.parentElement
    if (!root || !parent) {
      setResolvedPosition(position)
      return
    }

    const menuWidth = root.offsetWidth
    const menuHeight = root.offsetHeight
    const maxX = Math.max(0, parent.clientWidth - menuWidth - 4)
    const maxY = Math.max(0, parent.clientHeight - menuHeight - 4)
    setResolvedPosition({
      x: Math.min(Math.max(0, position.x), maxX),
      y: Math.min(Math.max(0, position.y), maxY),
    })
  }, [position, menuItems.length])

  // console.log(9)
  const handleContextAction = (item: MenuItemType) => {
    const {editorActionCode} = item

    if (editorActionCode === 'element-paste') {
      executeAction('element-paste', pastePosition ?? position)
    } else if (editorActionCode && item.editorActionData) {
      executeAction(editorActionCode, item.editorActionData)
    } else {
      executeAction(editorActionCode ?? item.id)
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
      >
        <span className={'inline-flex items-center gap-2'}>
          <span className={'inline-flex opacity-80'}>{resolveContextIcon(item.icon ?? item.id)}</span>
          <span>{menuText.label}</span>
        </span>
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
    <div
         ref={rootRef}
         className={groupClass}
         onClick={(e) => {
           e.preventDefault()
           e.stopPropagation()
         }}
         style={{
           top: resolvedPosition.y,
           left: resolvedPosition.x,
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

function resolveContextIcon(icon: string) {
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
