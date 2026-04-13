import {LayerDown, LayerToBottom, LayerToTop, LayerUp} from './Icons/LayerIcons.tsx'
import {Fragment, ReactNode} from 'react'
import {I18nHistoryDataItem} from '../../../i18n/type'
import {EditorExecutor} from '../../../hooks/useEditorRuntime.ts'
import {Button, cn, IconButton, Select, SelectItem} from '@venus/ui'
import {useTranslation} from 'react-i18next'
import type {SelectedElementProps} from '../../../hooks/useEditorRuntime.types.ts'
import {
  CHROME_ICON_BUTTON_DISABLED_CLASS,
  CHROME_ICON_SIZE,
  CHROME_ICON_ITEM_CLASS,
} from '../../editorChrome/chromeIconStyles.ts'
import {
  AlignCenterHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  AlignVerticalJustifyCenter,
  Redo2,
  Palette,
  PenLine,
  SlidersHorizontal,
  Spline,
  Trash2,
  Undo2,
  WandSparkles,
} from 'lucide-react'
import ColorSwatchPicker from '../../styleControls/ColorSwatchPicker.tsx'

const STROKE_WIDTH_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 16, 24] as const

interface ShortcutAction {
  id: string
  i18nKey: string
  editorActionCode?: string
  editorActionData?: string
  icon: ReactNode
  disabled: boolean
  divide?: boolean
}

