import {type ClipboardEvent, FC, InputHTMLAttributes, type KeyboardEvent} from 'react'
import {Input, cn} from '@vector/ui'

export const ProtectedInput: FC<InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const {className, onKeyDown, onKeyUp, onPaste, type, ...restProps} = props

  // Keep inspector field interactions isolated from canvas/global shortcuts while still forwarding caller handlers.
  const stopPropagationHandlers = {
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation()
      onKeyDown?.(event)
    },
    onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
      event.stopPropagation()
      onPaste?.(event)
    },
    onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation()
      onKeyUp?.(event)
    },
  }

  if (type === 'checkbox') {
    return (
      <input
        {...restProps}
        type={'checkbox'}
        className={cn('h-3.5 w-3.5 rounded accent-slate-900 dark:accent-slate-100', className)}
        {...stopPropagationHandlers}
      />
    )
  }

  if (type === 'color') {
    return (
      <input
        {...restProps}
        type={'color'}
        className={cn('h-7 w-full rounded-md bg-white p-1 dark:bg-slate-900', className)}
        {...stopPropagationHandlers}
      />
    )
  }

  return (
    <Input
      {...restProps}
      type={type}
      className={cn('h-7 rounded-md bg-white text-[12px] leading-[18px] dark:bg-slate-900', className)}
      {...stopPropagationHandlers}
    />
  )
}