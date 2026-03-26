import type { CSSProperties, PropsWithChildren } from 'react'

interface UIProviderProps extends PropsWithChildren {
  className?: string
  style?: CSSProperties
}

export function UIProvider({ children, className, style }: UIProviderProps) {
  return (
    <div className={className} style={style} data-ui-provider="venus">
      {children}
    </div>
  )
}
