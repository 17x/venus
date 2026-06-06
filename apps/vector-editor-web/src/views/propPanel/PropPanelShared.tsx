import {type ReactNode} from 'react'
import {Button} from '../../ui/index.ts'
import {ProtectedInput} from './protectedInput.tsx'
import {
  EDITOR_TEXT_PANEL_HEADING_CLASS,
  EDITOR_TEXT_PANEL_LABEL_CLASS,
} from '../editorChrome/editorTypography.ts'

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const RGB_COLOR_RE = /^rgba?\(([^)]+)\)$/i

export function resolveColorInputValue(color: string | undefined) {
  if (!color) {
    return '#000000'
  }
  const trimmed = color.trim()
  if (HEX_COLOR_RE.test(trimmed)) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase()
    }
    return trimmed.toLowerCase()
  }
  const rgbMatch = trimmed.match(RGB_COLOR_RE)
  if (!rgbMatch) {
    return '#000000'
  }
  const channels = rgbMatch[1]
    .split(',')
    .slice(0, 3)
    .map((entry) => Math.max(0, Math.min(255, Math.round(Number.parseFloat(entry.trim())))))
  if (channels.length < 3 || channels.some((entry) => !Number.isFinite(entry))) {
    return '#000000'
  }
  return `#${channels.map((entry) => entry.toString(16).padStart(2, '0')).join('')}`
}

export function GroupTitle(props: {title: string}) {
  return (
    <div className={`mt-0.5 pb-1 text-slate-500 dark:text-slate-400 ${EDITOR_TEXT_PANEL_HEADING_CLASS}`}>{props.title}</div>
  )
}

export function SectionBlock(props: {title: string, children: ReactNode}) {
  return (
    <section className={'space-y-2 px-2 py-2'}>
      <GroupTitle title={props.title}/>
      {props.children}
    </section>
  )
}

export function FieldRow(props: {label: string, children: ReactNode}) {
  return (
    <div className={'grid min-w-0 grid-cols-[74px_minmax(0,1fr)] items-center gap-2'}>
      <span className={EDITOR_TEXT_PANEL_LABEL_CLASS}>{props.label}</span>
      <div className={'min-w-0'}>{props.children}</div>
    </div>
  )
}

export function InlineIconAction(props: {label: string, icon: ReactNode}) {
  return (
    <Button
      type={'button'}
      variant={'ghost'}
      size={'sm'}
      aria-label={props.label}
      title={props.label}
      className={'size-6 p-0 text-slate-600 dark:text-slate-300'}
    >
      {props.icon}
    </Button>
  )
}

export function PaintRow(props: {
  label: string
  enabled: boolean
  color: string
  mixedEnabled?: boolean
  mixedColor?: boolean
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
          value={resolveColorInputValue(props.color)}
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
      {(props.mixedColor || props.mixedEnabled) &&
        <div className={'pl-[74px] text-[10px] leading-4 text-slate-500'}>
          Mixed
        </div>}
      {props.children}
    </div>
  )
}
