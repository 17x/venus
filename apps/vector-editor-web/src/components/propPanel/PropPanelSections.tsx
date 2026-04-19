import {Select, SelectItem} from '@vector/ui'
import {useTranslation} from 'react-i18next'
import {
  LuCircle,
  LuSettings2,
  LuSpline,
} from 'react-icons/lu'
import type {SelectedElementProps} from '../../editor/hooks/useEditorRuntime.types.ts'
import {
  EDITOR_TEXT_CONTROL_CLASS,
  EDITOR_TEXT_PANEL_LABEL_CLASS,
} from '../editorChrome/editorTypography.ts'
import {IconInputField} from './IconInputField.tsx'
import {ProtectedInput} from './ProtectedInput.tsx'
import {PropPanelFontFamilyPicker} from './PropPanelFontFamilyPicker.tsx'
import {FieldRow, InlineIconAction, PaintRow, SectionBlock} from './PropPanelShared.tsx'

interface SectionProps {
  props: SelectedElementProps
  patchNumericField: (field: keyof SelectedElementProps, nextValue: number) => void
  patchElementProps: (nextProps: Partial<SelectedElementProps>) => void
}

export function LayoutSection({props, patchNumericField}: SectionProps) {
  const {t} = useTranslation()

  return (
    <SectionBlock title={t('inspector.properties.sections.layout', 'Layout')}>
      <div className={'grid grid-cols-2 gap-2'}>
        <IconInputField
          value={Number(props.x ?? props.cx ?? 0)}
          title={t('inspector.properties.fields.x', 'X')}
          leading={<span className={'text-[10px] font-semibold'}>X</span>}
          onChange={(nextValue: number) => patchNumericField('x', nextValue)}
        />
        <IconInputField
          value={Number(props.y ?? props.cy ?? 0)}
          title={t('inspector.properties.fields.y', 'Y')}
          leading={<span className={'text-[10px] font-semibold'}>Y</span>}
          onChange={(nextValue: number) => patchNumericField('y', nextValue)}
        />
      </div>

      <div className={'grid grid-cols-2 gap-2'}>
        <IconInputField
          value={Number(props.width ?? 0)}
          min={0}
          title={t('inspector.properties.fields.width', 'Width')}
          leading={<span className={'text-[10px] font-semibold'}>W</span>}
          onChange={(nextValue: number) => patchNumericField('width', nextValue)}
        />
        <IconInputField
          value={Number(props.height ?? 0)}
          min={0}
          title={t('inspector.properties.fields.height', 'Height')}
          leading={<span className={'text-[10px] font-semibold'}>H</span>}
          onChange={(nextValue: number) => patchNumericField('height', nextValue)}
        />
      </div>
      <div className={'grid grid-cols-[minmax(0,1fr)_24px] items-center gap-2'}>
        <IconInputField
          value={Number(props.rotation ?? 0)}
          step={0.5}
          title={t('inspector.properties.fields.rotation', 'Rotation')}
          leading={<span className={'text-[10px] font-semibold'}>R</span>}
          unit={'°'}
          onChange={(nextValue: number) => patchNumericField('rotation', nextValue)}
        />
        <InlineIconAction
          label={t('inspector.properties.layout.constraint', {defaultValue: 'Aspect ratio constraint'})}
          icon={<LuSettings2 size={14}/>}
        />
      </div>

      {props.type === 'ellipse' &&
        <div className={'grid grid-cols-2 gap-2'}>
          <IconInputField
            value={Number(props.ellipseStartAngle ?? 0)}
            step={0.5}
            title={t('inspector.properties.fields.startAngle', 'Start Angle')}
            leading={<span className={'text-[10px] font-semibold'}>S</span>}
            unit={'°'}
            onChange={(nextValue: number) => patchNumericField('ellipseStartAngle', nextValue)}
          />
          <IconInputField
            value={Number(props.ellipseEndAngle ?? 360)}
            step={0.5}
            title={t('inspector.properties.fields.endAngle', 'End Angle')}
            leading={<span className={'text-[10px] font-semibold'}>E</span>}
            unit={'°'}
            onChange={(nextValue: number) => patchNumericField('ellipseEndAngle', nextValue)}
          />
        </div>}
    </SectionBlock>
  )
}

export function AppearanceSection(props: SectionProps & {
  currentFontFamily: string
  onChangeFontFamily: (nextFontFamily: string) => void
}) {
  const {t} = useTranslation()

  return (
    <SectionBlock title={t('inspector.properties.sections.appearance', 'Appearance')}>
      {props.props.type === 'text' &&
        <FieldRow label={t('inspector.properties.fields.fontFamily', {defaultValue: 'Font'})}>
          <PropPanelFontFamilyPicker
            value={props.currentFontFamily}
            onChange={props.onChangeFontFamily}
          />
        </FieldRow>}
      <div className={'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px] items-center gap-2'}>
        <IconInputField
          value={Number(props.props.opacity ?? 1)}
          min={0}
          max={1}
          step={0.01}
          title={t('inspector.properties.fields.opacity', 'Opacity')}
          leading={<span className={'text-[10px] font-semibold'}>O</span>}
          onChange={(nextValue: number) => props.patchNumericField('opacity', nextValue)}
        />
        <IconInputField
          value={Number(props.props.cornerRadius ?? 0)}
          min={0}
          step={0.5}
          title={t('inspector.properties.fields.cornerRadius', 'Corner Radius')}
          leading={<span className={'text-[10px] font-semibold'}>C</span>}
          onChange={(nextValue: number) => props.patchNumericField('cornerRadius', nextValue)}
        />
        <InlineIconAction
          label={t('inspector.properties.appearance.radiusMode', {defaultValue: 'Radius mode'})}
          icon={<LuCircle size={14}/>}
        />
      </div>
    </SectionBlock>
  )
}

