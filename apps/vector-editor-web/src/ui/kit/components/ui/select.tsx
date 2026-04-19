import {type CSSProperties, type HTMLAttributes, type ReactNode} from 'react'
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectGroup,
  SelectItem as ShadcnSelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {cn} from '../../lib/utils.ts'

type SelectValueType = string | number

export interface SelectProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  xs?: boolean
  s?: boolean
  m?: boolean
  l?: boolean
  disabled?: boolean
  itemStyle?: CSSProperties
  selectValue: SelectValueType
  onSelectChange?: (value: SelectValueType) => void
  placeholderResolver: (value: SelectValueType) => ReactNode
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
  const isSmall = Boolean(xs || s)
  const size = isSmall ? 'sm' : 'default'

  return (
    <div className={cn('relative inline-block text-sm', className)} style={style} {...props}>
      <ShadcnSelect
        value={String(selectValue)}
        disabled={disabled}
        onValueChange={(nextValue) => {
          if (nextValue == null) {
            return
          }
          const resolvedValue = typeof selectValue === 'number' ? Number(nextValue) : nextValue
          onSelectChange?.(resolvedValue)
        }}
      >
        <SelectTrigger
          size={size}
          className={cn(
            'venus-ui-font venus-ui-hover-transition border-[var(--venus-ui-border-color)] bg-white text-left text-slate-900 shadow-xs hover:bg-[var(--venus-ui-hover-bg)] focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1',
            l && 'h-9',
          )}
        >
          <SelectValue>{placeholderResolver(selectValue)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="border border-[var(--venus-ui-border-color)] bg-white p-1 shadow-md" alignItemWithTrigger>
          <SelectGroup style={itemStyle}>
            {children}
          </SelectGroup>
        </SelectContent>
      </ShadcnSelect>
    </div>
  )
}

export interface SelectItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  label?: string
  value: SelectValueType
  level?: number
  children: ReactNode
}

export function SelectItem({children, className, level = 0, style, value, ...props}: SelectItemProps) {
  const resolvedStyle: CSSProperties = {
    ...(style ?? {}),
    // Keeps nested option indentation from legacy Select API.
    paddingInlineStart: `calc(0.375rem + ${Math.max(0, level)} * 0.5rem)`,
  }

  return (
    <ShadcnSelectItem
      value={String(value)}
      className={cn('venus-ui-font venus-ui-hover-transition', className)}
      style={resolvedStyle}
      {...props}
    >
      {children}
    </ShadcnSelectItem>
  )
}