const ShortcutBar: React.FC<{
  executeAction: EditorExecutor
  onOpenTemplatePresetPicker: VoidFunction
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
  selectedIds: string[]
  selectedProps: SelectedElementProps | null
}> = ({executeAction, onOpenTemplatePresetPicker, historyStatus, selectedIds, selectedProps}) => {
  const {t} = useTranslation()
  const SHORTCUT_ICON_SIZE = CHROME_ICON_SIZE + 4
  const hasSelection = selectedIds.length > 0
  const canAlign = selectedIds.length >= 2
  const canDistribute = selectedIds.length >= 3
  const currentStrokeWeight = Math.max(1, Math.round(selectedProps?.stroke?.weight ?? 1))

  const applyStylePatchToSelection = (props: Partial<SelectedElementProps>) => {
    if (!hasSelection) {
      return
    }

    executeAction('element-modify', selectedIds.map((id) => ({id, props})))
  }

  const actions: ShortcutAction[] = [
    {id: 'undo', i18nKey: 'undo', editorActionCode: 'history-undo', icon: <Undo2 size={18}/>, disabled: !historyStatus.hasPrev},
    {id: 'redo', i18nKey: 'redo', editorActionCode: 'history-redo', icon: <Redo2 size={18}/>, disabled: !historyStatus.hasNext, divide: true},
    {
      id: 'delete',
      i18nKey: 'delete',
      editorActionCode: 'element-delete',
      icon: <Trash2 size={18}/>,
      disabled: !hasSelection,
      divide: true,
    },
    // {id: 'add', icon: 'cross', disabled: false, divide: true},
    {
      id: 'layerUp',
      i18nKey: 'bringForward',
      editorActionCode: 'element-layer',
      editorActionData: 'up',
      icon: <LayerUp size={SHORTCUT_ICON_SIZE}/>,
      disabled: !hasSelection,
    },
    {
      id: 'layerDown',
      i18nKey: 'sendBackward',
      editorActionCode: 'element-layer',
      editorActionData: 'down',
      icon: <LayerDown size={SHORTCUT_ICON_SIZE}/>,
      disabled: !hasSelection,
    },
    {
      id: 'layerTop',
      i18nKey: 'bringToFront',
      editorActionCode: 'element-layer',
      editorActionData: 'top',
      icon: <LayerToTop size={SHORTCUT_ICON_SIZE}/>,
      disabled: !hasSelection,
    },
    {
      id: 'layerBottom',
      i18nKey: 'sendToBack',
      editorActionCode: 'element-layer',
      editorActionData: 'bottom',
      icon: <LayerToBottom size={SHORTCUT_ICON_SIZE}/>,
      disabled: !hasSelection,
      divide: true,
    },
    /*{id: 'group', icon: 'group', disabled: true},
    {id: 'ungroup', icon: 'ungroup', disabled: true, divide: true},
    {id: 'lock', icon: 'lock', disabled: false},
    {id: 'unlock', icon: 'unlock', disabled: true},*/
  ]

  const shapeActions: ShortcutAction[] = [
    {
      id: 'convertToPath',
      i18nKey: 'convertToPath',
      editorActionCode: 'convert-to-path',
      icon: <Spline size={18}/>,
      disabled: !hasSelection,
    },
    {
      id: 'alignLeft',
      i18nKey: 'alignLeft',
      editorActionCode: 'align-left',
      icon: <AlignLeft size={18}/>,
      disabled: !canAlign,
    },
    {
      id: 'alignCenterHorizontal',
      i18nKey: 'alignCenterHorizontal',
      editorActionCode: 'align-center-horizontal',
      icon: <AlignCenterHorizontal size={18}/>,
      disabled: !canAlign,
    },
    {
      id: 'alignTop',
      i18nKey: 'alignTop',
      editorActionCode: 'align-top',
      icon: <AlignStartVertical size={18}/>,
      disabled: !canAlign,
    },
    {
      id: 'alignRight',
      i18nKey: 'alignRight',
      editorActionCode: 'align-right',
      icon: <AlignRight size={18}/>,
      disabled: !canAlign,
    },
    {
      id: 'alignMiddle',
      i18nKey: 'alignMiddle',
      editorActionCode: 'align-middle',
      icon: <AlignVerticalJustifyCenter size={18}/>,
      disabled: !canAlign,
    },
    {
      id: 'alignBottom',
      i18nKey: 'alignBottom',
      editorActionCode: 'align-bottom',
      icon: <AlignEndVertical size={18}/>,
      disabled: !canAlign,
    },
    {
      id: 'distributeHorizontal',
      i18nKey: 'distributeHorizontal',
      editorActionCode: 'distribute-horizontal',
      icon: <AlignHorizontalSpaceBetween size={18}/>,
      disabled: !canDistribute,
    },
    {
      id: 'distributeVertical',
      i18nKey: 'distributeVertical',
      editorActionCode: 'distribute-vertical',
      icon: <AlignVerticalSpaceBetween size={18}/>,
      disabled: !canDistribute,
    },
  ]

  return <div className={'border-b border-gray-200 bg-white'}>
    <div className={'flex h-11 items-center gap-1 overflow-x-auto px-3 whitespace-nowrap'}>
      <Button
        type={'button'}
        variant={'primary'}
        title={t('ui.template.generateButtonTooltip')}
        aria-label={t('ui.template.generateButtonTooltip')}
        className={cn(
          CHROME_ICON_ITEM_CLASS,
          'size-10 shrink-0 [&_svg]:size-5',
          CHROME_ICON_BUTTON_DISABLED_CLASS,
        )}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onOpenTemplatePresetPicker()
        }}
      >
        <WandSparkles size={18}/>
      </Button>
      <div className={'mx-1 h-5 w-px bg-gray-200'}></div>
      {
        Object.values(actions).map((item) => {
          const {id, i18nKey, icon, disabled, divide} = item

          const menuText = t(i18nKey, {returnObjects: true}) as I18nHistoryDataItem | string
          const tooltip = typeof menuText === 'string' ? id : menuText.tooltip

          return <Fragment key={id}>
            <IconButton type={'button'}
                    aria-label={tooltip}
                    disabled={disabled}
                    title={tooltip}
                    onClick={() => {
                      const action = item.editorActionCode
                      if (action) {
                        if (item.editorActionData) {
                          executeAction(action, item.editorActionData)
                        } else {
                          executeAction(action)
                        }
                      }
                    }}
                    className={cn(
                      CHROME_ICON_ITEM_CLASS,
                      'size-10 shrink-0 [&_svg]:size-5',
                      CHROME_ICON_BUTTON_DISABLED_CLASS,
                    )}>
              {icon}
            </IconButton>
            {divide && <div className={'mx-1 h-5 w-px bg-gray-200'}></div>}
          </Fragment>
        })
      }
      <div className={'mx-1 h-5 w-px bg-gray-200'}></div>
      {shapeActions.map((item) => {
        const menuText = t(item.i18nKey, {returnObjects: true}) as I18nHistoryDataItem | string
        const tooltip = typeof menuText === 'string' ? item.id : menuText.tooltip

        return <IconButton
          key={item.id}
          type={'button'}
          aria-label={tooltip}
          disabled={item.disabled}
          title={tooltip}
          onClick={() => item.editorActionCode && executeAction(item.editorActionCode)}
          className={cn(
            CHROME_ICON_ITEM_CLASS,
            'size-10 shrink-0 [&_svg]:size-5',
            CHROME_ICON_BUTTON_DISABLED_CLASS,
          )}
        >
          {item.icon}
        </IconButton>
      })}
      <div className={'mx-1 h-5 w-px bg-gray-200'}></div>
      <ColorSwatchPicker
        icon={<Palette size={14}/>} 
        label={t('ui.quickStyle.fill')}
        tooltip={t('ui.quickStyle.fillTooltip')}
        disabled={!hasSelection}
        value={selectedProps?.fill?.color}
        onPick={(color) => applyStylePatchToSelection({fill: {enabled: true, color}})}
      />
      <ColorSwatchPicker
        icon={<PenLine size={14}/>} 
        label={t('ui.quickStyle.stroke')}
        tooltip={t('ui.quickStyle.strokeTooltip')}
        disabled={!hasSelection}
        value={selectedProps?.stroke?.color}
        onPick={(color) => applyStylePatchToSelection({stroke: {enabled: true, color}})}
      />
      <div className={'flex items-center gap-1'}>
        <span
          className={'inline-flex size-7 items-center justify-center rounded border border-gray-300 text-gray-600'}
          title={t('ui.quickStyle.stroke')}
        >
          <SlidersHorizontal size={14}/>
        </span>
        <Select
          s
          className={'w-20 shrink-0'}
          disabled={!hasSelection}
          selectValue={currentStrokeWeight}
          onSelectChange={(value) => {
            applyStylePatchToSelection({stroke: {enabled: true, weight: Number(value)}})
          }}
          placeholderResolver={(value) => `${value}px`}
        >
          {STROKE_WIDTH_OPTIONS.map((weight) => <SelectItem
            key={weight}
            className={'text-xs'}
            value={weight}
          >
            {weight}px
          </SelectItem>)}
        </Select>
      </div>
    </div>
  </div>
}
export default ShortcutBar
