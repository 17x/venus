import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { useId, useState } from 'react'

interface TooltipProps {
  children: ReactElement
  content: ReactNode
}

const triggerStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
}

const bubbleStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: 'calc(100% + 10px)',
  transform: 'translateY(-50%)',
  padding: '8px 10px',
  borderRadius: '10px',
  background: 'rgba(15, 23, 42, 0.96)',
  color: '#f8fafc',
  fontSize: '0.82rem',
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  boxShadow: '0 14px 28px rgba(15, 23, 42, 0.24)',
  zIndex: 20,
}

const shortcutStyle: CSSProperties = {
  marginLeft: '8px',
  opacity: 0.7,
  fontWeight: 500,
}

/**
 * Small shared tooltip for icon-heavy controls.
 *
 * Why:
 * - Keep tooltip behavior inside `@venus/ui` so apps can reuse it.
 * - Avoid reintroducing external UI dependencies just for hover labels.
 */
export function Tooltip({ children, content }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()

  return (
    <span
      style={triggerStyle}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span role="tooltip" id={tooltipId} style={bubbleStyle}>
          {typeof content === 'string' ? content : content}
        </span>
      ) : null}
    </span>
  )
}

export function TooltipLabel({
  label,
  shortcut,
}: {
  label: string
  shortcut?: string
}) {
  return (
    <span>
      <span>{label}</span>
      {shortcut ? <span style={shortcutStyle}>{shortcut}</span> : null}
    </span>
  )
}
