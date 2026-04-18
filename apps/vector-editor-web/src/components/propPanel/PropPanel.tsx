import {type ChangeEvent, type ReactNode, useEffect, useMemo, useState} from 'react'
import {Button, Con, Select, SelectItem, Separator} from '@vector/ui'
import {ProtectedInput} from './protectedInput.tsx'
import {EditorExecutor} from '../../editor/hooks/useEditorRuntime.ts'
import type {SelectedElementProps} from '../../editor/hooks/useEditorRuntime.types.ts'
import {
  EDITOR_TEXT_CONTROL_CLASS,
  EDITOR_TEXT_PANEL_BODY_CLASS,
  EDITOR_TEXT_PANEL_HEADING_CLASS,
  EDITOR_TEXT_PANEL_LABEL_CLASS,
} from '../editorChrome/editorTypography.ts'
import {useTranslation} from 'react-i18next'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
import {LuChevronRight, LuCircle, LuSettings2, LuSpline} from 'react-icons/lu'

interface PropPanelProps {
  props?: SelectedElementProps
  executeAction: EditorExecutor
  onMinimize?: VoidFunction
  onPatchElementProps?: (elementId: string, patch: Record<string, unknown>, meta: ShellCommandMeta) => void
}

const PropPanel = ({props, executeAction, onMinimize, onPatchElementProps}: PropPanelProps) => {
  const {t} = useTranslation()
  const [localProps, setLocalProps] = useState(props)

  useEffect(() => {
    setLocalProps(props)
  }, [props])

  return <Con flex={1} minH={0}>
    <section className={'venus-ui-font flex h-full w-full min-h-0 flex-col overflow-hidden text-slate-950'} role={'region'}>
      <div className={'mb-2 flex items-center justify-between gap-2 p-1 text-xs text-slate-900'}>
        <PanelHead title={t('inspector.properties.title', 'Properties')} onMinimize={onMinimize}/>
      </div>
      <div className={'scrollbar-custom min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1 pb-1'}>
        {localProps
          ? <ShapePropsPanel
              props={localProps}
              executeAction={executeAction}
              onPatchElementProps={onPatchElementProps}
            />
          : <div className={`rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-gray-500 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
              {t('inspector.properties.empty', 'Select an element to edit its properties.')}
            </div>}
      </div>
    </section>
  </Con>
}

export default PropPanel

function PanelHead(props: {title: string, onMinimize?: VoidFunction}) {
  const {t} = useTranslation()
  return (
    <div className={'flex w-full items-center justify-between gap-2'}>
      <h2 className={'font-semibold'}>{props.title}</h2>
      {props.onMinimize &&
        <Button
          type="button"
          aria-label={t('inspector.minimizePanel', {title: props.title, defaultValue: `Minimize ${props.title}`})}
          title={t('inspector.minimizePanel', {title: props.title, defaultValue: `Minimize ${props.title}`})}
          className={'inline-flex size-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900'}
          onClick={(event) => {
            event.stopPropagation()
            props.onMinimize?.()
          }}
        >
          <span>&minus;</span>
        </Button>}
    </div>
  )
}

function GroupTitle(props: {title: string}) {
  return (
    <div className={`venus-prop-group-title ${EDITOR_TEXT_PANEL_HEADING_CLASS}`}>{props.title}</div>
  )
}

function FieldRow(props: {label: string, children: ReactNode}) {
  return (
    <div className={'venus-prop-row'}>
      <span className={EDITOR_TEXT_PANEL_LABEL_CLASS}>{props.label}</span>
      <div className={'min-w-0'}>{props.children}</div>
    </div>
  )
}

function InlineIconAction(props: {label: string, icon: ReactNode}) {
  return (
    <Button
      type={'button'}
      variant={'ghost'}
      size={'sm'}
      aria-label={props.label}
      title={props.label}
      className={'venus-prop-icon-action'}
    >
      {props.icon}
    </Button>
  )
}

function PaintRow(props: {
  label: string
  enabled: boolean
  color: string
  onChangeEnabled: (enabled: boolean) => void
  onChangeColor: (color: string) => void
  children?: ReactNode
}) {
  return (
    <div className={'flex flex-col gap-1.5'}>
      <div className={'grid grid-cols-[74px_minmax(0,1fr)_24px] items-center gap-2'}>
        <span className={EDITOR_TEXT_PANEL_LABEL_CLASS}>{props.label}</span>
        <ProtectedInput
          type={'color'}
          value={props.color}
          title={props.label}
          onChange={(event) => {
            props.onChangeColor(event.target.value)
          }}
        />
        <ProtectedInput
          type={'checkbox'}
          checked={props.enabled}
          title={`${props.label} enabled`}
          onChange={(event) => {
            props.onChangeEnabled(event.target.checked)
          }}
        />
      </div>
      {props.children}
    </div>
  )
}

const ShapePropsPanel = ({
  props,
  executeAction,
  onPatchElementProps,
}: {
  props: SelectedElementProps
  executeAction: EditorExecutor
  onPatchElementProps?: (elementId: string, patch: Record<string, unknown>, meta: ShellCommandMeta) => void
}) => {
  const {t} = useTranslation()
  const [strokePosition, setStrokePosition] = useState('inside')
  const [exportScale, setExportScale] = useState('1x')
  const [exportFormat, setExportFormat] = useState('PNG')

  const fill = {
    enabled: props.fill?.enabled ?? true,
    color: props.fill?.color ?? '#000000',
  }

  const stroke = {
    enabled: props.stroke?.enabled ?? true,
    color: props.stroke?.color ?? '#000000',
    weight: props.stroke?.weight ?? 1,
    cap: props.stroke?.cap ?? 'butt',
    join: props.stroke?.join ?? 'miter',
    dashed: props.stroke?.dashed ?? false,
  }

  const shadow = {
    enabled: props.shadow?.enabled ?? false,
    color: props.shadow?.color ?? '#000000',
    offsetX: props.shadow?.offsetX ?? 0,
    offsetY: props.shadow?.offsetY ?? 0,
    blur: props.shadow?.blur ?? 8,
  }

  const numericFieldNames = useMemo<Array<keyof SelectedElementProps>>(() => [
    'x',
    'y',
    'width',
    'height',
    'rotation',
    'r1',
    'r2',
    'cornerRadius',
    'ellipseStartAngle',
    'ellipseEndAngle',
    'opacity',
    'shadowOffsetX',
    'shadowOffsetY',
    'shadowBlur',
  ], [])

  const patchElementProps = (nextProps: Partial<SelectedElementProps>) => {
    if (onPatchElementProps) {
      onPatchElementProps(props.id, nextProps as Record<string, unknown>, {
        sourcePanel: 'properties-panel',
        sourceControl: 'property-field-input',
        commitType: 'final',
      })
      return
    }

    executeAction('element-modify', [{
      id: props.id,
      props: nextProps,
    }])
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const keyName = event.target.name as Extract<keyof SelectedElementProps, string>
    let nextValue: string | number = event.target.value

    if (numericFieldNames.includes(keyName as keyof SelectedElementProps)) {
      nextValue = Number(nextValue)
    }

    patchElementProps({[keyName]: nextValue} as Partial<SelectedElementProps>)

    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className={`z-30 flex min-w-0 flex-col gap-2 overflow-x-hidden ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
      {/* <GroupTitle title={t('inspector.properties.sections.identity', 'Identity')}/>
      <FieldRow label={t('inspector.properties.fields.type', 'Type')}>
        <span className={'truncate text-gray-700 uppercase'}>{String(props.type ?? 'unknown')}</span>
      </FieldRow>
      <FieldRow label={t('inspector.properties.fields.id', 'ID')}>
        <span className={'truncate text-gray-600'} title={props.id}>{props.id}</span>
      </FieldRow> */}

      <Separator className={'my-0.5'}/>
      <GroupTitle title={t('inspector.properties.sections.layout', 'Layout')}/>
      <div className={'venus-prop-grid-2'}>
        <ProtectedInput
          type={'number'}
          name={'x'}
          value={props.x ?? props.cx ?? 0}
          title={t('inspector.properties.fields.x', 'X')}
          onChange={handleChange}
        />
        <ProtectedInput
          type={'number'}
          name={'y'}
          value={props.y ?? props.cy ?? 0}
          title={t('inspector.properties.fields.y', 'Y')}
          onChange={handleChange}
        />
      </div>

      <div className={'venus-prop-grid-2'}>
        <ProtectedInput
          type={'number'}
          name={'width'}
          value={props.width ?? 0}
          title={t('inspector.properties.fields.width', 'Width')}
          onChange={handleChange}
        />
        <ProtectedInput
          type={'number'}
          name={'height'}
          value={props.height ?? 0}
          title={t('inspector.properties.fields.height', 'Height')}
          onChange={handleChange}
        />
      </div>
      <div className={'grid grid-cols-[minmax(0,1fr)_24px] items-center gap-2'}>
        <ProtectedInput
          type={'number'}
          name={'rotation'}
          value={props.rotation ?? 0}
          title={t('inspector.properties.fields.rotation', 'Rotation')}
          onChange={handleChange}
        />
        <InlineIconAction
          label={t('inspector.properties.layout.constraint', {defaultValue: 'Aspect ratio constraint'})}
          icon={<LuSettings2 size={14}/>}
        />
      </div>

      {props.type === 'ellipse' &&
        <div className={'venus-prop-grid-2'}>
          <ProtectedInput
            type={'number'}
            name={'ellipseStartAngle'}
            value={props.ellipseStartAngle ?? 0}
            title={t('inspector.properties.fields.startAngle', 'Start Angle')}
            onChange={handleChange}
          />
          <ProtectedInput
            type={'number'}
            name={'ellipseEndAngle'}
            value={props.ellipseEndAngle ?? 360}
            title={t('inspector.properties.fields.endAngle', 'End Angle')}
            onChange={handleChange}
          />
        </div>}

      <Separator className={'my-0.5'}/>
      <GroupTitle title={t('inspector.properties.sections.appearance', 'Appearance')}/>
      <div className={'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px] items-center gap-2'}>
        <ProtectedInput
          type={'number'}
          name={'opacity'}
          min={0}
          max={1}
          step={0.01}
          value={props.opacity ?? 1}
          title={t('inspector.properties.fields.opacity', 'Opacity')}
          onChange={handleChange}
        />
        <ProtectedInput
          type={'number'}
          name={'cornerRadius'}
          value={props.cornerRadius ?? 0}
          title={t('inspector.properties.fields.cornerRadius', 'Corner Radius')}
          onChange={handleChange}
        />
        <InlineIconAction
          label={t('inspector.properties.appearance.radiusMode', {defaultValue: 'Radius mode'})}
          icon={<LuCircle size={14}/>}
        />
      </div>

      <Separator className={'my-0.5'}/>
      <GroupTitle title={t('inspector.properties.sections.fill', 'Fill')}/>
      <PaintRow
        label={t('inspector.properties.fields.fillColor', 'Fill')}
        enabled={fill.enabled}
        color={fill.color}
        onChangeEnabled={(enabled) => {
          patchElementProps({fill: {enabled, color: fill.color}})
        }}
        onChangeColor={(color) => {
          patchElementProps({fill: {color, enabled: fill.enabled}})
        }}
      />

      <Separator className={'my-0.5'}/>
      <GroupTitle title={t('inspector.properties.sections.stroke', 'Stroke')}/>
      <PaintRow
        label={t('inspector.properties.fields.lineColor', 'Stroke')}
        enabled={stroke.enabled}
        color={stroke.color}
        onChangeEnabled={(enabled) => {
          patchElementProps({stroke: {enabled, color: stroke.color, weight: stroke.weight, cap: stroke.cap, join: stroke.join, dashed: stroke.dashed}})
        }}
        onChangeColor={(color) => {
          patchElementProps({stroke: {enabled: stroke.enabled, color, weight: stroke.weight, cap: stroke.cap, join: stroke.join, dashed: stroke.dashed}})
        }}
      >
        <div className={'grid grid-cols-[minmax(0,1fr)_70px] gap-2'}>
          <Select
            className={EDITOR_TEXT_CONTROL_CLASS}
            selectValue={strokePosition}
            onSelectChange={(nextPosition) => {
              setStrokePosition(String(nextPosition))
            }}
            placeholderResolver={(value) => String(value)}
          >
            <SelectItem value={'inside'}>Inside</SelectItem>
            <SelectItem value={'center'}>Center</SelectItem>
            <SelectItem value={'outside'}>Outside</SelectItem>
          </Select>
          <ProtectedInput
            type={'number'}
            value={stroke.weight}
            step={0.25}
            title={t('inspector.properties.fields.lineWidth', 'Line Width')}
            onChange={(event) => {
              patchElementProps({stroke: {weight: Number(event.target.value), enabled: stroke.enabled, color: stroke.color, cap: stroke.cap, join: stroke.join, dashed: stroke.dashed}})
            }}
          />
        </div>
        <div className={'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px_24px] items-center gap-2'}>
          <Select
            className={EDITOR_TEXT_CONTROL_CLASS}
            selectValue={stroke.cap}
            onSelectChange={(nextCap) => {
              patchElementProps({stroke: {...stroke, cap: String(nextCap)}})
            }}
            placeholderResolver={(value) => String(value)}
          >
            <SelectItem value={'butt'}>butt</SelectItem>
            <SelectItem value={'round'}>round</SelectItem>
            <SelectItem value={'square'}>square</SelectItem>
          </Select>
          <Select
            className={EDITOR_TEXT_CONTROL_CLASS}
            selectValue={stroke.join}
            onSelectChange={(nextJoin) => {
              patchElementProps({stroke: {...stroke, join: String(nextJoin)}})
            }}
            placeholderResolver={(value) => String(value)}
          >
            <SelectItem value={'miter'}>miter</SelectItem>
            <SelectItem value={'round'}>round</SelectItem>
            <SelectItem value={'bevel'}>bevel</SelectItem>
          </Select>
          <InlineIconAction
            label={t('inspector.properties.stroke.options', {defaultValue: 'Stroke options'})}
            icon={<LuSettings2 size={14}/>}
          />
          <InlineIconAction
            label={t('inspector.properties.stroke.align', {defaultValue: 'Stroke alignment'})}
            icon={<LuSpline size={14}/>}
          />
        </div>
      </PaintRow>

      <Separator className={'my-0.5'}/>
      <GroupTitle title={t('inspector.properties.sections.effects', 'Effects')}/>
      <FieldRow label={t('inspector.properties.effects.dropShadow', {defaultValue: 'Drop shadow'})}>
        <ProtectedInput
          type={'checkbox'}
          checked={shadow.enabled}
          title={t('inspector.properties.effects.toggleDropShadow', {defaultValue: 'Toggle drop shadow'})}
          onChange={(event) => {
            patchElementProps({shadow: {enabled: event.target.checked, color: shadow.color, offsetX: shadow.offsetX, offsetY: shadow.offsetY, blur: shadow.blur}})
          }}
        />
      </FieldRow>
      <div className={'grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2'}>
        <span className={EDITOR_TEXT_PANEL_LABEL_CLASS}>Color</span>
        <ProtectedInput
          type={'color'}
          value={shadow.color}
          title={t('inspector.properties.fields.shadowColor', 'Shadow Color')}
          onChange={(event) => {
            patchElementProps({shadow: {enabled: shadow.enabled, color: event.target.value, offsetX: shadow.offsetX, offsetY: shadow.offsetY, blur: shadow.blur}})
          }}
        />
      </div>
      <div className={'venus-prop-grid-2'}>
        <ProtectedInput
          type={'number'}
          value={shadow.offsetX}
          title={t('inspector.properties.fields.shadowX', 'Shadow X')}
          onChange={(event) => {
            patchElementProps({shadow: {enabled: shadow.enabled, color: shadow.color, offsetX: Number(event.target.value), offsetY: shadow.offsetY, blur: shadow.blur}})
          }}
        />
        <ProtectedInput
          type={'number'}
          value={shadow.offsetY}
          title={t('inspector.properties.fields.shadowY', 'Shadow Y')}
          onChange={(event) => {
            patchElementProps({shadow: {enabled: shadow.enabled, color: shadow.color, offsetX: shadow.offsetX, offsetY: Number(event.target.value), blur: shadow.blur}})
          }}
        />
      </div>
      <ProtectedInput
        type={'number'}
        value={shadow.blur}
        title={t('inspector.properties.fields.shadowBlur', 'Shadow Blur')}
        onChange={(event) => {
          patchElementProps({shadow: {enabled: shadow.enabled, color: shadow.color, offsetX: shadow.offsetX, offsetY: shadow.offsetY, blur: Number(event.target.value)}})
        }}
      />

      {props.type === 'image' &&
        <>
          <Separator className={'my-0.5'}/>
          <GroupTitle title={t('inspector.properties.sections.image', {defaultValue: 'Image'})}/>
          <FieldRow label={t('inspector.properties.fields.asset', 'Asset')}>
            <span className={'truncate text-gray-600'}>
              {props.imageMeta?.assetName ?? props.asset ?? t('inspector.properties.values.linkedImage', 'Linked image')}
            </span>
          </FieldRow>
          <FieldRow label={t('inspector.properties.fields.source', 'Source')}>
            <span className={'truncate text-gray-600'}>
              {props.imageMeta?.mimeType ?? t('inspector.properties.values.imageMimeFallback', 'image/*')}
            </span>
          </FieldRow>
          <div className={'grid grid-cols-2 gap-2'}>
            <Button
              type={'button'}
              variant={'outline'}
              className={'h-6 text-xs'}
              onClick={() => executeAction('image-mask-with-shape')}
            >
              {t('inspector.properties.actions.maskWithShape', 'Mask with Shape')}
            </Button>
            <Button
              type={'button'}
              variant={'outline'}
              className={'h-6 text-xs'}
              onClick={() => executeAction('image-clear-mask')}
            >
              {t('inspector.properties.actions.clearMask', 'Clear Mask')}
            </Button>
          </div>
        </>}

      {props.schemaMeta &&
        <>
          <Separator className={'my-0.5'}/>
          <GroupTitle title={t('inspector.properties.sections.schema', {defaultValue: 'Schema'})}/>
          <FieldRow label={t('inspector.properties.fields.schemaNode', 'Schema Node')}>
            <span className={'truncate text-gray-600'}>{props.schemaMeta.sourceNodeType ?? '-'}</span>
          </FieldRow>
          <FieldRow label={t('inspector.properties.fields.nodeKind', 'Node Kind')}>
            <span className={'truncate text-gray-600'}>{props.schemaMeta.sourceNodeKind ?? '-'}</span>
          </FieldRow>
          <FieldRow label={t('inspector.properties.fields.features', 'Features')}>
            <span className={'truncate text-gray-600'}>{props.schemaMeta.sourceFeatureKinds?.join(', ') ?? '-'}</span>
          </FieldRow>
        </>}

      <Separator className={'my-0.5'}/>
      <GroupTitle title={t('inspector.properties.sections.export', 'Export')}/>
      <div className={'venus-prop-grid-2'}>
        <Select
          className={EDITOR_TEXT_CONTROL_CLASS}
          selectValue={exportScale}
          onSelectChange={(nextScale) => {
            setExportScale(String(nextScale))
          }}
          placeholderResolver={(value) => String(value)}
        >
          <SelectItem value={'1x'}>1x</SelectItem>
          <SelectItem value={'2x'}>2x</SelectItem>
          <SelectItem value={'3x'}>3x</SelectItem>
        </Select>
        <Select
          className={EDITOR_TEXT_CONTROL_CLASS}
          selectValue={exportFormat}
          onSelectChange={(nextFormat) => {
            setExportFormat(String(nextFormat))
          }}
          placeholderResolver={(value) => String(value)}
        >
          <SelectItem value={'PNG'}>PNG</SelectItem>
          <SelectItem value={'JPG'}>JPG</SelectItem>
          <SelectItem value={'SVG'}>SVG</SelectItem>
        </Select>
      </div>
      <Button
        type={'button'}
        variant={'outline'}
        className={'h-7 w-full justify-start text-xs'}
        title={t('inspector.properties.export.action', {defaultValue: 'Export Rectangle 3'})}
        onClick={() => {
          executeAction('print')
        }}
      >
        {t('inspector.properties.export.action', {defaultValue: 'Export Rectangle 3'})}
      </Button>

      <Separator className={'my-0.5'}/>
      <GroupTitle title={t('inspector.properties.sections.preview', 'Preview')}/>
      <Button
        type={'button'}
        variant={'ghost'}
        className={'h-7 w-full justify-between px-1 text-xs'}
        title={t('inspector.properties.preview.collapsed', {defaultValue: 'Preview (collapsed)'})}
      >
        <span>{t('inspector.properties.preview.collapsed', {defaultValue: 'Preview (collapsed)'})}</span>
        <LuChevronRight size={14}/>
      </Button>
    </div>
  )
}
