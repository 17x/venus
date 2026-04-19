import {type ReactNode} from 'react'
import {Button} from '@vector/ui'
import {ProtectedInput} from './ProtectedInput.tsx'
import {
  EDITOR_TEXT_PANEL_HEADING_CLASS,
  EDITOR_TEXT_PANEL_LABEL_CLASS,
} from '../editorChrome/editorTypography.ts'

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