import {FC, Fragment, useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import {I18nHistoryDataItem} from '../../i18n/type'
import type {MenuItemType} from '../header/menu/type'
// Keep context menu contracts type-only to avoid hard dependency on editor hook implementation modules.
import type {EditorExecutor} from '../../runtime/useEditorRuntime/types.ts'
import type {ElementProps} from '../../runtime/types/index.ts'
import type {Point} from '../../runtime/model/index.ts'
import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from '../header/shortcutBar/Icons/LayerIcons.tsx'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '../../ui/index.ts'
import {EDITOR_TEXT_MENU_CLASS} from '../editorChrome/editorTypography.ts'

export interface ContextMenuProps {
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
  pastePosition,
  executeAction,
  onClose,
  selectedIds,
  copiedItems,
  historyStatus,
}) => {
  const {t} = useTranslation()

  const menuItems = useMemo<MenuItemType[]>(() => {
    const noSelectedElement = selectedIds.length === 0
    const canGroup = selectedIds.length >= 2
    const canUngroup = selectedIds.length >= 1
    const canAlign = selectedIds.length >= 2
    const canBoolean = selectedIds.length >= 2
    const ITEMS: MenuItemType[] = [
      {id: 'copy', editorActionCode: 'element-copy', disabled: noSelectedElement},
      {id: 'paste', editorActionCode: 'element-paste', disabled: copiedItems.length === 0},
      {id: 'duplicate', editorActionCode: 'element-duplicate', disabled: noSelectedElement},
      {id: 'groupNodes', editorActionCode: 'group-nodes', disabled: !canGroup},
      {id: 'ungroupNodes', editorActionCode: 'ungroup-nodes', disabled: !canUngroup},
      {id: 'convertToPath', editorActionCode: 'convert-to-path', disabled: noSelectedElement},
      {
        id: 'boolean',
        disabled: !canBoolean,
        children: [
          {id: 'booleanUnion', editorActionCode: 'boolean-union', disabled: !canBoolean},
          {id: 'booleanSubtract', editorActionCode: 'boolean-subtract', disabled: !canBoolean},
          {id: 'booleanIntersect', editorActionCode: 'boolean-intersect', disabled: !canBoolean},
        ],
      },
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
    return ITEMS
  }, [copiedItems.length, historyStatus.hasNext, historyStatus.hasPrev, selectedIds.length])

  const handleContextAction = (item: MenuItemType) => {
    const {editorActionCode} = item

    if (editorActionCode === 'element-paste') {
      executeAction('element-paste', pastePosition ?? {x: 0, y: 0})
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
      return <ContextMenuSub key={item.id}>
        <ContextMenuSubTrigger disabled={item.disabled} className={EDITOR_TEXT_MENU_CLASS} title={menuText.tooltip}>
          <span className={'inline-flex items-center gap-2'}>
            {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
            <span>{menuText.label}</span>
          </span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className={'min-w-44'}>
          {item.children?.map((childItem) => {
            return renderContextMenuItem(childItem)
          })}
        </ContextMenuSubContent>
      </ContextMenuSub>
    }

    return <ContextMenuItem
      key={item.id}
      disabled={item.disabled}
      title={menuText.tooltip}
      className={EDITOR_TEXT_MENU_CLASS}
      onClick={() => {
        handleContextAction(item)
        onClose()
      }}
    >
      <span className={'inline-flex items-center gap-2'}>
        {icon && <span className={'inline-flex opacity-80'}>{icon}</span>}
        <span>{menuText.label}</span>
      </span>
    </ContextMenuItem>
  }

  return (
    <ContextMenuContent
      align={'start'}
      sideOffset={4}
      className={'min-w-44 border border-slate-200/80 shadow-xl dark:border-slate-700/80'}
      aria-label={t('shell.variantB.nav.mainMenu', {defaultValue: 'Context menu'})}
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      {menuItems.map((item) => (
        <Fragment key={item.id}>
          {item.divide && <ContextMenuSeparator/>}
          {renderContextMenuItem(item)}
        </Fragment>
      ))}
    </ContextMenuContent>
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
