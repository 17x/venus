import type { CSSProperties, HTMLAttributes, PropsWithChildren } from 'react'

interface StackProps
  extends PropsWithChildren,
    Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  gap?: number | string
  align?: CSSProperties['alignItems']
  justify?: CSSProperties['justifyContent']
}

export function Stack({
  children,
  gap = 12,
  align,
  justify,
  style,
  className,
  ...props
}: StackProps) {
  return (
    <div
      className={className ? `venus-ui-stack ${className}` : 'venus-ui-stack'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
