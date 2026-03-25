import type { CSSProperties, HTMLAttributes, PropsWithChildren } from 'react'

interface InlineProps
  extends PropsWithChildren,
    Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  gap?: number | string
  align?: CSSProperties['alignItems']
  justify?: CSSProperties['justifyContent']
  wrap?: CSSProperties['flexWrap']
}

export function Inline({
  children,
  gap = 12,
  align = 'center',
  justify,
  wrap = 'wrap',
  style,
  className,
  ...props
}: InlineProps) {
  return (
    <div
      className={className ? `venus-ui-inline ${className}` : 'venus-ui-inline'}
      style={{
        display: 'flex',
        gap,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
