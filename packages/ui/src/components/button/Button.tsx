import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonTone = 'primary' | 'secondary' | 'ghost'

interface ButtonProps
  extends PropsWithChildren,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  tone?: ButtonTone
}

export function Button({
  children,
  tone = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const toneClass =
    tone === 'primary'
      ? 'venus-ui-button-primary'
      : tone === 'secondary'
        ? 'venus-ui-button-secondary'
        : 'venus-ui-button-ghost'

  return (
    <button
      type={type}
      className={className ? `venus-ui-button ${toneClass} ${className}` : `venus-ui-button ${toneClass}`}
      {...props}
    >
      {children}
    </button>
  )
}
