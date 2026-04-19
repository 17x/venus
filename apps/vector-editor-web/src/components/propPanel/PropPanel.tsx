import {type ReactNode, useEffect, useMemo, useRef, useState} from 'react'
import {Button, Con, Select, SelectItem} from '@vector/ui'
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
import {
  LuChevronDown,
  LuChevronRight,
  LuCircle,
  LuSearch,
  LuSettings2,
  LuSpline,
  LuX,
} from 'react-icons/lu'
import {IconInputField} from './IconInputField.tsx'

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
        <PanelHead onMinimize={onMinimize}/>
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

function PanelHead(props: {onMinimize?: VoidFunction}) {
  const {t} = useTranslation()
  return (
    <div className={'flex w-full items-center justify-between gap-2'}>
      <span className={'sr-only'}>{t('inspector.properties.title', 'Properties')}</span>
      {props.onMinimize &&
        <Button
          type="button"
          aria-label={t('inspector.minimizePanel', {title: t('inspector.properties.title', 'Properties'), defaultValue: 'Minimize properties'})}
          title={t('inspector.minimizePanel', {title: t('inspector.properties.title', 'Properties'), defaultValue: 'Minimize properties'})}
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

function SectionBlock(props: {title: string, children: ReactNode}) {
  return (
    <section className={'space-y-2 border-b border-[var(--venus-shell-border)] px-2 py-2'}>
      <GroupTitle title={props.title}/>
      {props.children}
    </section>
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

const FONT_PICKER_FALLBACKS = [
  'Arial',
  'Arial Black',
  'Courier New',
  'Georgia',
  'Geist',
  'Geist Mono',
  'Genos',
  'Gentium Basic',
  'Gentium Book Basic',
  'Gentium Book Plus',
  'Gentium Plus',
  'Geo',
  'Geologica',
  'Geom',
  'Georama',
  'Geostar',
  'Geostar Fill',
  'Germania One',
  'GFS Didot',
  'Helvetica',
  'Inter',
  'Times New Roman',
  'Verdana',
]

function FontFamilyPicker(props: {value: string, onChange: (nextFontFamily: string) => void}) {
  const {t} = useTranslation()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [fontOptions, setFontOptions] = useState(FONT_PICKER_FALLBACKS)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const localFontQuery = (globalThis as {
      queryLocalFonts?: () => Promise<Array<{fullName?: string, family?: string}>>
    }).queryLocalFonts

    if (!localFontQuery) {
      return
    }

    localFontQuery()
      .then((fonts) => {
        const discovered = fonts
          .map((font) => font.family ?? font.fullName)
          .filter((fontName): fontName is string => typeof fontName === 'string' && fontName.length > 0)

        if (discovered.length === 0) {
          return
        }

        const merged = new Set([...FONT_PICKER_FALLBACKS, ...discovered])
        setFontOptions(Array.from(merged).sort((left, right) => left.localeCompare(right)))
      })
      .catch(() => {
        // Keep fallback fonts when Local Font Access is unavailable or blocked.
      })
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (!popoverRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const normalizedSearch = searchValue.trim().toLowerCase()
  const filteredFonts = normalizedSearch.length > 0
    ? fontOptions.filter((fontName) => fontName.toLowerCase().includes(normalizedSearch))
    : fontOptions

  return (
    <div className={'relative'} ref={popoverRef}>
      <Button
        type={'button'}
        variant={'outline'}
        className={'h-8 w-full justify-between border-[var(--venus-ui-border-color)] bg-white px-2 text-[11px]'}
        title={props.value}
        onClick={() => {
          setOpen((currentOpen) => !currentOpen)
        }}
      >
        <span className={'truncate text-left'} style={{fontFamily: `${props.value}, var(--venus-ui-font-family)`}}>
          {props.value}
        </span>
        <LuChevronDown size={14}/>
      </Button>

      {open &&
        <div className={'absolute left-0 top-[calc(100%+6px)] z-50 w-[320px] overflow-hidden rounded-2xl border border-[var(--venus-shell-border)] bg-[#f2f2f3] shadow-xl'}>
          <div className={'flex items-center justify-between px-4 py-3'}>
            <h4 className={'text-lg font-semibold text-slate-900'}>
              {t('inspector.fontPicker.title', {defaultValue: 'Fonts'})}
            </h4>
            <div className={'inline-flex items-center gap-2'}>
              <Button
                type={'button'}
                variant={'ghost'}
                noTooltip
                className={'inline-flex size-7 items-center justify-center rounded-full text-slate-700 hover:bg-white'}
                title={t('inspector.fontPicker.settings', {defaultValue: 'Font settings'})}
              >
                <LuSettings2 size={14}/>
              </Button>
              <Button
                type={'button'}
                variant={'ghost'}
                noTooltip
                className={'inline-flex size-7 items-center justify-center rounded-full text-slate-700 hover:bg-white'}
                title={t('inspector.fontPicker.close', {defaultValue: 'Close'})}
                onClick={() => {
                  setOpen(false)
                }}
              >
                <LuX size={16}/>
              </Button>
            </div>
          </div>

          <div className={'px-3 pb-3'}>
            <div className={'mb-3 flex items-center rounded-xl border border-[#94a3b8] bg-white px-2 py-2 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'}>
              <LuSearch size={16} className={'text-slate-700'}/>
              <input
                type={'text'}
                value={searchValue}
                className={'ml-2 h-6 w-full bg-transparent text-base text-slate-900 outline-none'}
                placeholder={t('inspector.fontPicker.searchPlaceholder', {defaultValue: 'Search fonts'})}
                onChange={(event) => {
                  setSearchValue(event.target.value)
                }}
              />
            </div>

            <Button
              type={'button'}
              variant={'outline'}
              className={'mb-3 h-11 w-full justify-between rounded-xl border-[var(--venus-shell-border)] bg-[#f8f8f8] px-3 text-[14px] text-slate-900'}
              title={t('inspector.fontPicker.filterAll', {defaultValue: 'All fonts'})}
            >
              <span>{t('inspector.fontPicker.filterAll', {defaultValue: 'All fonts'})}</span>
              <LuChevronDown size={14}/>
            </Button>

            <div className={'scrollbar-custom max-h-[420px] overflow-y-auto border-t border-[var(--venus-shell-border)] pt-3'}>
              {filteredFonts.length === 0
                ? <div className={'px-2 py-4 text-sm text-[var(--venus-shell-text-muted)]'}>
                    {t('inspector.fontPicker.noResults', {defaultValue: 'No fonts found'})}
                  </div>
                : filteredFonts.map((fontName) => {
                    const selected = fontName === props.value
                    return (
                      <Button
                        key={fontName}
                        type={'button'}
                        variant={'ghost'}
                        noTooltip
                        className={'h-auto w-full justify-start rounded-md px-2 py-1.5 text-left text-[14px] hover:bg-white'}
                        title={fontName}
                        onClick={() => {
                          props.onChange(fontName)
                          setOpen(false)
                        }}
                      >
                        <span
                          className={selected ? 'font-semibold text-slate-950' : 'text-slate-900'}
                          style={{fontFamily: `${fontName}, var(--venus-ui-font-family)`}}
                        >
                          {fontName}
                        </span>
                      </Button>
                    )
                  })}
            </div>
          </div>
        </div>}
    </div>
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

  const patchElementProps = (nextProps: Partial<SelectedElementProps>) => {
    // Text content editing is intentionally blocked in the inspector so partial text selection remains the source of truth.
    // Style-only textRuns updates remain allowed for typography controls (font, size, etc.).
    const sanitizedNextProps = props.type === 'text'
      ? Object.fromEntries(
          Object.entries(nextProps as Record<string, unknown>)
            .filter(([key]) => key !== 'text'),
        ) as Partial<SelectedElementProps>
      : nextProps

    if (Object.keys(sanitizedNextProps as Record<string, unknown>).length === 0) {
      return
    }

    if (onPatchElementProps) {
      onPatchElementProps(props.id, sanitizedNextProps as Record<string, unknown>, {
        sourcePanel: 'properties-panel',
        sourceControl: 'property-field-input',
        commitType: 'final',
      })
      return
    }

    executeAction('element-modify', [{
      id: props.id,
      props: sanitizedNextProps,
    }])
  }

  const patchNumericField = (field: keyof SelectedElementProps, nextValue: number) => {
    patchElementProps({[field]: nextValue} as Partial<SelectedElementProps>)
  }

  const currentFontFamily = useMemo(() => {
    if (props.type !== 'text') {
      return 'Arial, sans-serif'
    }

    const runs = Array.isArray((props as {textRuns?: unknown}).textRuns)
      ? ((props as {textRuns?: unknown}).textRuns as Array<{style?: {fontFamily?: string}}>)
      : []

    const firstRunFont = runs[0]?.style?.fontFamily
    return typeof firstRunFont === 'string' && firstRunFont.length > 0
      ? firstRunFont
      : 'Arial, sans-serif'
  }, [props])

  const applyTextFontFamily = (nextFontFamily: string) => {
    if (props.type !== 'text') {
      return
    }

    const sourceRuns = Array.isArray((props as {textRuns?: unknown}).textRuns)
      ? ((props as {textRuns?: unknown}).textRuns as Array<{
          start?: number
          end?: number
          style?: Record<string, unknown>
        }>)
      : []
    const textContent = typeof props.text === 'string' ? props.text : ''
    const fallbackRunLength = Math.max(0, textContent.length)
    const baseRuns = sourceRuns.length > 0
      ? sourceRuns
      : [{start: 0, end: fallbackRunLength, style: {}}]
    const nextRuns = baseRuns.map((run) => ({
      start: typeof run.start === 'number' ? run.start : 0,
      end: typeof run.end === 'number' ? run.end : fallbackRunLength,
      style: {
        ...(run.style ?? {}),
        fontFamily: nextFontFamily,
      },
    }))

    patchElementProps({
      textRuns: nextRuns,
    } as Partial<SelectedElementProps>)
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

      <SectionBlock title={t('inspector.properties.sections.layout', 'Layout')}>
        <div className={'venus-prop-grid-2'}>
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

        <div className={'venus-prop-grid-2'}>
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
          <div className={'venus-prop-grid-2'}>
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

      <SectionBlock title={t('inspector.properties.sections.appearance', 'Appearance')}>
        {props.type === 'text' &&
          <FieldRow label={t('inspector.properties.fields.fontFamily', {defaultValue: 'Font'})}>
            <FontFamilyPicker
              value={currentFontFamily}
              onChange={applyTextFontFamily}
            />
          </FieldRow>}

        <div className={'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px] items-center gap-2'}>
          <IconInputField
            value={Number(props.opacity ?? 1)}
            min={0}
            max={1}
            step={0.01}
            title={t('inspector.properties.fields.opacity', 'Opacity')}
            leading={<span className={'text-[10px] font-semibold'}>O</span>}
            onChange={(nextValue: number) => patchNumericField('opacity', nextValue)}
          />
          <IconInputField
            value={Number(props.cornerRadius ?? 0)}
            min={0}
            step={0.5}
            title={t('inspector.properties.fields.cornerRadius', 'Corner Radius')}
            leading={<span className={'text-[10px] font-semibold'}>C</span>}
            onChange={(nextValue: number) => patchNumericField('cornerRadius', nextValue)}
          />
          <InlineIconAction
            label={t('inspector.properties.appearance.radiusMode', {defaultValue: 'Radius mode'})}
            icon={<LuCircle size={14}/>} 
          />
        </div>
      </SectionBlock>

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

      <SectionBlock title={t('inspector.properties.sections.stroke', 'Stroke')}>
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
          <IconInputField
            value={Number(stroke.weight)}
            min={0}
            step={0.25}
            title={t('inspector.properties.fields.lineWidth', 'Line Width')}
            leading={<span className={'text-[10px] font-semibold'}>W</span>}
            onChange={(nextValue: number) => {
              patchElementProps({stroke: {weight: Number(nextValue), enabled: stroke.enabled, color: stroke.color, cap: stroke.cap, join: stroke.join, dashed: stroke.dashed}})
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
      </SectionBlock>

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
      <div className={'venus-prop-grid-2'}>
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

      {props.type === 'image' &&
        <SectionBlock title={t('inspector.properties.sections.image', {defaultValue: 'Image'})}>
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
        </SectionBlock>}

      {props.schemaMeta &&
        <SectionBlock title={t('inspector.properties.sections.schema', {defaultValue: 'Schema'})}>
          <FieldRow label={t('inspector.properties.fields.schemaNode', 'Schema Node')}>
            <span className={'truncate text-gray-600'}>{props.schemaMeta.sourceNodeType ?? '-'}</span>
          </FieldRow>
          <FieldRow label={t('inspector.properties.fields.nodeKind', 'Node Kind')}>
            <span className={'truncate text-gray-600'}>{props.schemaMeta.sourceNodeKind ?? '-'}</span>
          </FieldRow>
          <FieldRow label={t('inspector.properties.fields.features', 'Features')}>
            <span className={'truncate text-gray-600'}>{props.schemaMeta.sourceFeatureKinds?.join(', ') ?? '-'}</span>
          </FieldRow>
        </SectionBlock>}

      <SectionBlock title={t('inspector.properties.sections.export', 'Export')}>
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
      </SectionBlock>

      <SectionBlock title={t('inspector.properties.sections.preview', 'Preview')}>
        <Button
          type={'button'}
          variant={'ghost'}
          className={'h-7 w-full justify-between px-1 text-xs'}
          title={t('inspector.properties.preview.collapsed', {defaultValue: 'Preview (collapsed)'})}
        >
          <span>{t('inspector.properties.preview.collapsed', {defaultValue: 'Preview (collapsed)'})}</span>
          <LuChevronRight size={14}/>
        </Button>
      </SectionBlock>
    </div>
  )
}
