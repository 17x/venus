import {forwardRef, useCallback, useRef, type DragEvent, type HTMLAttributes} from 'react'
import {Container} from './layout.tsx'

export interface DropProps extends HTMLAttributes<HTMLDivElement> {
  accepts?: string[]
  onDragIsOver?: (isFileTypeValid: boolean) => void
  onDragIsLeave?: () => void
  onDropped?: (event: DragEvent<HTMLDivElement>, isFileTypeValid: boolean) => void
}

export const Drop = forwardRef<HTMLDivElement, DropProps>(function Drop(
  {
    accepts = [],
    onDragIsOver,
    onDragIsLeave,
    onDropped,
    onDrop,
    onDragEnter,
    onDragLeave,
    onDragOver,
    ...props
  },
  ref,
) {
  const dragCounter = useRef(0)

  const acceptsFile = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const firstItem = event.dataTransfer.items[0]
    if (!firstItem && event.type !== 'drop') {
      return true
    }
    if (accepts.length === 0) {
      return true
    }
    const fileType = firstItem?.type ?? event.dataTransfer.files[0]?.type ?? ''
    return accepts.some((rule) =>
      rule.includes('*')
        ? fileType.startsWith(rule.replace('*', ''))
        : fileType === rule,
    )
  }, [accepts])

  return (
    <Container
      ref={ref}
      fw
      fh
      role="drop"
      onDragEnter={(event) => {
        onDragEnter?.(event)
        const valid = acceptsFile(event)
        event.dataTransfer.dropEffect = valid ? 'copy' : 'none'
        dragCounter.current += 1
        if (dragCounter.current === 1) {
          onDragIsOver?.(valid)
        }
      }}
      onDragLeave={(event) => {
        onDragLeave?.(event)
        acceptsFile(event)
        dragCounter.current -= 1
        if (dragCounter.current === 0) {
          onDragIsLeave?.()
        }
      }}
      onDragOver={(event) => {
        onDragOver?.(event)
        const valid = acceptsFile(event)
        event.dataTransfer.dropEffect = valid ? 'copy' : 'none'
      }}
      onDrop={(event) => {
        const valid = acceptsFile(event)
        dragCounter.current = 0
        if (valid) {
          onDrop?.(event)
          onDropped?.(event, valid)
        } else {
          onDragIsLeave?.()
        }
      }}
      {...props}
    />
  )
})
