import type { HTMLAttributes, PropsWithChildren } from 'react'

interface PanelProps
  extends PropsWithChildren,
    Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  title?: string
  eyebrow?: string
}

export function Panel({ children, title, eyebrow, className, ...props }: PanelProps) {
  return (
    <section className={className ? `venus-ui-panel ${className}` : 'venus-ui-panel'} {...props}>
      {(eyebrow || title) && (
        <header className="venus-ui-panel-header">
          {eyebrow ? <p className="venus-ui-eyebrow">{eyebrow}</p> : null}
          {title ? <h3 className="venus-ui-panel-title">{title}</h3> : null}
        </header>
      )}
      {children}
    </section>
  )
}
