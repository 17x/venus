import {forwardRef, type CSSProperties, type HTMLAttributes} from 'react'
import {cn} from '../../lib/utils.ts'

export interface MenuItemProps extends HTMLAttributes<HTMLDivElement> {
  xs?: boolean
  s?: boolean
  m?: boolean
  l?: boolean
  activeStyle?: CSSProperties
  hoverStyle?: CSSProperties
}

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  {children, className, xs, s, l, style, ...props},
  ref,
) {
  return (
    <div
      ref={ref}
      role="menu-item"
      className={cn(
        'inline-flex w-full min-w-25 cursor-pointer select-none items-center justify-center whitespace-nowrap box-border hover:bg-gray-200',
        xs && 'h-5 px-1 text-xs',
        s && 'h-6 px-2 text-xs',
        !xs && !s && !l && 'h-8 px-2 text-sm',
        l && 'h-10 px-3 text-base',
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
})
