import {forwardRef, type CSSProperties, type InputHTMLAttributes} from 'react'
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
    <input
      ref={ref}
      type={type}
      className={cn(
        'box-border rounded border px-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
        xs && 'h-5 text-xs',
        s && 'h-6 text-xs',
        !xs && !s && !l && 'h-8',
        l && 'h-10',
        neutral && 'border-gray-300 bg-white text-gray-900',
        primary && 'border-gray-900',
        warn && 'border-amber-500',
        error && 'border-red-500',
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
