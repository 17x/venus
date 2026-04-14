import {forwardRef, type ComponentPropsWithoutRef} from 'react'
import {cn} from '../../lib/utils.ts'

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  primary?: boolean // backward-compat
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50',
  primary: 'bg-blue-600 text-white hover:bg-blue-500',
  ghost: 'bg-transparent text-gray-900 hover:bg-gray-50',
  outline: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {className, variant = 'default', size = 'md', primary, type = 'button', ...props},
  ref,
) {
  const usedVariant: ButtonVariant = primary ? 'primary' : variant

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[usedVariant],
        sizeClasses[size],
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
  const sizeClass = xs ? 'w-6 h-6 text-xs' : s ? 'w-7 h-7 text-xs' : l ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm'
  return (
    <Button
      ref={ref}
      className={cn('inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-100 text-gray-900 hover:bg-gray-200', sizeClass, className)}
      {...props}
    />
  )
})
