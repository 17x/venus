import {forwardRef, type CSSProperties, type InputHTMLAttributes} from 'react'
import {Input as ShadcnInput} from '@/components/ui/input'
import {cn} from '../../lib/utils.ts'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  xs?: boolean
  s?: boolean
  m?: boolean
  l?: boolean
  number?: boolean
  primary?: boolean
  warn?: boolean
  error?: boolean
  neutral?: boolean
  labelStyle?: CSSProperties
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    label,
    labelStyle,
    number,
    type = number ? 'number' : 'text',
    xs,
    s,
    l,
    primary,
    warn,
    error,
    neutral = true,
    ...props
  },
  ref,
) {
  const input = (
    <ShadcnInput
      ref={ref}
      type={type}
      className={cn(
        'vector-ui-font vector-ui-hover-transition box-border w-full rounded-[var(--vector-ui-radius-md)] border bg-white px-[var(--vector-ui-space-2)] shadow-xs',
        'outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        xs && 'h-6 text-xs',
        s && 'h-7 text-xs',
        !xs && !s && !l && 'h-8',
        l && 'h-9',
        neutral && 'border-[var(--vector-ui-border-color)] text-slate-900',
        primary && 'border-[var(--vector-ui-border-color-strong)]',
        warn && 'border-amber-500 focus-visible:ring-amber-300',
        error && 'border-red-500 focus-visible:ring-red-300',
        className,
      )}
      {...props}
    />
  )

  if (!label) {
    return input
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm" style={labelStyle}>
      <span>{label}</span>
      {input}
    </label>
  )
})