export function FillSection({props, patchElementProps}: SectionProps) {
  const {t} = useTranslation()
  const fill = {
    enabled: props.fill?.enabled ?? true,
    color: props.fill?.color ?? '#000000',
  }

  return (
    <SectionBlock title={t('inspector.properties.sections.fill', 'Fill')}>
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
    </SectionBlock>
  )
}

export function StrokeSection(props: SectionProps & {
  strokePosition: string
  onChangeStrokePosition: (nextPosition: string) => void
}) {
  const {t} = useTranslation()
  const stroke = {
    enabled: props.props.stroke?.enabled ?? true,
    color: props.props.stroke?.color ?? '#000000',
    weight: props.props.stroke?.weight ?? 1,
    cap: props.props.stroke?.cap ?? 'butt',
    join: props.props.stroke?.join ?? 'miter',
    dashed: props.props.stroke?.dashed ?? false,
  }

  return (
    <SectionBlock title={t('inspector.properties.sections.stroke', 'Stroke')}>
      <PaintRow
        label={t('inspector.properties.fields.lineColor', 'Stroke')}
        enabled={stroke.enabled}
        color={stroke.color}
        onChangeEnabled={(enabled) => {
          props.patchElementProps({stroke: {enabled, color: stroke.color, weight: stroke.weight, cap: stroke.cap, join: stroke.join, dashed: stroke.dashed}})
        }}
        onChangeColor={(color) => {
          props.patchElementProps({stroke: {enabled: stroke.enabled, color, weight: stroke.weight, cap: stroke.cap, join: stroke.join, dashed: stroke.dashed}})
        }}
      >
        <div className={'grid grid-cols-[minmax(0,1fr)_70px] gap-2'}>
          <Select
            className={EDITOR_TEXT_CONTROL_CLASS}
            selectValue={props.strokePosition}
            onSelectChange={(nextPosition) => {
              props.onChangeStrokePosition(String(nextPosition))
            }}
            placeholderResolver={(value) => String(value)}
          >
            <SelectItem value={'inside'}>Inside</SelectItem>
            <SelectItem value={'center'}>Center</SelectItem>
            <SelectItem value={'outside'}>Outside</SelectItem>
          </Select>
          <IconInputField
            value={Number(stroke.weight)}
            min={0}
            step={0.25}
            title={t('inspector.properties.fields.lineWidth', 'Line Width')}
            leading={<span className={'text-[10px] font-semibold'}>W</span>}
            onChange={(nextValue: number) => {
              props.patchElementProps({stroke: {weight: Number(nextValue), enabled: stroke.enabled, color: stroke.color, cap: stroke.cap, join: stroke.join, dashed: stroke.dashed}})
            }}
          />
        </div>
        <div className={'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px_24px] items-center gap-2'}>
          <Select
            className={EDITOR_TEXT_CONTROL_CLASS}
            selectValue={stroke.cap}
            onSelectChange={(nextCap) => {
              props.patchElementProps({stroke: {...stroke, cap: String(nextCap)}})
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
              props.patchElementProps({stroke: {...stroke, join: String(nextJoin)}})
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
    </SectionBlock>
  )
}

export function EffectsSection({props, patchElementProps}: SectionProps) {
  const {t} = useTranslation()
  const shadow = {
    enabled: props.shadow?.enabled ?? false,
    color: props.shadow?.color ?? '#000000',
    offsetX: props.shadow?.offsetX ?? 0,
    offsetY: props.shadow?.offsetY ?? 0,
    blur: props.shadow?.blur ?? 8,
  }

  return (
    <SectionBlock title={t('inspector.properties.sections.effects', 'Effects')}>
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
      <div className={'grid grid-cols-2 gap-2'}>
        <IconInputField
          value={Number(shadow.offsetX)}
          step={0.5}
          title={t('inspector.properties.fields.shadowX', 'Shadow X')}
          leading={<span className={'text-[10px] font-semibold'}>X</span>}
          onChange={(nextValue: number) => {
            patchElementProps({shadow: {enabled: shadow.enabled, color: shadow.color, offsetX: Number(nextValue), offsetY: shadow.offsetY, blur: shadow.blur}})
          }}
        />
        <IconInputField
          value={Number(shadow.offsetY)}
          step={0.5}
          title={t('inspector.properties.fields.shadowY', 'Shadow Y')}
          leading={<span className={'text-[10px] font-semibold'}>Y</span>}
          onChange={(nextValue: number) => {
            patchElementProps({shadow: {enabled: shadow.enabled, color: shadow.color, offsetX: shadow.offsetX, offsetY: Number(nextValue), blur: shadow.blur}})
          }}
        />
      </div>
      <IconInputField
        value={Number(shadow.blur)}
        min={0}
        step={0.5}
        title={t('inspector.properties.fields.shadowBlur', 'Shadow Blur')}
        leading={<span className={'text-[10px] font-semibold'}>B</span>}
        onChange={(nextValue: number) => {
          patchElementProps({shadow: {enabled: shadow.enabled, color: shadow.color, offsetX: shadow.offsetX, offsetY: shadow.offsetY, blur: Number(nextValue)}})
        }}
      />
    </SectionBlock>
  )
}