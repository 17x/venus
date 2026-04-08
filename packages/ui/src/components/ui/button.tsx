import {forwardRef, type ComponentPropsWithoutRef} from 'react'
import {cn} from '../../lib/utils.ts'

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  primary?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {className, primary = false, type = 'button', ...props},
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'cursor-pointer disabled:cursor-not-allowed',
        primary && 'rounded bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-700 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
})

export interface IconButtonProps extends ButtonProps {
  xs?: boolean
  s?: boolean
  m?: boolean
  l?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {className, xs, s, l, ...props},
  ref,
) {
  return (
    <Button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:opacity-50',
        xs && 'size-6 text-xs',
        s && 'size-7 text-xs',
        !xs && !s && !l && 'size-8 text-sm',
        l && 'size-10 text-base',
        className,
      )}
      {...props}
    />
  )
})
