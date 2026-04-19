import {type CSSProperties, type HTMLProps, type ReactNode} from 'react'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import {cn} from '../../lib/utils.ts'
import {Button} from './button.tsx'

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
    <Dialog open>
      <DialogPortal>
        <DialogOverlay
          data-name="modal-backdrop"
          className={cn(onBackdropClick && 'cursor-pointer')}
          style={{backgroundColor: backdropBg}}
          onClick={onBackdropClick}
        />

        <DialogContent
          showCloseButton={false}
          data-name="modal-root"
          className={cn('w-[min(720px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 outline-none', className)}
          style={{
            maxHeight: 'calc(100vh - 2rem)',
            display: 'flex',
            flexDirection: 'column',
            ...style,
          }}
          {...props}
        >
          <DialogTitle className="sr-only">Dialog</DialogTitle>
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
        </DialogContent>
      </DialogPortal>
    </Dialog>
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
  return <Button
    variant={variant === 'primary' ? 'primary' : 'outline'}
    size={'md'}
    style={style}
    {...props}
  >
    {children}
  </Button>
}
