import * as RadixSelect from '@radix-ui/react-select'
import {type CSSProperties, type HTMLAttributes, type ReactNode} from 'react'
import {cn} from '../../lib/utils.ts'

type SelectValue = string | number

export interface SelectProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  xs?: boolean
  s?: boolean
  m?: boolean
  l?: boolean
  disabled?: boolean
  itemStyle?: CSSProperties
  selectValue: SelectValue
  onSelectChange?: (value: SelectValue) => void
  placeholderResolver: (value: SelectValue) => ReactNode
}

export function Select({
  children,
  className,
  disabled = false,
  itemStyle,
  selectValue,
  onSelectChange,
  placeholderResolver,
  style,
  xs,
  s,
  l,
  ...props
}: SelectProps) {
  return (
    <div className={cn('relative inline-block text-sm', className)} style={style} {...props}>
      <RadixSelect.Root
        value={String(selectValue)}
        disabled={disabled}
        onValueChange={(nextValue) => {
          const resolvedValue = typeof selectValue === 'number' ? Number(nextValue) : nextValue
          onSelectChange?.(resolvedValue)
        }}
      >
        <RadixSelect.Trigger
          className={cn(
            'flex w-full min-w-20 cursor-pointer items-center justify-between gap-2 rounded border border-gray-300 bg-white px-2 text-left text-gray-900 shadow-sm outline-none transition-colors hover:bg-gray-50 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:cursor-not-allowed disabled:opacity-50',
            xs && 'h-5 text-xs',
            s && 'h-6 text-xs',
            !xs && !s && !l && 'h-8',
            l && 'h-10',
          )}
        >
          <RadixSelect.Value>{placeholderResolver(selectValue)}</RadixSelect.Value>
          <RadixSelect.Icon aria-hidden className="text-gray-500">
            <ChevronDownIcon/>
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded border border-gray-200 bg-white p-1 shadow-md"
          >
            <RadixSelect.Viewport data-item-style={itemStyle ? 'custom' : undefined}>
              {children}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  )
}

export interface SelectItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  label?: string
  value: SelectValue
  children: ReactNode
}

export function SelectItem({children, className, style, value, ...props}: SelectItemProps) {
  return (
    <RadixSelect.Item
      value={String(value)}
      className={cn(
        'relative flex min-w-full cursor-pointer select-none items-center justify-start whitespace-nowrap rounded px-7 py-1.5 text-sm outline-none hover:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100',
        className,
      )}
      style={style}
      {...props}
    >
      <span className="absolute left-2 inline-flex size-4 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <CheckIcon/>
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2.9 7.2L5.6 9.8L11.1 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
