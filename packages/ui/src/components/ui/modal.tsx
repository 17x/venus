import * as RadixDialog from '@radix-ui/react-dialog'
import {type CSSProperties, type HTMLProps, type ReactNode} from 'react'
import {cn} from '../../lib/utils.ts'

export interface ModalProps extends HTMLProps<HTMLDivElement> {
  onBackdropClick?: VoidFunction
  backdropBg?: CSSProperties['backgroundColor']
}

export function Modal({
  children,
  style,
  className,
  onBackdropClick,
  backdropBg = 'rgba(0,0,0,.5)',
  ...props
}: ModalProps) {
  return (
    <RadixDialog.Root open>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          data-name="modal-backdrop"
          className={cn(onBackdropClick && 'cursor-pointer')}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: backdropBg,
          }}
          onClick={onBackdropClick}
        />

        <RadixDialog.Content
          data-name="modal-root"
          className={cn('outline-none', className)}
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            zIndex: 1000,
            width: 'min(720px, calc(100vw - 2rem))',
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 'calc(100vh - 2rem)',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            outline: 'none',
            ...style,
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
          }}
          {...props}
        >
          {/* <RadixDialog.Title className="sr-only">Dialog</RadixDialog.Title> */}
          <div
            data-name="modal-scroll"
            style={{
              minHeight: 0,
              maxHeight: 'calc(100vh - 2rem)',
              overflowX: 'hidden',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            }}
          >
            {children}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export interface ModalActionsProps {
  left?: ReactNode
  right?: ReactNode
  gap?: CSSProperties['gap']
  className?: string
  style?: CSSProperties
}

export function ModalActions({
  left,
  right,
  gap = '0.5rem',
  className,
  style,
}: ModalActionsProps) {
  return (
    <div
      data-name="modal-actions"
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap,
        alignItems: 'center',
        marginTop: '0.5rem',
        width: '100%',
        ...style,
      }}
    >
      <div>{left}</div>
      <div style={{display: 'flex', gap, justifyContent: 'flex-end', alignItems: 'center'}}>
        {right}
      </div>
    </div>
  )
}

export interface ModalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export function ModalButton({variant = 'primary', style, children, ...props}: ModalButtonProps) {
  const base: CSSProperties = {
    padding: '0.5rem 0.75rem',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
  }

  const variants: Record<string, CSSProperties> = {
    primary: {
      background: '#2563eb',
      color: '#fff',
    },
    secondary: {
      background: 'transparent',
      color: '#374151',
      border: '1px solid rgba(0,0,0,0.08)',
    },
  }

  return (
    <button style={{...base, ...variants[variant], ...style}} {...props}>
      {children}
    </button>
  )
}
