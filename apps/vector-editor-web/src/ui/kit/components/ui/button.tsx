import {forwardRef, type ComponentPropsWithoutRef} from 'react'
import {Button as ShadcnButton} from '@/components/ui/button'
import {cn} from '../../lib/utils.ts'
import {Tooltip} from './tooltip.tsx'

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  primary?: boolean // backward-compat
  noTooltip?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'border-[var(--vector-ui-border-width)] border-transparent bg-[var(--vector-ui-color-secondary)] text-white shadow-xs hover:bg-[var(--vector-ui-color-secondary-hover)]',
  primary: 'border-[var(--vector-ui-border-width)] border-transparent bg-[var(--vector-ui-color-primary)] text-white shadow-xs hover:bg-[var(--vector-ui-color-primary-hover)]',
  ghost: 'border-[var(--vector-ui-border-width)] border-transparent bg-transparent text-slate-700 hover:border-[var(--vector-ui-border-color-strong)] hover:text-slate-900 active:border-[color:color-mix(in_srgb,var(--vector-shell-active-text)_30%,var(--vector-ui-border-color))] active:text-[var(--vector-shell-active-text)]',
  outline: 'vector-ui-control-border bg-white text-slate-800 shadow-xs hover:bg-[var(--vector-ui-hover-bg)] hover:border-[var(--vector-ui-border-color-strong)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-[var(--vector-ui-space-2)] text-[length:var(--vector-ui-font-size-xs)]',
  md: 'h-8 px-[var(--vector-ui-space-3)] text-[length:var(--vector-ui-font-size-sm)]',
  lg: 'h-9 px-[var(--vector-ui-space-4)] text-[length:var(--vector-ui-font-size-md)]',
}

const variantMap: Record<ButtonVariant, 'default' | 'outline' | 'secondary' | 'ghost'> = {
  default: 'secondary',
  primary: 'default',
  ghost: 'ghost',
  outline: 'outline',
}

const sizeMap: Record<ButtonSize, 'sm' | 'default' | 'lg'> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {className, variant = 'default', size = 'md', primary, type = 'button', title, children, noTooltip = false, ...props},
  ref,
) {
  const usedVariant: ButtonVariant = primary ? 'primary' : variant
  const resolvedTitle = title
    ?? (typeof props['aria-label'] === 'string' ? props['aria-label'] : undefined)
    ?? (typeof children === 'string' ? children : undefined)

  const buttonNode = <ShadcnButton
    ref={ref}
    type={type}
    title={resolvedTitle}
    variant={variantMap[usedVariant]}
    size={sizeMap[size]}
    className={cn(
      'vector-ui-font vector-ui-hover-transition rounded-[var(--vector-ui-radius-md)]',
      variantClasses[usedVariant],
      sizeClasses[size],
      className,
    )}
    {...props}
  >
    {children}
  </ShadcnButton>

  // Use title/aria/label as a single tooltip source to keep Button interactions consistently discoverable.
  if (!resolvedTitle || noTooltip) {
    return buttonNode
  }

  return <Tooltip title={resolvedTitle} asChild>{buttonNode}</Tooltip>
})

export interface IconButtonProps extends ButtonProps {
  xs?: boolean
  s?: boolean
  m?: boolean
  l?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {className, xs, s, l, size: _legacySize, variant = 'ghost', primary, title, children, type = 'button', noTooltip = false, ...props},
  ref,
) {
  const usedVariant: ButtonVariant = primary ? 'primary' : variant
  const size = xs
    ? 'icon-xs'
    : s
      ? 'icon-sm'
      : l
        ? 'icon-lg'
        : 'icon'

  const sizeClass = xs
    ? 'text-[length:var(--vector-ui-font-size-xs)]'
    : s
      ? 'text-[length:var(--vector-ui-font-size-xs)]'
      : l
        ? 'text-[length:var(--vector-ui-font-size-md)]'
        : 'text-[length:var(--vector-ui-font-size-sm)]'

    const resolvedTitle = title
      ?? (typeof props['aria-label'] === 'string' ? props['aria-label'] : undefined)
      ?? (typeof children === 'string' ? children : undefined)

    const buttonNode = <ShadcnButton
      ref={ref}
      type={type}
      title={resolvedTitle}
      variant={variantMap[usedVariant]}
      size={size}
      className={cn(
        'vector-ui-font vector-ui-hover-transition inline-flex items-center justify-center overflow-hidden rounded-md [&_svg]:size-[var(--vector-ui-button-icon-size)]',
        variantClasses[usedVariant],
        sizeClass,
        className,
      )}
      {...props}
    >
      {children}
    </ShadcnButton>

    if (!resolvedTitle || noTooltip) {
      return buttonNode
    }

    return <Tooltip title={resolvedTitle} asChild>{buttonNode}</Tooltip>
})
