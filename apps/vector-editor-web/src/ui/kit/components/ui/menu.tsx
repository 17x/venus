import {forwardRef, type CSSProperties} from 'react'
import {Button, type ButtonProps} from './button.tsx'
import {cn} from '../../lib/utils.ts'

export interface MenuItemProps extends ButtonProps {
  xs?: boolean
  s?: boolean
  m?: boolean
  l?: boolean
  activeStyle?: CSSProperties
  hoverStyle?: CSSProperties
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  {children, className, xs, s, l, style, ...props},
  ref,
) {
  return <Button
    ref={ref}
    type={props.type ?? 'button'}
    variant={'ghost'}
    role={'menuitem'}
    className={cn(
      'vector-ui-font vector-ui-hover-transition vector-ui-menu-item inline-flex w-full min-w-25 cursor-pointer select-none items-center justify-start whitespace-nowrap box-border rounded-[var(--vector-ui-radius-sm)] text-left outline-none',
      'focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1',
      'disabled:cursor-not-allowed disabled:opacity-45',
      xs && 'h-6 px-1 text-[length:var(--vector-ui-font-size-xs)]',
      s && 'h-7 px-2 text-[length:var(--vector-ui-font-size-xs)]',
      !xs && !s && !l && 'h-[var(--vector-ui-menu-item-height)] px-[var(--vector-ui-space-2)] text-[length:var(--vector-ui-font-size-sm)]',
      l && 'h-10 px-3 text-[length:var(--vector-ui-font-size-md)]',
      className,
    )}
    style={style}
    {...props}
  >
    {children}
  </Button>
})
