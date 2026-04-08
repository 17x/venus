import * as RadixDialog from '@radix-ui/react-dialog'
import {type CSSProperties, type HTMLProps} from 'react'
import {cn} from '../../lib/utils.ts'

export interface ModalProps extends HTMLProps<HTMLDivElement> {
  onBackdropClick?: VoidFunction
  backdropBg?: CSSProperties['backgroundColor']
}

export function Modal({
  children,
  style,
  onBackdropClick,
  backdropBg = 'rgba(0,0,0,.5)',
}: ModalProps) {
  return (
    <RadixDialog.Root open>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          data-name="modal-backdrop"
          className={cn('fixed inset-0', onBackdropClick && 'cursor-pointer')}
          style={{backgroundColor: backdropBg}}
          onClick={onBackdropClick}
        />
        <RadixDialog.Content
          data-name="modal-root"
          className="fixed inset-0 z-[1000] flex select-none items-center justify-center"
          style={style}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
          }}
        >
          <RadixDialog.Title className="sr-only">Dialog</RadixDialog.Title>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
