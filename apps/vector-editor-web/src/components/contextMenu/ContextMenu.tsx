import {FC, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {I18nHistoryDataItem} from '../../i18n/type'
import {MenuItemType} from '../header/menu/type'
import {EditorExecutor} from '../../editor/hooks/useEditorRuntime.ts'
import {ElementProps} from '@lite-u/editor/types'
import {Point} from '@venus/document-core'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../header/shortcutBar/Icons/LayerIcons.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@vector/ui'
import {EDITOR_TEXT_MENU_CLASS} from '../editorChrome/editorTypography.ts'

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

  useEffect(() => {
    const noSelectedElement = selectedIds.length === 0
    const canGroup = selectedIds.length >= 2
    const canUngroup = selectedIds.length >= 1
    const canAlign = selectedIds.length >= 2
    const ITEMS: MenuItemType[] = [
      {id: 'copy', editorActionCode: 'element-copy', disabled: noSelectedElement},
      {id: 'paste', editorActionCode: 'element-paste', disabled: copiedItems.length === 0},
      {id: 'duplicate', editorActionCode: 'element-duplicate', disabled: noSelectedElement},
      {id: 'groupNodes', editorActionCode: 'group-nodes', disabled: !canGroup},
      {id: 'ungroupNodes', editorActionCode: 'ungroup-nodes', disabled: !canUngroup},
      {id: 'convertToPath', editorActionCode: 'convert-to-path', disabled: noSelectedElement},
      {
        id: 'align',
        disabled: !canAlign,
        children: [
          {id: 'alignLeft', editorActionCode: 'align-left', disabled: !canAlign},
          {id: 'alignCenterHorizontal', editorActionCode: 'align-center-horizontal', disabled: !canAlign},
          {id: 'alignRight', editorActionCode: 'align-right', disabled: !canAlign},
          {id: 'alignTop', editorActionCode: 'align-top', disabled: !canAlign},
          {id: 'alignMiddle', editorActionCode: 'align-middle', disabled: !canAlign},
          {id: 'alignBottom', editorActionCode: 'align-bottom', disabled: !canAlign},
        ],
      },
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
  }, [selectedIds, position, copiedItems])

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

  const renderContextMenuItem = (item: MenuItemType) => {
    const menuText = t(item.id, {returnObjects: true}) as I18nHistoryDataItem
    const hasChildren = item.children && item.children.length > 0
    const icon = resolveContextIcon(item.icon ?? item.id)

    if (hasChildren) {
      return <DropdownMenuSub key={item.id}>
        <DropdownMenuSubTrigger disabled={item.disabled} className={`vector-ui-menu-item ${EDITOR_TEXT_MENU_CLASS}`} title={menuText.tooltip}>
          <span className={'inline-flex items-center gap-2'}>
            {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
            <span>{menuText.label}</span>
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className={'min-w-40'}>
          {item.children?.map((childItem) => {
            return renderContextMenuItem(childItem)
          })}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    }

    return <DropdownMenuItem
      key={item.id}
      disabled={item.disabled}
      title={menuText.tooltip}
      className={`vector-ui-menu-item ${EDITOR_TEXT_MENU_CLASS}`}
      onClick={() => {
        handleContextAction(item)
        onClose()
      }}
    >
      <span className={'inline-flex items-center gap-2'}>
        {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
        <span>{menuText.label}</span>
      </span>
    </DropdownMenuItem>
  }

  return (
    <div
         className={'absolute z-50'}
         onClick={(e) => {
           e.preventDefault()
           e.stopPropagation()
         }}
         style={{
           top: position.y,
           left: position.x,
         }}>

      <DropdownMenu open onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}>
        {/* Anchor popup at pointer position while keeping menu fully keyboard accessible. */}
        <DropdownMenuTrigger className={'size-px opacity-0 pointer-events-none'} aria-label={t('shell.variantB.nav.mainMenu', {defaultValue: 'Context menu'})}>
          <span className={'sr-only'}>{t('shell.variantB.nav.mainMenu', {defaultValue: 'Context menu'})}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={'start'} sideOffset={4} className={'min-w-40'}>
          {menuItems.map((item) => {
            return <div key={item.id}>
              {item.divide && <DropdownMenuSeparator/>}
              {renderContextMenuItem(item)}
            </div>
          })}
        </DropdownMenuContent>
      </DropdownMenu>
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
