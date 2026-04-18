import {type ClipboardEvent, FC, InputHTMLAttributes, type KeyboardEvent} from 'react'
import {Input, cn} from '@vector/ui'

export const ProtectedInput: FC<InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const {className, onKeyDown, onKeyUp, onPaste, type, ...restProps} = props

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
        className={cn('venus-prop-form-checkbox', className)}
        {...stopPropagationHandlers}
      />
    )
  }

  if (type === 'color') {
    return (
      <input
        {...restProps}
        type={'color'}
        className={cn('venus-prop-form-color', className)}
        {...stopPropagationHandlers}
      />
    )
  }

  return (
    <Input
      {...restProps}
      type={type}
      s
      className={cn('venus-prop-form-control', className)}
      {...stopPropagationHandlers}
    />
  )
}