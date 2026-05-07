import {type ReactNode} from 'react'

/**
 * Renders one label/value row in the runtime debug panel.
 * @param props Row display values.
 */
export function DebugRow(props: {label: string; value: string}) {
  return (
    <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
      <span className={'text-slate-500 dark:text-slate-400'}>{props.label}</span>
      <span className={'font-mono'}>{props.value}</span>
    </div>
  )
}

/**
 * Renders one titled runtime debug section container.
 * @param props Section title and content.
 */
export function DebugSection(props: {title: string; children: ReactNode}) {
  return (
    <div className={'flex flex-col gap-1.5 rounded border border-slate-200/70 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/40'}>
      <h3 className={'px-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'}>
        {props.title}
      </h3>
      {props.children}
    </div>
  )
}

/**
 * Formats byte counts for compact diagnostics readability.
 * @param value Raw byte count.
 */
export function formatDiagnosticBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
